const config = require('config');
const sessionManager = require('../libs/sessionManager');
const geoip = require('geoip-lite');
const path = require('path');

let csmanager = require('../libs/csManager');

// const {IP2Location} = require("ip2location-nodejs");
// let ip2location = new IP2Location();
// ip2location.open(path.join(__dirname,"./IP2LOCATION-LITE-DB3.BIN"));

exports.postUpload = async(req, res, next) => {
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }

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

    let result = await csmanager.getUploadToken(req.params.name,req.params.size,req.session.caasProject);
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

    // let result = ip2location.getAll(ip);
    // for (var key in result) {
    // 	console.log(key + ": " + result[key]);
    // }

    let geo = geoip.lookup(ip);
    let s = await csmanager.getStreamingSession(geo);
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
    let s = await csmanager.enableStreamAccess(req.params.itemid,req.session.caasProject, req.session.streamingSessionId);
    console.log("Access:" + req.session.streamingSessionId);
    res.sendStatus(200);
};