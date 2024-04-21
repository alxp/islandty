const {dest, src} = require('gulp');
const imagemin = require('gulp-imagemin');
var rename = require('gulp-rename');
var path = require('path');const { build } = require('biiif');
const { build: buildIiif } = require('biiif');

const runBiiif = (src) => {

  console.log('got here');
};



const iiifManifest = () => {


  return src('./src/images/Books/*')
  .pipe(runBiiif(file) );

};

module.exports = iiifManifest;
