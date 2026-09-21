# A single container: Angular build + Nginx runtime. It is the public entry point of the
# local stack (serves the static files and routes /api) — see path/01-arquitectura-y-stack.md §6.
#
# NOTE: this Dockerfile references the Angular project generated in Phase 0 with
# `npx @angular/cli@22 new frontend`. It does not build until that scaffold exists.

FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
