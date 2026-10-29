#!/usr/bin/env sh

set -eu

npm install --cpu=arm64 --os=linux --libc=musl

# sharp 0.35+ has no install-time rebuild, so compile it explicitly against
# the libvips built in the Dockerfile (SHARP_FORCE_GLOBAL_LIBVIPS=1 is set
# there). Without this, sharp uses its prebuilt binary, which cannot decode
# JP2, and islandty falls back to slow WASM JPEG 2000 decoding.
npm explore sharp -- npm run build
