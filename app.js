const caasUserManagementServer = require('./server/app');
caasUserManagementServer.start(null, null,{createSession:true, sessionSecret:"12345"});






