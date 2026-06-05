import path from 'path';
import appRoot from 'app-root-path';

export default function resolvePath(relativePath) {
  return path.resolve(appRoot.path, relativePath);
}
