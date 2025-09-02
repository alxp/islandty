const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { hideBin } = require('yargs/helpers');
const yargs = require('yargs/yargs');

function loadJobConfig(jobFile) {
  try {
    const filePath = path.resolve(process.cwd(), jobFile);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const jobConfig = yaml.load(fileContents);

    return jobConfig.config || {};
  } catch (error) {
    console.error(`Error loading job file ${jobFile}:`, error.message);
    process.exit(1);
  }
}

function parseArgs() {
  return yargs(hideBin(process.argv))
    .option('job', {
      alias: 'j',
      type: 'string',
      description: 'Path to job configuration YAML file',
      demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;
}

function mergeWithEnv(config) {
  // Merge job config with existing environment variables
  // Job config takes precedence over .env values
  return {
    ...process.env,
    ...config
  };
}

module.exports = {
  loadJobConfig,
  parseArgs,
  mergeWithEnv
};
