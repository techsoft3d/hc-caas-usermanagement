const sessionManager = require('./libs/sessionManager');


exports.requireLogin = async (req, res, next) => {
    await sessionManager.attachSession(req);
    if (req.session && req.session.caasUser) {
        return next();
    }
};