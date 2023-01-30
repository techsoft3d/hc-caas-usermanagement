# CaaS User Management 

## Introduction
This library implements user management on top of the [CaaS](https://github.com/techsoft3d/hc-caas) library, which is a conversion and streaming backend for HOOPS Communicator. It provides a straightforward REST api for managing user accounts and their associated data, including Hubs and Projects with different access levels per user. By connecting this library to CaaS, you essentially get the framework for a CAD oriented SaaS application "out of the box", with a few lines of server-side code, ideal for prototyping and testing or as the starting point for your own application.

The library consists of two components, the server-side node.js library you can add to your project via npm as well as a client-side library for communicating with the server. It also comes with a bootstrap based front-end that demonstrates the use of the client-side library and can be used as a starting point for your own application.

## Feedback
For questions/feedback please send an email to guido@techsoft3d.com or post in our [forum](https://forum.techsoft3d.com/). For a 60 day trial of the HOOPS Web Platform go to https://www.techsoft3d.com/products/hoops/web-platform.

## Documentation
Live Documentation for the client-side library can be found here: [https://techsoft3d.github.io/hc-caas-usermanagement/](https://techsoft3d.github.io/hc-caas-usermanagement/)

## Integrate with your own Node-Based Application

### Server Side
To integrate CaaS User Management into your own server application as a node module, follow the steps below.
1. Install the module with `npm install ts3d.hc.caas.usermanagement`
2. Import the module with `const caasUserManagementServer = require('ts3d.hc.caas.usermanagement');`
3. If you want to override any of the default settings, create a config directory and an empty file called local.json and specifiy any setting you want to override. Here are the default settings:
```json
{
  "hc-caas-um": {
    "mongodbURI": "mongodb://127.0.0.1:27017/caas_demo_app",
    "conversionServiceURI": "http://localhost:3001",
    "serverURI": "http://localhost:3000",
    "useDirectFetch": false,
    "useStreaming": false,
    "demoMode": false,
    "assignDemoHub": false,
    "demoProject": ""
  }
}
```
3. Start the CaasUserManagementServer with caasUserManagementServer.start(), providing your express app as a parameter as well as other configuration settings. See below for a minimal example:

```

const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const caasUserManagementServer = require('ts3d.hc.caas.usermanagement');
caasUserManagementServer.start(app, null,{createSession:true, sessionSecret:"12345"});

app.listen(3000);

```

### Client Side
1. Add 'caasu.min.js' to your client-side project. The client-side library is included in the dist folder of this repository.  
`<script type="text/javascript" src="js/caasu.min.js"></script>`
2. Create a new CaasUserManagementClient object, specifying the server address.  
` myUserManagmentClient = new CaasU.CaasUserManagementClient(serveraddress); `
3. See the various demos and Reference Manual for further API usage. Alternatively, feel free to copy the content of the public folder from this project to your own project and use the provided demos as a starting point for your own application.

## More details on the Server
By default the CaaS User Management server will add its own end-points to your express app, which are all prefixed with `/caas_um_api`. It will also create its own mongodb session store as well as a user-session. If you are already using mongodb you can provide it as the second parameter to the start function. In addition, the User Management Server can create its own session store for cookie based session management but you can choose to do provide your own. In this case the user management module will expect a session object to be present on the request object for all its REST api calls. If you allow the account handling server to create its own session store, you should provide a secret for the session store as the third parameter to the start function, which will be used to sign the session cookies. 

## Security and User Accounts
Account management is provided out of the box, with a simple registration and login process, utilizing a straightforward encrypted password scheme. However it is straightforwards to use the library with your own account management. To make this approach practical, the server-side module provides an easy way to retrieve all user account data, which gives you the ability to create accounts directly server-side, bypassing the REST api. This approach allows you to handle all account creation while still leveraging the library for managing the connection CaaS as well as Hubs and Project. See below for an example on how to retrieve all user account data and add the user to the session object:

```
app.put('/myLogin', async function (req, res, next) {
    //perform custom login procedure
    //...    

    let usersDB = caasUserManagementServer.getDatabaseObjects().users;
    let user = await usersDB.findOne({email:loggedinuser});
    req.session.caasUser = users2;
});

```

If you use this approach, it is advisable to do additional authentication on the REST api calls to the User Management server, to prevent unauthorized access to the user data and login calls.


## Using the User Management node module on a separate server
If you want to use the User Management node module on a separate server, you can do so by simply proxying its REST api calls to this server from your web-server. In this scenario you might want to add an extra layer to the User Management server to handle authentication and authorization if desired.

## Running Caas and Caas User Management from the same project
You can easily run both CaaS and the CaaS User Management modules together. See below for a minimal example that initializes both modules:
```

const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const conversionserver = require('ts3d.hc.caas');
conversionserver.start();

const caasUserManagementServer = require('ts3d.hc.caas.usermanagement');
caasUserManagementServer.start(app, null,{createSession:true, sessionSecret:"12345"});

app.listen(3000);
```

In this case, you want to make sure to have a local.json file in the config folder of your application which configures the categories for the two libraries following the pattern in the example below


```json

{
    "hc-caas-um": {
      //local settings for CaaS User Management
    },
    "hc-caas": {      
      //local settings for CaaS
      }
}
```
  










