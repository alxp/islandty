require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const USE_LOCAL_MIRADOR = process.env.compile_mirador === 'true';
if (!USE_LOCAL_MIRADOR) {
  console.log('Skipping Mirador compilation as compile_mirador is not true.');
  process.exit(0);
}

const MIRADOR_DIR = path.resolve(__dirname, '../../../mirador-integration-islandora');
const MAIN_JS_SOURCE = path.join(MIRADOR_DIR, 'webpack/dist/main.js');
const OUTPUT_DIR = path.join((process.env.outputDir || 'web'), 'js');
const OUTPUT_PATH = path.resolve(__dirname, '../../..', OUTPUT_DIR, 'mirador.js');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Clone repository if missing
if (!fs.existsSync(MIRADOR_DIR)) {
  console.log('Cloning Mirador integration project...');
  execSync(`git clone --branch=main https://github.com/alxp/mirador-integration-islandora.git "${MIRADOR_DIR}"`, { stdio: 'inherit' });
}

// Navigate and build
process.chdir(MIRADOR_DIR);
if (!fs.existsSync('node_modules')) {
  console.log('Installing Mirador dependencies...');
  execSync('npm install', { stdio: 'inherit' });
}

if (fs.existsSync(MAIN_JS_SOURCE)) {
  fs.copyFileSync(MAIN_JS_SOURCE, OUTPUT_PATH);
  console.log('Mirador main.js copied to:', OUTPUT_PATH);
}
else {

  console.log('Building Mirador...');
  execSync('npm run webpack', { stdio: 'inherit' });

  // Copy main.js to output
  if (fs.existsSync(MAIN_JS_SOURCE)) {
    fs.copyFileSync(MAIN_JS_SOURCE, OUTPUT_PATH);
    console.log('Mirador main.js copied to:', OUTPUT_PATH);
  } else {
    console.error('Error: main.js not found after build.');
    process.exit(1);
  }

}
