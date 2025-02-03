FROM node:22-alpine3.20 AS build
WORKDIR /islandty
COPY islandty/package.json ./
RUN apk add --no-cache git
RUN apk add --update --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/community --repository http://dl-3.alpinelinux.org/alpine/edge/main build-base vips-dev
RUN npm install --cpu=x64 --os=linux --libc=musl
#RUN npm run production

#FROM nginx:alpine
 #COPY --from=build /islandty/dist /usr/share/nginx/html
