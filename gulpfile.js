const {parallel, series, watch} = require('gulp');

const fonts = require('./gulp-tasks/fonts.js');

const iiifManifest = require('./gulp-tasks/iiif-manifest.js');

const images = require('./gulp-tasks/images.js');

const pageimages = require('./gulp-tasks/page-images.js');

// Pull in each task
const sass = require('./gulp-tasks/sass.js');

// Set each directory and contents that we want to watch and
// assign the relevant task. `ignoreInitial` set to true will
// prevent the task being run when we run `gulp watch`, but it
// will run when a file changes.
const watcher = () => {
  watch('./src/scss/**/*.scss', {ignoreInitial: true}, sass);
  watch('./src/images/**/*', {ignoreInitial: true}, images);
};

// The default (if someone just runs `gulp`) is to run each task in parrallel
exports.default = parallel(fonts, images, series(pageimages/*, iiifManifest*/), sass);

// This is our watcher task that instructs gulp to watch directories and
// act accordingly
exports.watch = watcher;
