import cv2
cap = cv2.VideoCapture("rtsp://127.0.0.1:5119/ANPRV.mp4")
if not cap.isOpened():
    print("Failed to open stream")
else:
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        cv2.imshow("RTSP Stream", frame)
        if cv2.waitKey(1) == 27:
            break
cap.release()
cv2.destroyAllWindows()
