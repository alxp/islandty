## Order of Operations

Islandty's ingest process consists of
several steps that transform the input
spreadsheet and media files into a static web site file structure.

The order of steps is:

1. Read the environment variables and configuration data.
2. Read the input spreadsheet.
3. Move files from the media source folder tree into
   the destination folder according to each object's content model.
4. Update the object's field data so that media paths
  are relative to the destination web folder
  instead of the source media location.
5. Run Gulp to move images and process CSS files.
6. Run Eleventy to create HTML files for each object.

