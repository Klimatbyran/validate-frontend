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

# Install gettext for envsubst (if not already available)
RUN apk add --no-cache gettext

# Copy the output of the build stage to NGINX's default public directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose default NGINX port
EXPOSE 80

# Use custom entrypoint that processes the nginx template
ENTRYPOINT ["/docker-entrypoint.sh"]