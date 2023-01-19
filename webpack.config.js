const path = require('path');

module.exports = {
  entry: './dev/js/hcCaasAc/CaasAcc.js',
  mode: "production",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'caasac.min.js',
    library: 'CaaSAc', //add this line to enable re-use
  },
};
