# Islandty

Islandty builds a static web site built from CSV input files formatted for Islandora Workbench, built on the 
[Eleventy](https://www.11ty.dev)platform.

So if you use Islandora Workbench to populate an Islandora site
you can use the same input files to
generate a static website.

## Features

- MODS supportt
- Mirador viewer with embedded hOCR
- Uses biiif to generate image tiles.
- Uses a [fork of biiif](https://github.com/alxp/biiif) to embed hOCR and support JP2 files.
- Lunr-based search (Work in progress)


## Installation

Running 


```shell
$ npm install
```

will get all the dependencies.

## Setup

These instructions use the [Islandora Demo Objects](https://github.com/Islandora-Devops/islandora_demo_objects) content as a working example.

Clone the demo objects repository into the src/images folder.

Edit the .env file in the project root and set
the CSV source:

````ini
dataFileNamecreat_islandorra_objects.csv
```

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
for f in *.tiff
do
  tesseract -c tessedit_create_hocr=1 -c hocr_font_info=0 "$f"
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

Copyright (c) 2024 by Alexander O'Neill and Rosemary  Le Faive.

All rights reserved except those permitted by the license and applicable laws.
