const config = require('config');
const sessionManager = require('../libs/sessionManager');
const geoip = require('geoip-lite');
const path = require('path');
const stats = require('../models/Stats');

let csmanager = require('../libs/csManager');

// const {IP2Location} = require("ip2location-nodejs");
// let ip2location = new IP2Location();
// ip2location.open(path.join(__dirname,"./IP2LOCATION-LITE-DB3.BIN"));


var startedAt = new Date();


function newStat(type,req, value) {
   
    const stat = new stats({
        Type: type,
        From:  req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        Value: value ? value : ""
    });

    stat.save();
}



exports.postUpload = async(req, res, next) => {
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }

    newStat("upload",req,req.file.originalname);

    let id = req.file.destination.split("/");
    let result = "";
    result = await csmanager.process(id[1], req.file.originalname,req.session.caasProject,req.headers.startpath);
    res.json({ itemid: result });
};


exports.postUploadArray = async(req, res, next) => {
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }

    newStat("uploadArray",req,req.headers.startmodel);
    
    let startmodel = req.headers.startmodel;
    
     result = await csmanager.processMultiple(req.files,startmodel,req.session.caasProject);
    console.log("arrayupload:" + startmodel);
    res.json({ itemid: result });
};

exports.getUploadToken = async(req, res, next) => {    

    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }

  if (!req.params.itemid) {
    newStat("uploadToken", req, req.params.name);
  }

    let result = await csmanager.getUploadToken(req.params.name,req.params.size,req.params.itemid,req.session.caasProject);
    res.json(result);
};


exports.getDownloadToken = async(req, res, next) => {    
    let result = await csmanager.getDownloadToken(req.params.itemid,req.params.type,req.session.caasProject);
    res.json(result);
};

exports.processFromToken = async(req, res, next) => {
  
    let startpath = req.headers.startpath;
    let result = await csmanager.processFromToken(req.params.itemid, req.session.caasProject,startpath);
    res.sendStatus(200);
};

exports.getSCS = async(req, res, next) => {
    let result = await csmanager.getSCS(req.params.itemid,req.session.caasProject);
    res.send(Buffer.from(result));
};


exports.getPNG = async(req, res, next) => {
    let result = await csmanager.getPNG(req.params.itemid,req.session.caasProject);
    res.send(Buffer.from(result));
};

exports.getModels = async (req, res, next) => {
    let result = await csmanager.getModels(req.session.caasProject);
    res.json(result);    
};

exports.deleteModel = async (req, res, next) => {

    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }

    csmanager.deleteModel(req.params.itemid,req.session.caasProject);
    res.sendStatus(200);
};

exports.processWebhook = async (req, res, next) => {
    csmanager.updateConversionStatus(req.body.id,req.body.files);
    res.sendStatus(200);
};

exports.generateCustomImage = async (req, res, next) => {
    
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }

    csmanager.generateCustomImage(req.params.itemid,req.session.caasProject);
    res.sendStatus(200);
};

exports.getStreamingSession = async (req, res, next) => {
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // If IP address is from localhost it will be ::1 when working locally
    // Convert it into a valid IPv4 or IPv6 format
    if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7)
    }

    let geo = geoip.lookup(ip);
    let s = await csmanager.getStreamingSession(geo, req.get("CSUM-API-useSSR") && req.get("CSUM-API-useSSR") == "true");
  
    if ((ip == "::1" || ip.indexOf("172.17") != -1) && global.caas_um_publicip.indexOf(s.serverurl) != -1) {
      s.serverurl = "localhost";
    }
    else if (s.serverurl.indexOf(ip) > -1) {
      s.serverurl = "localhost"
    }
    
    if (!s.ERROR) {

        setTimeout(async () => {
            req.session.streamingSessionId = s.sessionid.slice();
            if (req.session.save) {
                req.session.save();
            }
            await sessionManager.updateStreaming(req);
            console.log(req.session.streamingSessionId);
        }, 300);
    }
    res.json(s);
};



exports.enableStreamAccess = async (req, res, next) => {
    let filename = await csmanager.enableStreamAccess(req.params.itemid,req.session.caasProject, req.session.streamingSessionId);
    newStat("streamAccess",req, filename);
    console.log("Stream Access for " + filename + "(" +  req.session.streamingSessionId + ")");
    res.sendStatus(200);
};


exports.getStatus = async (req, res, next) => {
    let data1 = await csmanager.getStatus();
    let s = await stats.find();
    let caasInfo  = await csmanager.getCaasInfo();
    res.send(makeHTML(data1,s,caasInfo.version));
};



exports.putCreateEmptyModel = async(req, res, next) => {    

  
  newStat("uploadAssembly", req, req.params.name);
  
  let result = await csmanager.createEmptyModel(req.params.name,req.params.size,req.headers.startpath,req.session.caasProject);
  res.json(result);
};


function formatUptime() {
  let current = new Date();

  let diffInMilliseconds = current - startedAt;
  let diffInHours = diffInMilliseconds / (1000 * 60 * 60);

  let hours = Math.floor(diffInHours);
  let minutes = Math.floor((diffInHours - hours) * 60);

  return `${hours} Hours ${minutes} Minutes`;

}

function formatDate(date) {
    return new Date(date).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }


// Generate the HTML page
const makeHTML = (serverData, statsdata, caasVersion) => {
    const tableRows = serverData.map(row => {
      const statusClass = row.status === 'Offline' ? 'status-offline' : '';
      return `
          <tr>
            <td>${row.servername}</td>
            <td>${row.serveraddress}</td>
            <td>${row.type}</td>
            <td class="${statusClass}">${row.status}</td>
            <td>${row.lastAccess}</td>
          </tr>
        `;
    }).join('');

    const tableRows2 = statsdata.map(row => {
        return `
            <tr>
              <td>${row.Type}</td>
              <td>${row.From}</td>
              <td>${row.Value}</td>
              <td>${formatDate(row.createdAt)}</td>
            </tr>
          `;
      }).join('');
  
    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Server Status</title>
            <style>
            .status-offline {
              background: red;
            }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  <th>Server Name</th>
                  <th>Server Address</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last Access</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            Uptime: ${formatUptime()}<br>
            CaaS Version: ${caasVersion}<br>
            CaasUM Version: ${process.env.caas_um_version}<br><br>
            Usage Info<br><br>
            <table>            
            <thead>
              <tr>
                <th>Type</th>
                <th>Address</th>
                <th>Info</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows2}
            </tbody>
          </table>
          </body>
        </html>
      `;
  
    return html;
  };