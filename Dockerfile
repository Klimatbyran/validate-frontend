# Build Stage
FROM node:lts-alpine3.20 AS build

# Set working directory for the build process
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all application code
COPY . .

# Run the build command to generate static files
RUN npm run build

# Serve Stage
FROM nginx:stable-alpine

# Copy the output of the build stage to NGINX's default public directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose default NGINX port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]