const express = require('express');
const path = require('path');

const app = express();

const caasUserManagementServer = require('./server/app');

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

caasUserManagementServer.start(app, null,{createSession:false, sessionSecret:"12345"});

app.listen(3000);

console.log('Server started on port 3000');




