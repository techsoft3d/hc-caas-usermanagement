const path = require('path');
const express = require('express');
const apiController = require('../server/controllers/api');
const loginController = require('../server/controllers/login');
const router = express.Router();

module.exports = router;

router.post('/upload', apiController.postUpload);
router.get('/uploadToken/:name/:size', apiController.getUploadToken);
router.get('/downloadToken/:itemid/:type', apiController.getDownloadToken);
router.put('/processToken/:itemid', apiController.processFromToken);
router.get('/models', apiController.getModels);
router.get('/scs/:itemid', apiController.getSCS);
router.get('/png/:itemid', apiController.getPNG);
router.get('/step/:itemid', apiController.getSTEP);
router.get('/fbx/:itemid', apiController.getFBX);
router.put('/generateStep/:itemid', apiController.generateSTEP);
router.get('/glb/:itemid', apiController.getGLB);
router.get('/hsf/:itemid', apiController.getHSF);
router.put('/generateFBX/:itemid', apiController.generateFBX);
router.put('/generateGLB/:itemid', apiController.generateGLB);
router.put('/generateHSF/:itemid', apiController.generateHSF);
router.put('/customImage/:itemid', apiController.generateCustomImage);

router.get('/xml/:itemid', apiController.getXML);
router.put('/generateXML/:itemid', apiController.generateXML);

router.put('/deleteModel/:itemid', apiController.deleteModel);

router.put('/newproject/:projectname', loginController.putNewProject);
router.put('/deleteproject/:projectid', loginController.putDeleteProject);
router.put('/renameproject/:projectid/:newname', loginController.putRenameProject);
router.put('/project/:projectid', loginController.putProject);
router.get('/projects', loginController.getProjects);
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