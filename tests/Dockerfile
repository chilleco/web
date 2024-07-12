# Pull base image
FROM python:3.12

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install dependencies
# TODO: RUN make setup-tests
RUN pip install --upgrade pip setuptools wheel
COPY api/requirements.txt requirements.txt
RUN pip install --prefer-binary -r requirements.txt
# TODO: turn tg on
# COPY tg/requirements.txt requirements.txt
# RUN pip install --prefer-binary -r requirements.txt
COPY tests/requirements.txt requirements.txt
RUN pip install --prefer-binary -r requirements.txt

# Set work directory
WORKDIR /app

# Copy project
COPY . /app
