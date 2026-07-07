FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# PrimeNG 21 peer-dep Angular 21 talab qiladi, bizda 22 — konflikt legacy rejimda hal qilinadi
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/dashboard/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
