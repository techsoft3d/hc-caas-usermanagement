const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');
module.exports = {
  entry: './public/hcCaasAc/CaasAcc.js',
  mode: "production",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'caasac.min.js',
    library: 'CaasAcc', //add this line to enable re-use
  },
  plugins: [
    new FileManagerPlugin({
        events: {
            onEnd: {
                copy: [
                    {
                        source: path.join(__dirname, 'dist'),
                        destination: path.join(__dirname, './public/js')
                    }
                ]
            }
        }
    })
]
};
