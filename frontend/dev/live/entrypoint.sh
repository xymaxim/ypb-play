#!/bin/sh
set -e

mkdir -p /dash
cd /dash

ffmpeg -f lavfi -i smptebars=duration=3600:size=640x360:rate=25 \
       -vf "drawtext=:text='%{pts\:hms}':x=(w-text_w)/2:y=(h-text_h)/2:fontcolor=white:fontsize=80:box=1:boxcolor=black" \
       -c:v libx264 \
       -video_track_timescale 10k \
       -y video.mp4

mkdir -p segments
ffmpeg -i video.mp4 -c:v copy -f dash -streaming 1 \
       -seg_duration 10 \
       -use_timeline 1 -use_template 1 \
       -init_seg_name 'segments/init.mp4' \
       -media_seg_name 'segments/$Number$.m4s' \
       -y unused.mpd

rm video.mp4
