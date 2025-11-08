import subprocess
import cv2
import time
import os

VIDEO_PATH = r"C:/Users/ISHAIKH TECHNOLOGIES/Desktop/signal/ANPRV.mp4"
RTSP_URL = "rtsp://localhost:8554/anprstream"

# FFmpeg command to read video frames and stream as RTSP
cmd = [
    "ffmpeg",
    "-re",                   # read input in real-time
    "-stream_loop", "-1",    # loop infinitely
    "-i", VIDEO_PATH,        # input file
    "-c:v", "libx264",       # encode video as H264
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-c:a", "aac",           # encode audio
    "-f", "rtsp",            # output format RTSP
    RTSP_URL
]

print(f"Starting RTSP server at {RTSP_URL} ...")
subprocess.run(cmd)
