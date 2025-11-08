try:
    from fast_plate_ocr import PlateRecognizer
    print("Successfully imported PlateRecognizer from fast_plate_ocr.")
    print("The library is installed correctly.")
except ImportError as e:
    print(f"Failed to import PlateRecognizer.")
    print(f"Error: {e}")
