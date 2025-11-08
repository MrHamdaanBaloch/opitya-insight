# opitya_insight/Dockerfile
FROM python:3.10-slim-buster

WORKDIR /app

# Install system dependencies for OpenCV, ffmpeg, etc.
# These are common, but you might need to add more based on specific errors during build.
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    # Additional dependencies for deep learning libraries (example placeholders):
    libgl1-mesa-glx \
    # openjdk-11-jdk # Uncomment if your deep learning framework uses Java
    # Add any other specific dependencies for fast_alpr, onnxruntime, ultralytics
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Command to run your FastAPI application with Uvicorn
# Assuming your main FastAPI app is in opitya_insight/api/main.py and named 'app'
# For free tier, start with 1 worker to conserve CPU/RAM.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "10000", "--workers", "1"]
