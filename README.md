# Islandty

Islandty builds a static web site built from a CSV input file formatted for Islandora Workbench, built on the
[Eleventy](https://www.11ty.dev) platform.

So if you use Islandora Workbench to populate an Islandora site
you can use the same input files to generate a static website.

## Features

- MODS support
- Mirador viewer with embedded hOCR
- Uses a [fork of biiif](https://github.com/alxp/biiif) to generate image files, embed hOCR, and support JP2 files.
- Lunr-based search (Work in progress)


## Requirements

- Node.js (Tested on version 22. currently incompatible with Node.js v. 23.x. See [issue](https://github.com/11ty/eleventy/issues/3625).)

## Installation

Clone the islandty repository and change directory into it.

Then, running

```shell
$ npm install
```

will get all the dependencies.

### JP2 support on macOS

To support generating tiles and thumbnails for JP2 images
(required for the Mirador viewer),
you will need to install VIPS via homebrew:

```shell
brew install vips
```

Then delete your node_modules folder and run npm install again.
See the Sharp [installation instructions](https://sharp.pixelplumbing.com/install) for more info.

## Setup

These instructions use the [Islandora Demo Objects](https://github.com/Islandora-Devops/islandora_demo_objects) content as a working example.

### Point to the metadata CSV file in .env

Put a copy of your metadata CSV somewhere in the `src` folder such as `src/_data`.

Edit the .env file in the project root and set
the CSV source:

````ini
dataFileName=./src/_data/create_islandora_objects.csv
```

### Put binaries into the `src/images` folder.

Copy your binaries into the `src/images` folder so that the paths in the metadata CSV's `file` column
are accurate relative to the `src/images`.

For Islandora Demo Objects, `git clone` the repository outside of the islandty tree then
copy or move the folders into `src/images`.


### Generate and run the site locally.


Then run the site generator with npm

```shell
$ npm start
```

The site will be served at htttp://localhost:8080/.

## MODS Support

Add a 'mods' column to the CSV input data file
to have Islandty include it in the
object's metadata section directly. This lets you avoid
having to extract all of those fields
to CSV columns if your source metadata is in MODS format.

## hOCR support

If Islandty finds a file with extension .hocr

in the same folder as a source image for an
object with content model ''Page' it will
add it to the IIIF manifest generated via biiif.

If you have Tesseract installed locally, you can generate hOCR
for all image files in a folder with the followingbash script:

```bash
# Create a set of hOCR files from a directory of JP2s.
for filename in *.jp2 ; do
  extension="${filename##*.}"
  basename="${filename%.$extension}"
  tesseract -c tessedit_create_hocr=1 -c hocr_font_info=0 $filename $basename
	done
```

## Maintainers

- Alexander O'Neill (https://github.com/alxp)
- Rosie Le Faive (https://github.com/rosiel)

## Acknowledgements

The codebase, especially the styling, is originally based on the course
[Learn Eleventy from Scratch](https://learneleventyfromscratch.com) by [Andy Bell](https://piccalil.li).

Extensive credit and gratitude to the Islandora and Islandora Workbench developers for their hard work maintaining the ecosystem
that Islandty has built on and become a part of.

## Copyright and License

Copyright (c) 2024 by Alexander O'Neill and Rosemary Le Faive.

All rights reserved except those permitted by the license and applicable laws.
