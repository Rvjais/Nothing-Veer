FROM node:18-alpine

# Install Python (required for yt-dlp), ffmpeg, and curl
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Download and install the latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set up the Node app
WORKDIR /app

# We skip copying the frontend package.json to avoid React Native peer dependency errors
# Instead, we just install the two tiny packages the proxy actually needs:
RUN npm init -y && npm install express cors

COPY server.js ./

EXPOSE 3000

# Start the proxy server
CMD ["node", "server.js"]
