const path = require('path');
const express = require('express');
const apiController = require('../controllers/api');
const loginController = require('../controllers/login');
const router = express.Router();

module.exports = router;

router.post('/upload', apiController.postUpload);
router.post('/uploadArray', apiController.postUploadArray);

router.get('/uploadToken/:name/:size', apiController.getUploadToken);
router.get('/downloadToken/:itemid/:type', apiController.getDownloadToken);
router.put('/processToken/:itemid', apiController.processFromToken);
router.get('/models', apiController.getModels);
router.get('/scs/:itemid', apiController.getSCS);
router.get('/png/:itemid', apiController.getPNG);
router.put('/customImage/:itemid', apiController.generateCustomImage);

router.put('/deleteModel/:itemid', apiController.deleteModel);

router.put('/newproject/:hubid/:name', loginController.putNewProject);
router.put('/deleteproject/:projectid', loginController.putDeleteProject);
router.put('/renameproject/:hubid/:projectid/:newname', loginController.putRenameProject);
router.put('/project/:hubid/:projectid', loginController.putProject);
router.get('/projects/:hubid', loginController.getProjects);
router.get('/projectusers/:projectid', loginController.getProjectUsers);
router.put('/addProjectUser/:projectid/:userid/:role', loginController.addProjectUser);
router.put('/deleteProjectUser/:projectid/:userid', loginController.deleteProjectUser);
router.put('/updateProjectUser/:projectid/:userid/:role', loginController.updateProjectUser);

router.put('/hub/:hubid', loginController.putHub);
router.get('/hubs', loginController.getHubs);
router.get('/hubusers/:hubid', loginController.getHubUsers);
router.put('/addHubUser/:hubid/:userid/:role', loginController.addHubUser);
router.put('/deleteHubUser/:hubid/:userid', loginController.deleteHubUser);
router.put('/updateHubUser/:hubid/:userid/:role', loginController.updateHubUser);
router.put('/deleteHub/:hubid', loginController.putDeleteHub);
router.put('/newhub/:hubname', loginController.putNewHub);
router.put('/acceptHub/:hubid/:userid', loginController.acceptHub);
router.put('/renameHub/:hubid/:newname', loginController.putRenameHub);

router.get('/users', loginController.getUsers);

router.put('/enableStreamAccess/:itemid', apiController.enableStreamAccess);
router.get('/streamingSession', apiController.getStreamingSession);