FROM node:20-slim

# Install Python and ffmpeg (required by yt-dlp)
RUN apt-get update && apt-get install -y python3 ffmpeg curl && rm -rf /var/lib/apt/lists/*

# Download and install the latest nightly yt-dlp to fix YouTube signature/JS extraction errors
# We use a build ARG cachebuster so we can force Render to redownload yt-dlp on every deploy
ARG CACHEBUST=1
RUN curl -L https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
