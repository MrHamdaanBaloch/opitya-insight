from fast_alpr import ALPR
import cv2

# Initialize ALPR pipeline
alpr = ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v1-global-model"
)

# Load and predict
frame = cv2.imread("sample_plate.jpg")
results = alpr.predict(frame)

# Print detected plates
print("Detected Plates:")
for res in results:
    print(f"→ Text: {res['text']}, Box: {res['box']}, Confidence: {res['confidence']:.2f}")

# Optionally draw boxes and show:
output = alpr.draw_predictions(frame)
cv2.imshow("Result", output)
cv2.waitKey(0)
cv2.destroyAllWindows()
