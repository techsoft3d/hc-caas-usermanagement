const Sessions = require('../models/Sessions');


exports.attachSession = async (req) => {
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid && sessionid != "null") {

        let session = await Sessions.findOne({ "_id": sessionid });
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
    let session = new Sessions({
        user: req.session.caasUser,   
    });
    await session.save();
    return session._id;
};



exports.deleteSession = async (req) => {
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid) {
        await Sessions.deleteOne({ "_id": sessionid });
    }
};



exports.updateSession = async (req) => {   
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid) {

        let session = await Sessions.findOne({ "_id": sessionid });
        if (session) {
            session.user = req.session.caasUser;
            session.hub = req.session.caasHub,
            session.project = req.session.caasProject
            await session.save();
        }       
    }
};


exports.updateStreaming = async (req) => {   
    let sessionid = req.get("CSUM-API-SESSIONID");
    if (sessionid) {

        let session = await Sessions.findOne({ "_id": sessionid });
        if (session) {
            session.streamingSessionId =   req.session.streamingSessionId;
            await session.save();
        }       
    }
};

