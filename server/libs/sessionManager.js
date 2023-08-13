const { v4: uuidv4 } = require('uuid');


let sessions = [];


uuidv4();

exports.attachSession = async (req) => {
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid && sessionid != "null") {

        let session = sessions[sessionid];
        if (session) {
            if (!req.session) {
                req.session = {};
            }
            req.session.caasUser = session.user;
            req.session.caasHub = session.hub;
            req.session.caasProject = session.project;       
            req.session.streamingSessionId = session.streamingSessionId;                 
        }
    }
};


exports.createSession = async (req) => {
    let session = {
        user: req.session.caasUser,   
    };
    let id = uuidv4();
    sessions[id] = session;
    return id;
};



exports.deleteSession = async (req) => {
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid) {
        delete sessions[sessionid];
    }
};



exports.updateSession = async (req) => {   
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid) {

        let session = sessions[sessionid];
        if (session) {
            session.user = req.session.caasUser;
            session.hub = req.session.caasHub,
            session.project = req.session.caasProject           
        }       
    }
};


exports.updateStreaming = async (req) => {   
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid) {
        let session = sessions[sessionid];
        if (session) {
            session.streamingSessionId =   req.session.streamingSessionId;
        }       
    }
};

