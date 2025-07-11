const { isTest } = require('../../testUtils');
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Removing staging and web contents.");

  fs.readdir(process.env.outputDir, (err, files) => {
    if (err) {
      console.log(err);
    }

    files.forEach(file => {
      const fileDir = './' + path.join(process.env.outputDir, file);

      if (file !== 'ocfl-files') {
        fs.rmSync(fileDir, { recursive: true, force: true });
      }
    });
  });
  const stagingDir = process.env.stagingDir || "src/islandty/staging";
  const objectStagingDir = path.join(stagingDir, process.env.objectStagingPath || "object");
      const linkedAgentDir = path.join(stagingDir, process.env.linkedAgentStagingPath || "linked-agent");

  for (const dir of [objectStagingDir, linkedAgentDir]) {
  fs.readdir(dir, (err, files) => {
      if (err) {
        console.log(err);
      }

      files.forEach(file => {
        const fileDir = './' + path.join(dir, file);
        fs.rmSync(fileDir, { recursive: true, force: true });
      });
    });
  }
}

// Export the main function for calling by tests.
module.exports = {
  main
};

// When the command is run directly.
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
