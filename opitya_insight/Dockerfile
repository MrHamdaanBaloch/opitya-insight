# opitya_insight/Dockerfile

# --- Builder Stage ---
FROM python:3.10-bullseye AS builder

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
    libgl1-mesa-glx \
    # Clean up apt cache to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# --- Runtime Stage ---
FROM python:3.10-slim-bullseye

WORKDIR /app

# Install runtime system dependencies for OpenCV (libGL.so.1)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Add Python's site-packages bin directory to PATH for executables like uvicorn
ENV PATH="/usr/local/bin:$PATH"

# Copy installed Python packages from the builder stage
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages

# Copy the application code
COPY . .

# Command to run your FastAPI application with Uvicorn
# Assuming your main FastAPI app is in opitya_insight/api/main.py and named 'app'
# For free tier, start with 1 worker to conserve CPU/RAM.
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "10000", "--workers", "1"]
