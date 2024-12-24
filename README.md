# Islandty

Islandty builds a static web site built from a CSV input file formatted for [Islandora Workbench](https://islandora.github.io/documentation/technical-documentation/migration-islandora-workbench/), built on the
[Eleventy](https://www.11ty.dev) platform.

So if you use Islandora Workbench to populate an Islandora site
you can use the same input files to generate a static website.

## Features

- MODS support
- Mirador viewer with embedded hOCR
- Uses a [fork of biiif](https://github.com/alxp/biiif) to generate image files, embed hOCR, and support JP2 files.
- Lunr-based search (Work in progress)


## Installation

Clone the islandty repository and change directory into it.

Then, run

```shell
$ npm install
```

to get all the dependencies (except VIPS; see below if using macOS).

### JP2 support on macOS

To support generating tiles and thumbnails for JP2 images
(required for the Mirador viewer),
you will need to install VIPS via homebrew:

``shell
brew install vips
```

Then delete your node_modules folder and run npm install again.
See the Sharp [installation instructions](https://sharp.pixelplumbing.com/install) for more info.

## Setup


### Preparing a metadata CSV

These instructions use the [Islandora Demo Objects](https://github.com/Islandora-Devops/islandora_demo_objects) content as a working example. If you're using your own data, you can set up a CSV file in a similar fashion, with the following caveats

* `field_model` is mandatory. It does not need to contain any particular values, however if there exists a layout (.html) file in 
`src/_includes/partials` with a name that equals the value in `field_model`, spaces replaced with dashes, then that layout file will be used in place of `src/_includes/partials/default-item.html`. See as examples `src/_includes/partials/Audio.html` and `src/_includes/partials/Paged-Content.html`.
* `title` is a necessary column so that links to the items can be displayed. We are unaware of a max lenth on titles.
* `file`, `service`, and `thumbnail` are reserved column names. They may hold paths to files (relative to a root binaries folder configured below). They hold original files, service files, and thumbnails respectively. Islandty does not create derivatives; these must be done prior to using Islandty. See the Islandora Demo Objects for an example shell script for generating derivatives.
** HOCR files are discovered specially?
** Transcript files...?
* `id` column
* other columns

### Configure your metadata CSV file location

Edit the  `.env` file in the project root and set
the `dataFileName` variable to the path to your CSV. 

```ini
dataFileName=../islandora_demo_objects/create_islandora_objects.csv
```

### Configure your root binaries folder.

The paths in the `file` column of the metadata CSV must be relative to a single
directory. Configure that directory in the `inputMediaPath` variable of the `.env` file.


```ini
inputMediaPath=../islandora_demo_objects
```


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
