const {dest, src} = require('gulp');

const { globSync } = require('glob');


var rename = require('gulp-rename');
var path = require('path');
var run = require('gulp-run-command').default;


const pageOcr = (cb) => {
  const imagesAlt = globSync('{css,public}/*.{png,jpeg}')

  run('echo "Hello World!"')();
  cb();

};

module.exports = pageOcr;
