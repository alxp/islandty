require('dotenv').config();
        const fs = require("fs");
        const islandoraHelpers = require('./src/_data/islandoraHelpers.js');
      const readCSV = require('./src/_data/readCSV.js');
      const yaml = require('js-yaml');

      var path = require('path');
        // Run me before the build start
        console.log("Reading input CSV and generating template files for each repository object.");

        items = readCSV().items;
        const outputDir = "src/" + process.env.contentPath;
        for (const [key, item] of Object.entries(items)) {
          var transformedItem = islandoraHelpers.transformKeys(item)
          transformedItem.layout = 'layouts/content-item.html';
          const yamlString = yaml.dump(transformedItem); // Convert object to YAML string

          const content = `---\n${yamlString}---\n`; // Add dashes at the end
          // If contentPath does not exist, make it.
            if (!fs.existsSync("src/" + process.env.contentPath)) {
            fs.mkdirSync(outputDirh);
          }
          const outputFile = outputDir + '/' + item.id + '.md';
fs.writeFile(outputFile, content, (err) => {
  if (err) {
	console.error(err);
  } else {
	console.log('Wrote ' + outputFile);
  }
});
        }
