# Build Angular app
FROM node:20 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build --prod

# Serve using nginx
FROM nginx:alpine

# Copy angular build
COPY --from=build /app/dist/aceyourexam/browser /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80