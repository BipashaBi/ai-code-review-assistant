FROM node:20-slim

# Python + pylint for the Python static-analysis stage
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && pip3 install --break-system-packages pylint \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY uploads ./uploads

EXPOSE 5000
CMD ["sh", "-c", "npm run migrate && node src/server.js"]
