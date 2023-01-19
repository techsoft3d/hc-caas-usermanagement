const path = require('path');
const express = require('express');
const apiController = require('../server/controllers/api');
const loginController = require('../server/controllers/login');
const router = express.Router();

module.exports = router;

router.post('/register', loginController.postRegister);
router.post('/login', loginController.postLogin);
router.put('/logout', loginController.putLogout);
router.get('/checklogin', loginController.checkLogin);
router.get('/configuration', loginController.configuration);
router.post('/webhook', apiController.processWebhook);



