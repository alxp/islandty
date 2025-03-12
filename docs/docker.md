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

Build the docker image:

If you're running on an Intel AMD 64 system:

```shell
docker buildx build --platform linux/amd64 -t islandty .
```

If you're on a Mac with Apple silicon or other ARM64 system:

```shell
docker  buildx build --platform linux/arm64 -t islandty .
```

At this stage I haven't published an 'official' docker image.
This is because you're likely to be making customizations
to the image for your own site.

If you change anything in the files outside of
src/, you'll need to re-build the image
with the above command for the changes
to take effect.

## Building Your Islandty Site

After running the `docker buildx` command in the previous step,
running ```docker compose up``` will build the site out of
the input CSV and content files, and serve the site using
npm's build-in web server on port 8080.

Once the build finishes, the site will be visible at:

http://localhost:8080/

And output will e written to the output
folder,, 'web/' by default.
