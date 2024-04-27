const {dest, src} = require('gulp');

// Grabs all images,
// and plops them in the dist folder
const images = () => {


  return src('./src/images/**/*')

    .pipe(dest('./dist/images'));
};

module.exports = images;
