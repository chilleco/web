# Pull base image
FROM node:19.8

# Install dependencies
COPY package.json package.json
RUN npm i --production --force

# Set work directory
WORKDIR /app

# Copy project
COPY . /app
