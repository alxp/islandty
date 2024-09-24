const {dest, src} = require('gulp');
var rename = require('gulp-rename');
var path = require('path');


// Grabs all images, runs them through imagemin
// and plops them in the dist folder
const pageimages = () => {


  return src('./src/images/Books/**/*.{hocr,jp2,tif,tiff}', {encoding: false})
    .pipe(rename(function(file) {
      file.dirname = path.join(file.dirname, 'iiif', '_' + file.basename);

    }))
    .pipe(dest('./dist/images/Books'));

};

module.exports = pageimages;
