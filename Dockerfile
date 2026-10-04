FROM node:18-alpine

# Install Python (required for yt-dlp), ffmpeg, and curl
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Download and install the latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set up the Node app
WORKDIR /app

# We only copy package.json and server.js to keep the backend lightweight on Render
# since this repo contains the full React Native frontend too.
COPY package*.json ./

# Install only production dependencies (skips React Native dev tools)
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 3000

# Start the proxy server (ignoring the React Native start scripts)
CMD ["node", "server.js"]
