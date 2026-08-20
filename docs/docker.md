# Islandty Docker Container

This project includes Dockerfile and docker-compose.yml files in the top-level directory. If you're having trouble running the
node.js application directly, running it in
Docker is an option.

The output is generated in a bind-mounted volume
which can then be served by any web server software.

The src folder is also bind-mounted so you can edit files and
Eleventy's watch process will pick up the changes
automatically while it's running.

## Building

The environment overrides in the docker-compose.yml file
are set up to work with the same default paths as the .env file in the project,
i.e., the input folder is "islandora_demo_objects" in the parent
directory of this project, and the CSV
input file is located inside that folder.

If you are using custom input data, just update the same paths in docker-compose.yml.

The Dockerfile expects a `.env` file in the project root, so copy `sample.env`
to `.env` before building if you haven't already.

Build the docker image:

```shell
docker compose build
```

This builds for your host architecture. To target a specific platform
explicitly:

```shell
docker buildx build --platform linux/amd64 -t islandty .   # Intel/AMD64
docker buildx build --platform linux/arm64 -t islandty .   # Apple silicon/ARM64
```

At this stage I haven't published an 'official' docker image.
This is because you're likely to be making customizations
to the image for your own site.

### What needs a rebuild, and what doesn't

Only some of the project is baked into the image. The rest is bind-mounted by
docker-compose.yml, so edits on the host are visible inside the container
immediately.

Picked up while the container runs:

- `src/` — Eleventy's watch rebuilds the site. Changes under `src/images/` are
  handled by the gulp watch instead.

Bind-mounted, but read at startup — restart the container
(`docker compose restart`) rather than rebuilding:

- `config/` — `site.json` and the field config
- `vendor/` — the mirador-textoverlay source
- the input data folder, `../islandora_demo_objects` by default

`web/` is bind-mounted too, but as the generated output: it is written by the
container and persists on the host, so you don't need to do anything to pick up
changes there.

Require a rebuild (`docker compose build`), because they are copied into the
image:

- `eleventy.config.js`, `.eleventyignore`
- `gulpfile.js` and `gulp-tasks/`
- `vite.mirador.config.js`
- `.env`
- `package.json` — any dependency change, since `node_modules` lives in the
  image
- `docker/linux/*.sh` and the Dockerfile itself

### Why the first build is slow

The image compiles libvips from source, which adds a couple of minutes to a
cold build. This is unavoidable if you need JP2 support: Sharp's prebuilt
libvips is compiled with `-Dopenjpeg=disabled`, and every distribution package
new enough to satisfy Sharp's 8.17.3 floor is either unavailable on Alpine or
comes from a rolling release. See the comments in the Dockerfile for the full
reasoning. Rebuilds reuse the cached layer, so you only pay this once unless
you change the libvips version.

The libvips version is a build argument, should you need to move it:

```shell
docker compose build --build-arg VIPS_VERSION=8.18.5
```

A `.dockerignore` keeps the generated `web/` output, `node_modules`, and
`.git` out of the build context. Without it the context is several gigabytes
and every build spends a long time uploading it to the daemon.

## Building Your Islandty Site

After building the image, running ```docker compose up``` will build the
site out of the input CSV and content files, and serve the site using
npm's built-in web server on port 8080.

Once the build finishes, the site will be visible at:

http://localhost:8080/

And output will be written to the output
folder, 'web/' by default.

## Verifying JP2 support

To confirm the image can decode JP2 and write tile pyramids:

```shell
docker compose run --rm islandty node -e \
  "const s=require('sharp');console.log(s.versions.vips, s.format.jp2k.input.file)"
```

This should print a libvips version of 8.18.5 and `true`.

Note that ingest **skips** objects that already have up-to-date OCFL state in
the bind-mounted `web/` directory. If you are testing whether image processing
actually works, point the output somewhere empty so there is nothing to skip —
otherwise a broken pipeline can look like it succeeded:

```shell
docker compose run --rm -e outputDir=/tmp/fresh -e stagingDir=/tmp/fresh-staging \
  islandty sh -c "mkdir -p /tmp/fresh /tmp/fresh-staging && node src/islandty/commands/readCSV.js"
```
