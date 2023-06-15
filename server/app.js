const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const express = require('express');

const cors = require('cors');

const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const bodyParser = require('body-parser');


process.env.ALLOW_CONFIG_MUTATIONS = "true";
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';


const config = require('config');

process.on('uncaughtException', function (err) {
  console.log(err);
});


exports.getDatabaseObjects = function () {
  return { files: require('./models/Files'), hubs: require('./models/Hubs'), projects: require('./models/Projects'), users: require('./models/Users') };
};


exports.start = async function (app, mongoose_in, options = { createSession: true, sessionSecret: "caasSession83736" }) {

  handleInitialConfiguration();

  if (mongoose_in == undefined || !mongoose_in) {
    let mongoose = require('mongoose');
    global.tm_con = await mongoose.connect(config.get('hc-caas-um.mongodbURI'));
  }
  else {
    global.tm_con = mongoose_in;
  }

  const apiRoutes = require('./routes/api');
  const loginRoutes = require('./routes/login');

  let csmanager = require('./libs/csManager');
  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: false }));

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());


  const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {

      var uv4 = uuidv4();
      if (!fs.existsSync("./upload")) {
        fs.mkdirSync("./upload");
      }

      var dir = "./upload/" + uv4;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      cb(null, 'upload/' + uv4);

    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });

  if (!config.get('hc-caas-um.demoMode')) {
    let upload = multer({ storage: fileStorage });

    app.post('/caas_um_api/upload',upload.single('file'));
    app.post('/caas_um_api/uploadArray',upload.array('files'));

  }

  if (options.createSession) {

    const session = require("express-session");

    let store; 

    if (!mongoose_in) {
      let MongoDBStore = require('connect-mongodb-session')(session);
      store = new MongoDBStore({
        uri: config.get('hc-caas-um.mongodbURI'),
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
  
  const middleware = require('./middleware');

  app.use("/caas_um_api", loginRoutes);
  app.use(middleware.requireLogin);
  app.use("/caas_um_api", apiRoutes);


  csmanager.init(config.get('hc-caas-um.conversionServiceURI'));
  return global.tm_con;
};




function handleInitialConfiguration() {
  let configs = {
        "mongodbURI": "mongodb://127.0.0.1:27017/caas_demo_app",
        "conversionServiceURI": "http://localhost:3001",
        "serverURI": "http://localhost:3000",
        "useDirectFetch": false,
        "useStreaming": false,
        "demoMode": false,
        "assignDemoHub": false,
        "createSessionProject": false,
        "demoProject": ""    
  };

  config.util.setModuleDefaults('hc-caas-um', configs);

}