# Pull base image
FROM node:20.15.0

# Install dependencies
COPY package.json package.json
RUN npm i --production --force

# Set work directory
WORKDIR /app

# Copy project
COPY . /app
