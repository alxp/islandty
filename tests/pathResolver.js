const path = require('path');
const appRoot = require('app-root-path');

module.exports = function resolvePath(relativePath) {
  return path.resolve(appRoot.path, relativePath);
};
