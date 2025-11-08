import cv2
import sys
import time

def test_rtsp_stream(rtsp_url):
    print(f"Attempting to open RTSP stream: {rtsp_url}")
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        print(f"Error: Could not open video stream from {rtsp_url}. Please check the URL and camera availability.")
        return

    print("Successfully opened video stream. Press 'q' to quit.")
    start_time = time.time()
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame. End of stream or connection lost. Attempting to reconnect...")
            cap.release()
            time.sleep(5) # Wait before attempting to reconnect
            cap = cv2.VideoCapture(rtsp_url)
            if not cap.isOpened():
                print("Error: Failed to reconnect to stream. Exiting.")
                break
            else:
                print("Successfully reconnected to stream.")
            continue

        frame_count += 1
        # Display the frame
        cv2.imshow('RTSP Stream Test', frame)

        # Calculate and display FPS every 30 frames
        if frame_count % 30 == 0:
            end_time = time.time()
            fps = 30 / (end_time - start_time)
            print(f"FPS: {fps:.2f}")
            start_time = time.time()

        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Stream test finished.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_rtsp.py <RTSP_URL>")
        print("Example: python test_rtsp.py rtsp://username:password@ip:port/stream")
        sys.exit(1)
    
    rtsp_link = sys.argv[1]
    test_rtsp_stream(rtsp_link)
