const express = require('express');
const path = require('path');

const app = express();

const caasAc = require('./server/app');

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/viewer.html');
});

(async () => {


app.use('/caas_ac_api',function(req,res,next) {  
  if (req.session && req.session.caasUser)  {
    console.log("User:" + req.session.caasUser.lastName);

  }
         //do additional authorization on caas rest api here  
    return next();
});

await caasAc.start(app, null,{createSession:true,sessionSecret:"12345"});


let files = caasAc.getDatabaseObjects().files;
let converted = await files.find({ "converted": true });
console.log("filesconverted:", converted.length);
let i=0;

})();
app.listen(3000);

console.log('Server started on port 3000');




