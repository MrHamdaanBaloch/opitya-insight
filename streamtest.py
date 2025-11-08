import subprocess
import numpy as np
import cv2

# ✅ Working RTSP URL you tested with VLC
rtsp_url = "rtsp://rtspstream:-S-8ZCvqgpHEbdhk7NMUW@zephyr.rtsp.stream/traffic"

# ✅ Use actual known resolution from ffmpeg output
width, height = 720, 480

# ✅ FFmpeg command to pipe raw frames to Python
cmd = [
    "ffmpeg",
    "-rtsp_transport", "tcp",
    "-i", rtsp_url,
    "-f", "image2pipe",
    "-pix_fmt", "bgr24",
    "-vcodec", "rawvideo", "-"
]

print("🚀 Starting stream... Press 'q' to quit.")

# ✅ Start FFmpeg process
process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

while True:
    raw_image = process.stdout.read(width * height * 3)
    
    if not raw_image:
        print("⚠️ Stream ended or frame read error.")
        break

    try:
        image = np.frombuffer(raw_image, dtype=np.uint8).reshape((height, width, 3))
        cv2.imshow("🔴 RTSP Live Stream", image)
    except Exception as e:
        print("⚠️ Error decoding frame:", e)
        break

    # Press 'q' to exit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# ✅ Cleanup
process.terminate()
cv2.destroyAllWindows()
print("🛑 Stream closed.")
