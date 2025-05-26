# Environment and Configuration

Settings live in two places:

1. The .env file at the top of the project
2. Files inside the config folder.

The .env file may contain the following entries:

## ```contentPath=islandora/object```

The URL path prefixing the object's id.

E.g., if contentPath is set to 'islandora/object', an object who's Id is "newspapers-233" would
then have the path /islandora/object/newspapers-233.

## ```linkedAgentPath=linked-agent```

This is the path prefix for all linked agent
listings pages.

So if this value is set to "linked-agent" and
your site includes a Relators vocabulary
you have an object with the author "L. M. Montgomery",
then the URL that lists all content
with that author would appear at:

/linked-agent/relators/author/l-m-montgomery

## ```dataFileName=../islandora_demo_objects/create_islandora_objects.csv```

The location of the CSV file that Islandty reads.

It does not need to be in the same folder as your input media files.

It can also be a Google Sheets spreadsheet's public
sharing URL.

## ```inputMediaPath=../islandora_demo_objects```

This is the folder containing
the files that will get ingested into Islandty.

The paths listed in the input data file
are relative to this directory.

## ```serverHost="http://localhost:8080"```

The base URL where the site will be served from.

## ```outputDir=web```

The directory name where the HTML and supporting
files will be written to on disck.


## ```CSVOverrideFieldInfo```

The Islandora Workbench 'export_csv' task will autment the CSV with metadata about each field, specifically a Label and the Cardinality.  If this setting is set to 'true', these values in the CSV will supercede the values in config/islandtyFieldInfo.json.

If set to 'false', or if no field metadata is present in the CSV, islandtyFieldINfo.json will be used.

## ```ocfl=true```

When set to true, objects will be placed into an [Oxford Common File Layout](https://ocfl.io)-conformant folder structure.

When a file has been modified, a new version of the OCFL object
will be minted, and the old one will remain in place.

When set to false, all objects will simply
be copied to the same output path
as under the object's ID beneath the configured
contentPath setting.

