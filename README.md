# Islandty

Islandty builds a static web site from a CSV input file formatted for [Islandora Workbench](https://github.com/mjordan/islandora_workbench), built on the
[Eleventy](https://www.11ty.dev) platform.

So if you use Islandora Workbench to populate an Islandora site
you can use the same input files to generate a static website.

## Features

- MODS support
- Mirador viewer with embedded hOCR
- Content-model based system that moves files into place and can be used to generate derivatives.
- Uses a [fork of biiif](https://github.com/alxp/biiif) to generate image files, embed hOCR, and support JP2 files.
- [Lunr](https://lunrjs.com)-based search

![Screenshot of a book in Mirador with metadata and file downloads](/docs/images/demo-book-object.png)

## Requirements

- Node.js (Tested on version 22. currently incompatible with Node.js v. 23.x. See [issue](https://github.com/11ty/eleventy/issues/3625).)
- VIPS (for JP2 support - see below)

### Installing VIPS for JP2 support

To support generating tiles and thumbnails for JP2 images
(required for the Mirador viewer),
you will need to install VIPS.

You can use Mirador with TIFF files
without VIPS.

#### macOS via homebrew

```shell
brew install vips
```

See the Sharp [installation instructions](https://sharp.pixelplumbing.com/install) for more info.

#### Linux

Most popular distributions include a VIPS devel package.

```shell
apk add --update --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/community --repository http://dl-3.alpinelinux.org/alpine/edge/main build-base vips-dev
```

## Installation

Clone the islandty repository and change directory into it.

Then, run

```shell
$ npm install
```

to get all the dependencies.

### Docker-based installation

If you're having trouble running node.js locally,
see the instructions for running Islandty inside
a docker container at[ docs/docker.md](docs/docker.md).

## Setup

These instructions use the [Islandora Demo Objects](https://github.com/Islandora-Devops/islandora_demo_objects) content as a working example.

### Point to your binaries' root folder in `.env`

Your binaries and input data should be in a root folder such that the paths
that point to the files in the metadata CSV
are accurate relative to that root folder. These paths
may be in the `file` column, `thumbnail` column, or whatever
you have configured as file columns in your field configuration.

For Islandora Demo Objects, `git clone` the
Islandora Demo Objects repository outside of the islandty tree.

If you have custom data, also put it outside the islandty tree.

Edit the `.env` file in the islandty project root and set the `inputMediaPath`
to your input data's root folder:

```ini
inputMediaPath=../islandora_demo_objects
```

If using a relative path, it is relative to the Islandty folder.

### Point to the metadata CSV file in `.env`

Edit the .env file in the islandty project root and set `dataFileName` to
the location of your workbench-esque metadata CSV:

```ini
dataFileName=../islandora_demo_objects/create_islandora_objects.csv
```

The CSV may be within the binaries' root folder, but does not need to be.
If using a relative path, it is relative to the Islandty folder.

### Configure your fields

Islandty comes with field configuration for the Islandora Demo Objects,
but this can be easily configured to display custom metadata fields.

To edit it for your data, edit the file `config/islandtyFieldInfo.json`.
It contains a json array. The key of each item is the raw column name in the CSV.
The value is an array that can contain the following elements:

* `"label"`: a human-readable label for the field. If empty, no label will be displayed.
* `"cardinality"`: either `"1"` or `"-1"` if the field is single or multi-valued, respectively.
* `"type"`: Optional. May be either
	* `"typed_relation"`: parse the field using Workbench's Typed Relation protocols
 	* `"subject"`: parse the field as though it is a Workbench Taxonomy Term
  	* `"file"`: parse the field to display a file download link.
  	* If empty, fields will be treated as strings.
* `"metadata_display"` Optional, defaults to `true`. If `false` (or if the column is not listed in
this file), then the values will not be displayed in the metadata table.

The metadata table will be populated in the order that fields appear in this file.

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
for all image files in a folder with the following bash script:

```bash
# Create a set of hOCR files from a directory of JP2s.
for filename in *.jp2 ; do
  extension="${filename##*.}"
  basename="${filename%.$extension}"
  tesseract -c tessedit_create_hocr=1 -c hocr_font_info=0 $filename $basename
	done
```

## Known Issues/Troubleshooting

- `1 high severity vulnerability`: there is a bug in the npm html-minifier package, which minifies code during production runs.
- `Deprecation Warning` related to `sass`: The current theme includes a sass library, `gorko`, that is no longer developed. We are working to remove `gorko`.
- `Unable to call islandtyHelpers`:  Eleventy 3.0. is not yet compatible with Node v.23, which is installed by default on a mac when you update homebrew. Downgrade Node to version 22.


## Maintainers

- Alexander O'Neill (https://github.com/alxp)
- Rosie Le Faive (https://github.com/rosiel)

## Acknowledgements

The codebase, especially the styling, is originally based on the course
[Learn Eleventy from Scratch](https://learneleventyfromscratch.com) by [Andy Bell](https://piccalil.li).

Extensive credit and gratitude to the Islandora and Islandora Workbench developers for their hard work maintaining the ecosystem
that Islandty has built on and become a part of.

## Copyright and License

Copyright (c) 2024-2025 by Alexander O'Neill and Rosemary Le Faive.

All rights reserved except those permitted by the license and applicable laws.
