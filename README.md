# CaaS Account Handling : Account Managenment for CaaS


## Introduction
This library implements account management on top of the [CaaS](https://github.com/techsoft3d/hc-caas) library, which is a conversion and streaming backend for HOOPS Communicator. It provides an easy to use REST api for managing user accounts and their associated data, including Hubs and Projects with different access levels per user. By connecting this library to CaaS, you essentially get a CAD oriented SaaS application "out of the box", with a few lines of server-side code, ideal for prototyping and testing or as the starting point for your own  application.

The library consists of two components,  the server-side node.js library you can add to your project via npm as well as a client-side library for communicating with the server.  It also comes with a framework-agnostic  front-end, written with bootstrap that demonstrates the use of the client-side library and can be used as a starting point for your own application.


## Quick Start 
To quickly test out CaaS Account Handling with the provided demo, follow the steps below.
1. Clone the repository
2. Install the dependencies with `npm install`
3. Ensure CaaS is running on port 3001. If not, follow the instructions [here](https://github.com/techsoft3d/hc-caas)
4. Start the server with `npm start`
5. Open a browser and navigate to `http://localhost:3000/viewer.html`
6. Register at least one user account, create a hub, project. You can then upload a file, etc.



## Integrate with your own Node-Based Server Application

### Server Side
To integrate CaaS Account Handling into your own server application as a node module, follow the steps below.
1. Install the module with `npm install hc-caas-account-handling`
2. Import the module with `const caasAccountHandling = require('hc-caas-account-handling');`
3. Start the CaasAccountHandlingServer with caasAccountHandling.start(), providing your express app as a parameter as well as other configuration settings. See below for a minimal example:

```

const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const caasAccountHandling = require('hc-caas-account-handling');
caasAc.start(app, null,{createSession:true, sessionSecret:"12345"});

app.listen(3000);

```

### Client Side
1. Add 'caasac.min.js' to your client-side project. The client-side library is included in the dist folder of this repository.
2. Create a new CaasAccountHandlingClient object with `const caasac = new CaasAccountHandlingClient(serverip);`







