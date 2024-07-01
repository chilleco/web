# Pull base image
# TODO: update to 3.12
FROM python:3.10

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install dependencies
COPY requirements.txt requirements.txt
RUN pip install --upgrade pip setuptools wheel
RUN pip install --prefer-binary -r requirements.txt

# Set work directory
WORKDIR /app

# Copy project
COPY . /app

# Run
CMD python app.py
