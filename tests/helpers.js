import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Synchronous environment reset
export function resetTestEnvironmentSync() {
  const outputDir = path.resolve(__dirname, '../output');
  try {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    console.error('Test cleanup failed:', err);
  }
}

// Synchronous environment loading
export function loadEnvSync(specificEnvPath) {
  const envPath = path.resolve(__dirname, specificEnvPath);
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envConfig = dotenv.parse(envFile);

  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }

  console.log('Test environment loaded:');
  console.log('dataFileName:', process.env.dataFileName);
  console.log('inputMediaPath:', process.env.inputMediaPath);
  console.log('outputDir:', process.env.outputDir);
}

// Asynchronous file check
export async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}
