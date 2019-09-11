const path = require("path")


module.exports = {

  entry:'./src/index.js',
  devtool:"source-map",
  output:{
    filename:"main.js",
    path:path.resolve(__dirname,'dist')
  },
  devServer: {
    contentBase: './dist'
  },
  module:{
    rules:[
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(csv|tsv)$/,
        use: [
          'csv-loader'
        ]
      },
      {
        test: /\.xml$/,
        use: [
          'xml-loader'
        ]
      }
    ],
  }
};
