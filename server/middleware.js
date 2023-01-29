exports.requireLogin = (req, res, next) => {
    if (req.session && req.session.caasUser) {
        return next();
    }
};