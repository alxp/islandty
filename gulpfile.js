const {parallel, series, watch} = require('gulp');

const images = require('./gulp-tasks/images.js');

const javascript = require('./gulp-tasks/javascript.js');

// Set each directory and contents that we want to watch and
// assign the relevant task. `ignoreInitial` set to true will
// prevent the task being run when we run `gulp watch`, but it
// will run when a file changes.
const watcher = () => {
  watch('./src/images/**/*', {ignoreInitial: true}, images);
};

// The default (if someone just runs `gulp`) is to run each task in parallel
exports.default = parallel(images, javascript);

// This is our watcher task that instructs gulp to watch directories and
// act accordingly
exports.watch = watcher;
