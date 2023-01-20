const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const express = require('express');

const cors = require('cors');
const config = require('config');
const app = express();

const session = require("express-session");

var MongoDBStore = require('connect-mongodb-session')(session);


const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const bodyParser = require('body-parser');

const middleware = require('./middleware');


process.on('uncaughtException', function (err) {
  console.log(err);
}); 

//const conversionservice = require('ts3d-hc-conversionservice');


exports.getFiles = function () {
  return require('./models/csFiles'); 
};


exports.start = async function (app,mongoose_in) {


  if (mongoose_in == undefined || !mongoose_in) {
    let mongoose = require('mongoose');
    global.tm_con =  await mongoose.connect(config.get('caas-ac.mongodbURI'));
  }
  else {
    global.tm_con = mongoose_in;
  }


    const apiRoutes = require('./routes/api');
    const loginRoutes = require('./routes/login');

    let csmanager = require('./libs/csManager');
    app.use(cors());
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ limit: '25mb', extended: false }));

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());


    const fileStorage = multer.diskStorage({
      destination: (req, file, cb) => {

        var uv4 = uuidv4();
        if (!fs.existsSync("./csmodelupload")) {
          fs.mkdirSync("./csmodelupload");
        }

        var dir = "./csmodelupload/" + uv4;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        cb(null, 'csmodelupload/' + uv4);

      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    });

    if (!config.get('caas-ac.demoMode')) {
      app.use(multer({ storage: fileStorage }).single('file'));
    }

    app.use(express.static(path.join(__dirname, 'public')));

    var store = new MongoDBStore({
      uri: config.get('caas-ac.mongodbURI'),
      collection: 'mySessions'
    });

    // Catch errors
    store.on('error', function (error) {
      console.log(error);
    });

    app.use(session({
      secret: "mysecret",
      resave: false,
      saveUninitialized: true,
      store: store
    }));

    

    app.use("/caas_ac_api", loginRoutes);
    app.use(middleware.requireLogin);
    app.use("/caas_ac_api", apiRoutes);
    
    
    csmanager.init(config.get('caas-ac.conversionServiceURI'));

   
    // var httpProxy = require('http-proxy');


    // var proxy = new httpProxy.createProxyServer({
    // });

    // proxy.on('error', function (err, req, res) {
    //     console.log(err);
    // });

    // server.on('upgrade', async function (req, socket, head) {
    //         proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:3200' });
    // });

  };