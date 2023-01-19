const path = require('path');

module.exports = {
  entry: './dev/client/public/js/twinManager/hctm.js',
  mode: "production",
  experiments: {
    outputModule: true
  },
  output: {
    libraryTarget: 'module',
    path: path.resolve(__dirname, 'dist'),
    filename: 'hcTwinManager.module.min.js',
  },  
};
