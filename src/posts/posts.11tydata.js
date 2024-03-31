require('dotenv').config();

module.exports = {
  eleventyComputed: {
	  dataFileName: data => process.env.dataFileName,
  }
};
