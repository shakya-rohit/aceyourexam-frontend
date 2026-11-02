# Build Angular app
FROM node:20 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build -- --configuration=production

# Serve using nginx
FROM nginx:alpine

# The Nginx image renders this value into its config at container startup.
ENV BACKEND_API_UPSTREAM=http://backend:8080

# Copy angular build
COPY --from=build /app/dist/aceyourexam/browser /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
