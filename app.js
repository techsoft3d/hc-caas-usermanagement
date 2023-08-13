const express = require('express');
const path = require('path');

const app = express();

const caasUserManagementServer = require('./server/app');

caasUserManagementServer.start(app, null,{createSession:true, sessionSecret:"12345"});

app.listen(3000);

console.log('Server started on port 3000');




