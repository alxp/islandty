FROM node:22-alpine3.20 AS build
ARG TARGETPLATFORM
WORKDIR /islandty
COPY ./package.json ./
RUN apk add --no-cache git
RUN apk add --update --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/community --repository http://dl-3.alpinelinux.org/alpine/edge/main build-base vips-dev
COPY docker/linux/ /islandty/installer/linux
RUN /islandty/installer/$TARGETPLATFORM.sh
COPY ./gulp-tasks/ /islandty/gulp-tasks/
COPY gulpfile.js /islandty/
COPY .eleventy.js /islandty/
COPY .env /islandty/
#RUN npm run production

#FROM nginx:alpine
 #COPY --from=build /islandty/dist /usr/share/nginx/html
