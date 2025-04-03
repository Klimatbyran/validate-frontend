FROM docker.io/library/node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 80

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=80

# Start the app
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "80"]
