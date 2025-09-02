const { loadJobConfig, parseArgs, mergeWithEnv } = require('../config/loadConfig');
const { spawn } = require('child_process');

const argv = parseArgs();
const jobConfig = loadJobConfig(argv.job);

// Merge job config with environment
const mergedEnv = mergeWithEnv(jobConfig);

// Set environment variables for child processes
process.env = { ...process.env, ...mergedEnv };

// Run the commands in sequence
const commands = [
  'npm run compileLocalMirador',
  'node src/islandty/commands/readCSV.js',
  'npx gulp',
  'concurrently "npx gulp watch" "npx eleventy --serve"'
];

function runCommand(command, index) {
  if (index >= commands.length) return;

  console.log(`Running: ${command}`);
  const [cmd, ...args] = command.split(' ');
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`Command failed: ${command}`);
      process.exit(code);
    }
    runCommand(commands[index + 1], index + 1);
  });
}

runCommand(commands[0], 0);
