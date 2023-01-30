const express = require('express');
const path = require('path');

const app = express();

const caasUserManagementServer = require('./server/app');

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/viewer.html');
});

(async () => {


  // const session = require("express-session");

  // let store;

  // let MemoryStore = require('memorystore')(session);
  // store = new MemoryStore({
  //   checkPeriod: 86400000 // prune expired entries every 24h
  // });

  // // Catch errors
  // store.on('error', function (error) {
  //   console.log(error);
  // });

  // app.use(session({
  //   secret: "12345",
  //   resave: false,
  //   saveUninitialized: true,
  //   store: store
  // }));


  // app.put('/test', async function (req, res, next) {
  //   let users = caasUserManagementServer.getDatabaseObjects().users;
  //   let users2 = await users.find();
  //   req.session.caasUser = users2[0];
  //   console.log("Numusers "+ users2.length);
  //   res.json({ succeeded: true });
    
  // });


// app.use('/caas_um_api',function(req,res,next) {  
//   if (req.session && req.session.caasUser)  {
//     console.log("User:" + req.session.caasUser.lastName);

//   }        
//     return next();
// });


await caasUserManagementServer.start(app, null,{createSession:true, sessionSecret:"12345"});


// let files = caasUserManagementServer.getDatabaseObjects().files;
// let converted = await files.find({ "converted": true });
// console.log("filesconverted:", converted.length);

})();
app.listen(3000);

console.log('Server started on port 3000');




