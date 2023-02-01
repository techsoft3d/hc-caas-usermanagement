# CaaS User Management (beta)

## Version Update (0.2.7) 
* Support for multi-file upload for assemblies
* Upload UI redone

## Introduction
This library implements user management on top of the [CaaS](https://github.com/techsoft3d/hc-caas) library, which is a conversion and streaming backend for HOOPS Communicator. It provides a straightforward REST api for managing user accounts and their associated data, including Hubs and Projects with different access levels per user. By connecting this library to CaaS, you essentially get the framework for a CAD oriented SaaS application "out of the box", with a few lines of server-side code, ideal for prototyping and testing or as the starting point for your own development.

The library consists of three components, the server-side node.js library you can add to your project via npm as well as a client-side library for communicating with the server. It also comes with an easily extendable bootstrap based front-end that uses the client-side library.

## Feedback
For questions/feedback please send an email to guido@techsoft3d.com or post in our [forum](https://forum.techsoft3d.com/). For a 60 day trial of the HOOPS Web Platform go to https://www.techsoft3d.com/products/hoops/web-platform.

## Roadmap
* Multi-file Upload Support for direct S3 upload
* Improved ZIP upload with content preview
* Email Flow for Signup 
* Oauth2 Support
* More modular UI Design

## Disclaimer
**This library is not an officially supported part of HOOPS Communicator and provided as-is.**

## Documentation
Live Documentation for the client-side library can be found here: [https://techsoft3d.github.io/hc-caas-usermanagement/](https://techsoft3d.github.io/hc-caas-usermanagement/)


## Quick Start 
To quickly test out CaaS User Management with the provided UI, follow the steps below.
1. Clone the repository
2. Install all dependencies with `npm install`
3. Ensure CaaS is running on port 3001. If not, follow the instructions [here](https://github.com/techsoft3d/hc-caas)
4. Start the server with `npm start`
5. Open a browser and navigate to `http://localhost:3000`
6. Register at least one user account, create a hub, project. You can then convert and view files, etc.


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
1. Add 'caasu.min.js' to your client-side project. The client-side library is included in the `/dist` folder of this repository.  
`<script type="text/javascript" src="js/caasu.min.js"></script>`
2. Create a new CaasUserManagementClient object, specifying your server address.  
` myUserManagmentClient = new CaasU.CaasUserManagementClient("http://localhost:3000"); `
3. See the frontend code in the public folder of this project and the [reference manual](https://techsoft3d.github.io/hc-caas-usermanagement/CaasUserManagementClient.html) for further API usage. Alternatively, feel free to copy the content of the public folder from this repository to your own project and use the provided reference implementation as a starting point for your own application.

## More Details on the Server
By default the CaaS User Management server will add its own REST end-points to your express app, which are all prefixed with `/caas_um_api`. It will also start its own mongooose session as well as create a user-session. If you are already using mongoose you can provide its connection as the second parameter to the start function. In addition, the User Management Server can create its own session store for cookie based session management but you can choose to provide your own as well. In this case the user management library will expect a session to be present on the request object for all its REST api calls. If you allow the User Management server to create its own session store, you should provide a 'sessionSecret' for the session store, which will be used to sign the session cookies. 

## Security and User Accounts
Account management is provided out of the box, with a simple registration and login process, utilizing a straightforward encrypted password scheme. However it is easy to use the library with your own account management. To make this approach practical, the server-side module provides an easy way to retrieve all user account data, which gives you the ability to create and query accounts directly server-side, bypassing the REST api. This approach allows you to handle all account creation while still leveraging the library for managing the connection to CaaS as well as Hubs and Project. See below for an example on how to retrieve all user account data and add the user to the session object:

```
app.put('/myLogin', async function (req, res, next) {
    //perform custom login procedure
    //...    

    let usersDB = caasUserManagementServer.getDatabaseObjects().users;
    let user = await usersDB.findOne({email:loggedinuser});
    req.session.caasUser = users2;
});

```

If you use this approach, it is advisable to do additional authentication on the REST api calls to the User Management server to prevent unauthorized access to the user data and login endpoints.


## Running CaaS User Management on a separate server
If you want to use the User Management node module on a separate server from your main application, you can do so by simply proxying its REST api calls (which are all prefixed with `/caas_um_api`)  from your web-server. In this scenario you might want to add an extra layer to the server to handle authentication and authorization if desired.

## Running CaaS and CaaS User Management from the same project
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

In this case, you want to make sure to have a local.json file in the config folder of your application which configures the categories for the two libraries following the pattern in the example below:

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
  










