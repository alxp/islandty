### Environment and Configuration

Settings live in two places:


1. The .env file at the top of the project
2. Files inside the config folder.

The .env file may contain the following entries:

```contentPath=islandora/object```

The URL path prefixing the object's id.

E.g., if contentPath is set to 'islandora/object', an object who's Id is "newspapers-233" would
then have the path /islandora/object/newspapers-233.

```linkedAgentPath=linked-agent```

This is the path prefix for all linked agent
listings pages.


```dataFileName=../islandora_demo_objects/create_islandora_objects.csv```

The location of the CSV file that Islandty reads.

It does not need to be in the same folder as your input media files.

```inputMediaPath=../islandora_demo_objects```

This is the folder containing
the files that will get ingested into Islandty.

The paths listed in the input data file
are relative to this directory.

```serverHost="http://localhost:8080"```

The base URL where the site will be served from.

```outputDir=web```

The directory name where the HTML and supporting
files will be written to on disck.

