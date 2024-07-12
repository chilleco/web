# Pull base image
FROM node:20.15.0

# Set work directory
WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm i --production --force

# Copy project
COPY . .
