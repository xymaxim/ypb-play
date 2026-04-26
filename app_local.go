//go:build !youtube

package main

import (
	"context"
	"log"

	"github.com/xymaxim/ypb/stream"

	"rewyt/local"
)

func newStream(ctx context.Context, videoID string, port int, onPrint func([]byte)) (stream.Streamer, error) {
	log.Printf("running new stream on port %d type=local v=%s", port, videoID)
	cfg := local.Config{
		VideoID:     videoID,
		Port:        port,
		SegmentsDir: "./local/dash/segments/",
		MPDDelay:    1,
		StartDelay:  10,
		StreamStart: 200,
		OnPrint:     onPrint,
	}
	return local.NewStream(ctx, cfg)
}
