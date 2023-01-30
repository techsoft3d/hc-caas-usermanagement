const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const express = require('express');

const cors = require('cors');

const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const bodyParser = require('body-parser');

const middleware = require('./middleware');


process.on('uncaughtException', function (err) {
  console.log(err);
});


exports.getDatabaseObjects = function () {
  return { files: require('./models/Files'), hubs: require('./models/Hubs'), projects: require('./models/Projects'), users: require('./models/Users') };
};


exports.start = async function (app, mongoose_in, options = { createSession: true, sessionSecret: "caasSession83736" }) {

  process.env["NODE_CONFIG_DIR"] = __dirname + "./../config" + ";" + process.cwd() + "/config";

  const config = require('config');

  if (mongoose_in == undefined || !mongoose_in) {
    let mongoose = require('mongoose');
    global.tm_con = await mongoose.connect(config.get('caas-ac.mongodbURI'));
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

  if (options.createSession) {

    const session = require("express-session");

    let store; 

    if (!mongoose_in) {
      let MongoDBStore = require('connect-mongodb-session')(session);
      store = new MongoDBStore({
        uri: config.get('caas-ac.mongodbURI'),
        collection: 'mySessions'
      });
    }
    else {
      let MemoryStore = require('memorystore')(session);
      store = new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
    }

    // Catch errors
    store.on('error', function (error) {
      console.log(error);
    });

    app.use(session({
      secret: options.sessionSecret,
      resave: false,
      saveUninitialized: true,
      store: store
    }));
  }

  app.use("/caas_um_api", loginRoutes);
  app.use(middleware.requireLogin);
  app.use("/caas_um_api", apiRoutes);


  csmanager.init(config.get('caas-ac.conversionServiceURI'));
  return global.tm_con;
};