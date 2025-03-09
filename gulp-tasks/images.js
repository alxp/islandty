const {dest, src} = require('gulp');
const path = require('path');

// Grabs all images,
// and plops them in the dist folder
const images = () => {


  return src('./src/images/**/*', {encoding: false})

    .pipe(dest(path.join('.', process.env.outputDir ? process.env.outputDir : 'web', 'images')));
};

module.exports = images;
