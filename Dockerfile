FROM node:22-alpine3.20 AS build
ARG TARGETPLATFORM
ARG VIPS_VERSION=8.18.5
WORKDIR /islandty
COPY ./package.json ./
RUN apk add --no-cache git
# libvips must be built from source to get JPEG 2000 support, which this
# project needs to tile its archival page images:
#   * sharp's own prebuilt libvips is compiled with -Dopenjpeg=disabled, so no
#     released sharp/platform combination can decode JP2.
#   * Alpine's vips package DOES have JP2 but is far below sharp's >=8.17.3
#     floor (3.20 ships 8.15.2), and that floor is a hard #error in
#     sharp's src/common.h, not an advisory check.
#   * Pulling a newer vips from Alpine edge is not an option: mixing edge into
#     this 3.20 base fails on openssl (edge needs libssl3=3.5.x, the base pins
#     3.3.x via apk-tools/python3/libcurl).
# 8.18.5 matches the Homebrew libvips used on the macOS dev host.
# -Dcplusplus=true is REQUIRED: sharp detects a global libvips by running
# `pkg-config --modversion vips-cpp`, and silently falls back to its
# JP2-less prebuilt binary if that lookup fails.
ARG VIPS_VERSION=8.18.5
# libarchive-dev is required for dzsave (the DeepZoom tile-pyramid writer that
# biiif drives); libvips moved dzsave from libgsf to libarchive, and without it
# tiling fails at runtime with: VipsOperation: class "dzsave" not found.
RUN apk add --no-cache build-base python3 curl meson ninja pkgconf \
      glib-dev expat-dev libffi-dev zlib-dev openjpeg-dev jpeg-dev \
      libpng-dev tiff-dev libwebp-dev libexif-dev lcms2-dev libgsf-dev \
      libarchive-dev orc-dev \
 && curl -fsSL "https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz" \
      | tar xJ -C /tmp \
 && meson setup /tmp/vips-${VIPS_VERSION}/build /tmp/vips-${VIPS_VERSION} \
      --prefix=/usr/local \
      -Dopenjpeg=enabled -Dcplusplus=true \
      -Dintrospection=disabled -Dmodules=disabled -Ddocs=false -Dexamples=false \
 && ninja -C /tmp/vips-${VIPS_VERSION}/build \
 && ninja -C /tmp/vips-${VIPS_VERSION}/build install \
 && rm -rf /tmp/vips-${VIPS_VERSION}

# Compile sharp against the libvips installed above instead of downloading the
# JP2-less prebuilt. sharp needs node-addon-api/node-gyp to do this; both are
# already devDependencies in package.json.
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
# node:22-alpine3.20 ships npm 10.9.2, but the mirador-textoverlay git
# dependency declares engines.npm >=11.0.0 and its prepare step hard-fails.
RUN npm install -g npm@^11

COPY docker/linux/ /islandty/installer/linux
RUN /islandty/installer/$TARGETPLATFORM.sh
COPY ./gulp-tasks/ /islandty/gulp-tasks/
COPY gulpfile.js /islandty/
COPY eleventy.config.js /islandty/
COPY .eleventyignore /islandty/
COPY vite.mirador.config.js /islandty/
COPY .env /islandty/
#RUN npm run production

#FROM nginx:alpine
 #COPY --from=build /islandty/dist /usr/share/nginx/html
