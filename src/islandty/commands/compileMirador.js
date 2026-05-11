require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const USE_LOCAL_MIRADOR = process.env.compile_mirador === 'true';
if (!USE_LOCAL_MIRADOR) {
  console.log('Skipping Mirador compilation as compile_mirador is not true.');
  process.exit(0);
}

const OUTPUT_DIR = path.join(process.env.outputDir || 'web', 'js');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// mirador-textoverlay is not yet published to npm with M4 support.
// Clone the source into vendor/ temporarily so Vite can bundle it directly.
const TEXTOVERLAY_VENDOR_DIR = path.resolve(__dirname, '../../../vendor/mirador-textoverlay');
if (!fs.existsSync(TEXTOVERLAY_VENDOR_DIR)) {
  console.log('Cloning mirador-textoverlay (M4 port) to vendor/...');
  execSync(
    'git clone --depth=1 --branch=main https://github.com/dbmdz/mirador-textoverlay.git ' +
      JSON.stringify(TEXTOVERLAY_VENDOR_DIR),
    { stdio: 'inherit' }
  );
}

console.log('Building Mirador bundle with Vite...');
execSync('npx vite build --config vite.mirador.config.js', {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
