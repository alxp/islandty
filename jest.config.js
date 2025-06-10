module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!escape-string-regexp|@sindresorhus/slugify|@sindresorhus/transliterate|@11ty/eleventy)'
  ],
  testEnvironment: 'node',
};
