# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY ./opitya_insight/requirements.txt /app/requirements.txt

# Install system dependencies required by OpenCV and git
RUN apt-get update && apt-get install -y libgl1 libsm6 libxext6 git

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container at /app
COPY ./opitya_insight /app/opitya_insight

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run the application
CMD ["uvicorn", "opitya_insight.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
