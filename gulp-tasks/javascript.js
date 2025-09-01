const {dest, src} = require('gulp');
const path = require('path');

const js_dir = path.join('.', process.env.outputDir ? process.env.outputDir : 'web', 'js')
// Grabs the useful javascript,
// and plops them in the dist folder
const lunr = () => {
  return src('./node_modules/lunr/lunr.min.js', {encoding: false})
    .pipe(dest(js_dir));
};

const vue = () => {
  return src('./node_modules/vue/dist/vue.global.prod.js', {encoding: false})
      .pipe(dest(js_dir))
}

const galleria = () => {
  return src('./node_modules/galleria/dist/galleria.min.js', {encoding: false})
      .pipe(dest(js_dir))
}

const galleriaTheme = () => {
  return src('./node_modules/galleria/dist/themes/classic/galleria.classic.min.js', {encoding: false})
      .pipe(dest(js_dir))
}

const galleriaThemeCss = () => {
  return src('./node_modules/galleria/dist/themes/classic/galleria.classic.css', {encoding: false})
      .pipe(dest(js_dir))
}

module.exports = [lunr, vue, galleria, galleriaTheme, galleriaThemeCss];
