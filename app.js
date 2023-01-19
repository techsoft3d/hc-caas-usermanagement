const express = require('express');
const path = require('path');

const app = express();

const caasAc = require('./server/app');

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/viewer.html');
});
caasAc.start(app);
app.listen(3000);






