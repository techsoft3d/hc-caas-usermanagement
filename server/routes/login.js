const path = require('path');
const express = require('express');
const apiController = require('../controllers/api');
const loginController = require('../controllers/login');
const router = express.Router();

module.exports = router;

router.post('/register', loginController.postRegister);
router.post('/login', loginController.postLogin);
router.put('/logout', loginController.putLogout);
router.get('/checklogin', loginController.checkLogin);
router.get('/configuration', loginController.configuration);
router.post('/webhook', apiController.processWebhook);



