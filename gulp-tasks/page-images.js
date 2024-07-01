const {dest, src} = require('gulp');
var rename = require('gulp-rename');
var path = require('path');


// Grabs all images, runs them through imagemin
// and plops them in the dist folder
const pageimages = () => {
  // We have specific configs for jpeg and png files to try
  // to really pull down asset sizes
  return src('./src/images/Books/**/*.{jp2,jpg,jpeg,tif,tiff}')
    .pipe(rename(function(file) {
      file.dirname = path.join(file.dirname, 'iiif', '_' + file.basename);

    }))
    .pipe(dest('./dist/images/Books'));

};

module.exports = pageimages;
