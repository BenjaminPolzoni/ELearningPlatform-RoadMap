# Un solo contenedor: build de Angular + runtime Nginx. Es la entrada pública del stack
# local (sirve los estáticos y rutea /api) — ver path/01-arquitectura-y-stack.md §6.
#
# NOTA: este Dockerfile referencia el proyecto Angular que se genera en Fase 0 con
# `npx @angular/cli@22 new frontend`. No construye hasta que ese scaffold exista.

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
