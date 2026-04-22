package local

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/xymaxim/ypb/playback"
)

const (
	timescale       = 10000
	segmentDuration = 10 // seconds
	videoTitle      = "Test live stream video created with FFMPEG"
)

const fakeStdoutText = `From fairest creatures we desire increase,
That thereby beauty's rose might never die,
But as the riper should by time decease,
His tender heir might bear his memory;
But thou, contracted to thine own bright eyes,
Feed'st thy light's flame with self-substantial fuel,
Making a famine where abundance lies,
Thyself thy foe, to thy sweet self too cruel.
Thou that art now the world's fresh ornament
And only herald to the gaudy spring,
Within thine own bud buriest thy content,
And, tender churl, mak'st waste in niggarding.
Pity the world, or else this glutton be,
To eat the world's due, by the grave and thee.`

const mpdTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:DASH:schema:MPD:2011"
     profiles="urn:mpeg:dash:profile:isoff-live:2011"
     type="dynamic"
     availabilityStartTime="{{availabilityStartTime}}">
   <ProgramInformation>
   </ProgramInformation>
   <BaseURL>http://localhost:8080</BaseURL>
   <Period id="0">
     <AdaptationSet id="0" mimeType="video/mp4">
       <Representation id="0"
                       codecs="avc1.64001f"
                       width="640"
                       height="360"
                       frameRate="25">
         <SegmentTemplate initialization="segments/init.mp4"
                          media="segments/$Number$.m4s"
                          startNumber="{{startNumber}}"
                          duration="{{segmentDuration}}"
                          timescale="{{timescale}}"
                          presentationTimeOffset="{{presentationTimeOffset}}">
         </SegmentTemplate>
       </Representation>
     </AdaptationSet>
   </Period>
 </MPD>
`

type infoResponse struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	ChannelID       string    `json:"channelId"`
	ChannelTitle    string    `json:"channelTitle"`
	ActualStartTime time.Time `json:"actualStartTime"`
}

type mpdMetadata struct {
	VideoTitle      string     `json:"videoTitle"`
	VideoURL        string     `json:"videoUrl"`
	StartActualTime time.Time  `json:"startActualTime"`
	StartTargetTime time.Time  `json:"startTargetTime"`
	EndActualTime   *time.Time `json:"endActualTime,omitempty"`
	EndTargetTime   *time.Time `json:"endTargetTime,omitempty"`
}

type mpdResponse struct {
	Metadata mpdMetadata `json:"metadata"`
	MPD      string      `json:"mpd"`
}

type Config struct {
	// YouTube video ID.
	VideoID string
	// Port to listen on.
	Port int
	// Directory with media segments.
	SegmentsDir string
	// Response delay for /mpd requests (in s).
	MPDDelay int
	// Stream start delay (in s)
	StartDelay int
	// Stream start (in hours ago).
	StreamStart int
	// Print callback to simulate yt-dlp progress.
	OnPrint func([]byte)
}

type Stream struct {
	config Config
	server *http.Server
	cancel context.CancelFunc
	done   chan struct{}
}

func NewStream(ctx context.Context, cfg Config) (*Stream, error) {
	progressLines := strings.Split(fakeStdoutText, "\n")

	delayMs := time.Duration(cfg.StartDelay) * time.Second
	interval := delayMs / time.Duration(len(progressLines))
	for _, line := range progressLines {
		select {
		case <-time.After(interval):
			if cfg.OnPrint != nil {
				cfg.OnPrint([]byte(line + "\n"))
			}
		case <-ctx.Done():
			log.Println("stream start cancelled")
			return nil, fmt.Errorf("canceling stream start: %w", ctx.Err())
		}
	}

	ctx, cancel := context.WithCancel(ctx)

	mux := http.NewServeMux()
	mux.HandleFunc("/info", infoHandler(cfg.VideoID, cfg.StreamStart))
	mux.HandleFunc("/mpd/{interval}", mpdHandler(cfg.MPDDelay))
	mux.HandleFunc("/segments/init.mp4", initSegmentHandler(cfg.SegmentsDir))
	mux.HandleFunc("/segments/{segment}", segmentHandler(cfg.SegmentsDir))

	handler := corsMiddleware(loggingMiddleware(mux))

	stream := &Stream{
		config: cfg,
		server: &http.Server{
			Addr:    ":" + strconv.Itoa(cfg.Port),
			Handler: handler,
		},
		cancel: cancel,
		done:   make(chan struct{}),
	}

	go func() {
		<-ctx.Done()
		if err := stream.server.Close(); err != nil {
			log.Println("failed to close stream server")
		}
		close(stream.done)
		log.Println("stream server stopped")
	}()

	return stream, nil
}

func (s *Stream) Server() *http.Server {
	return s.server
}

func (s *Stream) Playback() playback.Playbacker {
	return nil
}

func (s *Stream) Start() error {
	if err := s.server.ListenAndServe(); err != http.ErrServerClosed {
		log.Printf("ListenAndServe(): %v", err)
		return err
	}
	return nil
}

func (s *Stream) Stop() {
	s.cancel()
	<-s.done
}

func infoHandler(videoID string, streamStart int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startHoursAgo := time.Duration(streamStart) * time.Hour
		info := infoResponse{
			ID:              videoID,
			Title:           videoTitle,
			ChannelID:       "test-channel-id",
			ChannelTitle:    "Live Stream Watching Club",
			ActualStartTime: time.Now().Add(-startHoursAgo).UTC(),
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(info); err != nil {
			slog.Error("encoding info response", "err", err)
		}
	}
}

func mpdHandler(mpdDelay int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		interval := r.PathValue("interval")

		var t time.Time
		if interval == "now" {
			t = time.Now().UTC()
		} else {
			var err error
			t, err = time.Parse(time.RFC3339, interval)
			if err != nil {
				http.Error(w,
					fmt.Sprintf("parsing interval parameter %q: %v", interval, err),
					http.StatusBadRequest,
				)
				return
			}
		}

		slog.Info("request manifest", "interval", interval)

		startNumber := segmentNumberForTime(t)

		mpd := strings.ReplaceAll(
			mpdTemplate,
			"{{currentTime}}",
			time.Now().UTC().Format(time.RFC3339),
		)
		mpd = strings.ReplaceAll(
			mpd,
			"{{currentTime}}",
			time.Now().UTC().Format(time.RFC3339),
		)
		mpd = strings.ReplaceAll(
			mpd,
			"{{availabilityStartTime}}",
			time.Now().UTC().Add(-segmentDuration*time.Second).Format(time.RFC3339),
		)
		mpd = strings.ReplaceAll(mpd, "{{timescale}}", strconv.Itoa(timescale))
		mpd = strings.ReplaceAll(
			mpd,
			"{{segmentDuration}}",
			strconv.Itoa(segmentDuration*timescale),
		)
		mpd = strings.ReplaceAll(mpd, "{{startNumber}}", strconv.Itoa(startNumber))
		mpd = strings.ReplaceAll(
			mpd,
			"{{presentationTimeOffset}}",
			strconv.Itoa((startNumber-1)*segmentDuration*timescale),
		)

		slog.Info(
			"rewritten manifest",
			"startNumber", startNumber,
			"availabilityStartTime", segmentStartTime(t),
		)

		resp := mpdResponse{
			Metadata: mpdMetadata{
				VideoTitle:      videoTitle,
				StartActualTime: segmentStartTime(t),
				StartTargetTime: t,
			},
			MPD: mpd,
		}

		time.Sleep(time.Duration(mpdDelay) * time.Second)

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			slog.Error("encoding mpd response", "err", err)
		}
	}
}

func initSegmentHandler(segmentsDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		initPath := filepath.Join(segmentsDir, "init.mp4")

		data, err := os.ReadFile(initPath)
		if err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "init segment not found", http.StatusNotFound)
			} else {
				msg := "reading init segment"
				slog.Error(msg, "path", initPath, "err", err)
				http.Error(w, msg, http.StatusInternalServerError)
			}
			return
		}

		slog.Debug("serving init segment", "path", initPath)

		w.Header().Set("Content-Type", "video/mp4")
		w.Header().Set("Content-Length", strconv.Itoa(len(data)))

		if _, err := w.Write(data); err != nil {
			slog.Error("writing init segment response", "err", err)
		}
	}
}

func segmentHandler(segmentsDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		segmentParameter := r.PathValue("segment")

		sq, err := strconv.Atoi(strings.TrimSuffix(segmentParameter, ".m4s"))
		if err != nil || sq < 1 {
			http.Error(w, fmt.Sprintf("parsing sq parameter: %s", err), http.StatusBadRequest)
			return
		}

		totalSegments := countSegments(segmentsDir)
		resolvedSq := resolveSegmentNumber(sq, totalSegments)

		slog.Debug("serving segment", "sq", sq, "resolved", resolvedSq)

		path := filepath.Join(segmentsDir, fmt.Sprintf("%d.m4s", resolvedSq))
		data, err := os.ReadFile(path)
		if err != nil {
			if os.IsNotExist(err) {
				http.Error(w, fmt.Sprintf("segment %d not found", resolvedSq), http.StatusNotFound)
			} else {
				msg := "reading segment"
				slog.Error(msg, "path", path, "err", err)
				http.Error(w, msg, http.StatusInternalServerError)
			}
			return
		}

		w.Header().Set("Content-Type", "video/iso.segment")
		w.Header().Set("Content-Length", strconv.Itoa(len(data)))
		if _, err := w.Write(data); err != nil {
			slog.Error("writing segment response", "err", err)
		}
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Range, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
		)
	})
}

func countSegments(dir string) int {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 1
	}
	max := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".m4s") {
			continue
		}
		n, err := strconv.Atoi(strings.TrimSuffix(name, ".m4s"))
		if err != nil {
			continue
		}
		if n > max {
			max = n
		}
	}
	if max < 1 {
		return 1
	}
	return max
}

func resolveSegmentNumber(sq, totalSegments int) int {
	if sq > totalSegments {
		return (sq-1)%totalSegments + 1
	}
	return sq
}

func segmentNumberForTime(t time.Time) int {
	totalSeconds := t.Minute()*60 + t.Second()
	return totalSeconds/segmentDuration + 1
}

func segmentStartTime(t time.Time) time.Time {
	totalSeconds := t.Minute()*60 + t.Second()
	segmentStart := (totalSeconds / segmentDuration) * segmentDuration
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(),
		segmentStart/60, segmentStart%60, 0, t.Location())
}
