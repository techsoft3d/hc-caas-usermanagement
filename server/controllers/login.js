const Users = require('../models/Users');
const Projects = require('../models/Projects');
const Hubs = require('../models/Hubs');
const files = require('../models/Files');
const bcrypt = require('bcrypt');
const csmanager = require('../libs/csManager');
const sessionManager = require('../libs/sessionManager');
let mongoose = require('mongoose'); 
const config = require('config');
const { v4: uuidv4 } = require('uuid');

//var nodemailer = require('nodemailer');


const fs = require('fs');


const millisecondsInAnHour = 60 * 60 * 1000;
const millisecondsInDay = 24 * 60 * 60 * 1000;

setInterval(async function () {    
    console.log("Purging expired Projects");
    let projects= await Projects.find({ "hub": null});
    let rightnow = new Date();
    for (let i=0;i<projects.length;i++) {
        if (rightnow - projects[i].updatedAt > millisecondsInDay) {
            console.log("deleting project:" + projects[i].name);
            let models = await files.find({ project: projects[i].id });
            for (let i = 0; i < models.length; i++) {
                await csmanager.deleteModel(models[i]._id.toString());
            }
            await Projects.deleteOne({ "_id": projects[i].id });
        }
    }
}, millisecondsInAnHour);


async function copyStarterProject(user,hub)
{
    let newproject = null;
    let project = await Projects.findOne({ "_id": config.get('hc-caas-um.demoProject') });
    if (project) {
        newproject = new Projects({
            name: project.name,
            users:[],
            hub:hub
        });

        await newproject.save();
        await addOneProjectUser(newproject.id,user.email,0);
      
        let allFiles = await files.find({ "project": project });
        for (let i = 0; i < allFiles.length; i++) {
            let newfile = new files({
                project: newproject,
                name: allFiles[i].name,
                converted: true,
                storageID: allFiles[i].storageID,
                filesize: allFiles[i].filesize,
                customData: allFiles[i].customData
            });
            await newfile.save();            
        }

    }
    return newproject;
}



async function copyStarterFilesIntoProject(projectid)
{
    let newproject = null;
    let project = await Projects.findOne({ "_id": config.get('hc-caas-um.demoProject') });
    if (project) {
             
        let allFiles = await files.find({ "project": project });
        for (let i = 0; i < allFiles.length; i++) {
            let newfile = new files({
                project: projectid,
                name: allFiles[i].name,
                converted: true,
                storageID: allFiles[i].storageID,
                filesize: allFiles[i].filesize,
                uploaded: allFiles[i].uploaded,
                customData: allFiles[i].customData
            });
            await newfile.save();            
        }

    }
}   


exports.postRegister = async(req, res, next) => {
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Demo mode. Can't register users."});
        return;
    }
    console.log("Registration");

    let item = await Users.findOne({ "email":  req.body.email });
    if (!item) 
    {

        data = req.body;
        data.password = await bcrypt.hash(data.password,10);

        let user = await Users.create(data);

//        req.session.caasUser = user;

        if (config.get('hc-caas-um.assignDemoHub') == true && config.get('hc-caas-um.demoProject') != "")
        {
            let hub = new Hubs({ "name": "Demo Hub", users:[]});
            await hub.save();
            await addOneHubUser(hub.id,user.email,0, true);
            let project = await copyStarterProject(user,hub);
            await addOneProjectUser(project.id,user.email,0);
            
        }
        res.json({user:user.email});
    }
    else 
        res.json({ERROR:"User already exists"});
};



exports.putLogin = async(req, res, next) => {    
    console.log("login");
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Demo mode. No manual login allowed."});
        return;
    }

    let generateProject = false;
    if (req.get('CSUM-API-GENERATEPROJECT') && req.get('CSUM-API-GENERATEPROJECT') == "true") {
        generateProject = true;
    }

    let inputemail = req.params.email;
    let inputpassword = req.params.password;
    
    if (!inputemail) {
        inputemail = config.get('hc-caas-um.demoUser');
        inputpassword = config.get('hc-caas-um.demoUserPassword');
    }

    let item = await Users.findOne({ "email":  inputemail });
    if (!item) 
    {        
        res.json({ERROR:"User not found"});
    }
    else 
    {
        let result = await bcrypt.compare(inputpassword, item.password);
        if (result)
        {       

            let sessionProject = null;
            if (!req.session) {
                req.session = {};
            }
            if (generateProject) {
                if (!req.session.id) {
                    req.session.id = uuidv4();
                }
                sessionProject = await Projects.findOne({ "users.email": item.email, "name": req.session.id });
                if (!sessionProject) {
                    sessionProject = new Projects({
                        name: req.session.id,
                        users: [{ email: item.email, role: 0 }],
                        hub: null
                    });
                    await sessionProject.save();
                    await copyStarterFilesIntoProject(sessionProject.id);
                }              
            }
            
            req.session.caasUser = item; 

            let sessionid = await sessionManager.createSession(req);

            res.json({succeeded:true, sessionid: sessionid, user:{email:req.session.caasUser.email}, sessionProject:sessionProject ? sessionProject.id : null});
        }
        else
            res.json({ERROR:"Wrong password"});
    }
};


exports.configuration = async(req, res, next) => {    
    console.log("configuration");    
    res.json({ssrEnabled: config.get('hc-caas-um.ssrEnabled'), useDirectFetch : config.get('hc-caas-um.useDirectFetch'),useStreaming : config.get('hc-caas-um.useStreaming'),demoMode: config.get('hc-caas-um.demoMode')});    
};



exports.checkLogin = async (req, res, next) => {
    if (config.get('hc-caas-um.demoMode')) {
        req.session.caasUser = null;
        let item = await Users.findOne({ "email": "demouser@techsoft3d.com" });
        if (item) {
            let hub = await Hubs.findOne({ "name": "Demo Hub", "users.email": item.email });
            if (hub) {
                let project = await Projects.findOne({ "users.email": item.email, "name": "Demo Project", "hub": hub.id });

                if (project) {
                    req.session.caasUser = item;
                    req.session.caasProject = project;
                    req.session.caasHub = hub;
                }
            }
        }
    }
    if (!req.session || !req.session.caasUser) {
        await sessionManager.attachSession(req);
    }

    if (req.session && req.session.caasUser) {
        let projectinfo = null;
        let hubinfo = null;

        let item = await Users.findOne({ "email": req.session.caasUser.email });
        if (!item) {
            req.session.destroy();
            res.json({ succeeded: false });

        }
        else {

            if (req.session.caasHub) {
                hubinfo = { id: req.session.caasHub._id, name: req.session.caasHub.name };
            }

            if (req.session.caasProject) {
                projectinfo = { id: req.session.caasProject._id, name: req.session.caasProject.name };
            }
            res.json({ succeeded: true, user: { email: req.session.caasUser.email }, project: projectinfo, hub: hubinfo });
        }
    }
    else
        res.json({ succeeded: false });
};

exports.putLogout = async (req, res, next) => {
    console.log("logout");
    if (req.session) {
        req.session.destroy();
    }
    sessionManager.deleteSession(req);
    res.json({ succeeded: true });
};

exports.putNewProject = async (req, res, next) => {
    
    if (await checkAuthorized(req.session.caasUser.email, req.params.hubid,null, 1)) {

        console.log("new project");
        const project = new Projects({
            name: req.params.name,
            users: [{ email: req.session.caasUser.email, role: 0 }],
            hub: req.params.hubid
        });

        await project.save();

        res.json({ projectid: project.id });
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};


async function deleteOneProject(projectid, req) {
    let project = await Projects.findOne({ "_id": projectid, "users": { $elemMatch: { "email": req.session.caasUser.email, "role": { $lte: 1 } } } });

    if (project) {
        let models = await files.find({ project: projectid });
        for (let i = 0; i < models.length; i++) {
            await csmanager.deleteModel(models[i]._id.toString());
        }
        await Projects.deleteOne({ "_id": projectid });
    }

}

exports.putDeleteProject = async(req, res, next) => {    

    if (await checkAuthorized(req.session.caasUser.email,null,req.params.projectid, 1)) {
        await deleteOneProject(req.params.projectid, req);
        res.sendStatus(200);   
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};

exports.putRenameProject = async (req, res, next) => {

    if (await checkAuthorized(req.session.caasUser.email, null,req.params.projectid, 1)) {

        let item = await Projects.findOne({ "_id": req.params.projectid });
        item.name = req.params.newname;
        item.save();
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }

};

exports.putProject = async(req, res, next) => {    

    if (req.params.projectid != "none") {
        let item = await Projects.findOne({ "users.email": req.session.caasUser.email, "_id": req.params.projectid });
        if (item) {
            req.session.caasProject = item;
            res.json({id:req.params.projectid, name:item.name});
            
            if (item.hub == null) {
                console.log("updating session project")
                item.updatedAt = new Date();
                item.save();
            }
            sessionManager.updateSession(req);
            return;
        }
    }
    req.session.caasProject = null;
    sessionManager.updateSession(req);
    res.json({ ERROR: "Not authorized." });
};


exports.getProjects = async(req, res, next) => {    

    let projects = await Projects.find({ "hub": req.params.hubid,"users.email": req.session.caasUser.email} );
  
    let a = [];
    for (let i = 0; i < projects.length; i++) {
        a.push({ id: projects[i].id.toString(), name: projects[i].name});
    }
    res.json(a);    
};

exports.getHubs = async(req, res, next) => {    

    let hubs = await Hubs.find({ "users.email": req.session.caasUser.email});

    let a = [];
    for (let i = 0; i < hubs.length; i++) {
        a.push({ id: hubs[i].id.toString(), name: hubs[i].name});
    }
    res.json(a);    
};

exports.getUsers = async(req, res, next) => {    

    let users = await Users.find();

    let a = [];
    for (let i = 0; i < users.length; i++) {
        a.push(users[i].email);
    }
    res.json(a);    
};


exports.getHubUsers = async(req, res, next) => {    


    var item = await Hubs.findOne({ "_id": req.params.hubid });
    let hubusers = item.users;
    let a = [];
    for (let i = 0; i < hubusers.length; i++) {
        let role = "";
        switch (hubusers[i].role)
        {
            case 0:
            role = "Owner";
            break;
            case 1:
            role = "Admin";
            break;
            default:
            role = "User";
            break;

        }
        a.push({ email: hubusers[i].email, role: role, accepted: hubusers[i].accepted});
    }
    res.json(a);    
};



exports.getProjectUsers = async(req, res, next) => {    


    var item = await Projects.findOne({ "_id": req.params.projectid });
    let projectusers = item.users;
    let a = [];
    for (let i = 0; i < projectusers.length; i++) {
        let role = "";
        switch (projectusers[i].role)
        {
            case 0:
            role = "Owner";
            break;
            case 1:
            role = "Editor";
            break;
            default:
            role = "Viewer";
            break;

        }
        a.push({ email: projectusers[i].email, role: role});
    }
    res.json(a);    
};




async function addOneProjectUser(projectid, email, role) {
    let item = await Projects.findOne({ "_id": projectid });
    let projectusers = item.users;
    let a = [];
    let alreadyAdded = false;
    for (let i = 0; i < projectusers.length; i++) {
        if (projectusers[i].email == email) {
            alreadyAdded = true;
            break;
        }
    }
    if (!alreadyAdded) {
        let user = await Users.findOne({ "email": email });
        if (user) {
            projectusers.push({ email: user.email, role: role});
        }       
    }
    await item.save();

}

exports.addProjectUser = async (req, res, next) => {

    if (await checkAuthorized(req.session.caasUser.email,null,req.params.projectid,1)) {
        let role = 2;
        if (req.params.role == "Editor")
        {
            role = 1;
        }

        await addOneProjectUser(req.params.projectid, req.params.userid, role);
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }

};


async function deleteOneProjectUser(projectid, email) {
    var item = await Projects.findOne({ "_id": projectid });
    let projectusers = item.users;

    for (let i = 0; i < projectusers.length; i++) {
        if (projectusers[i].email == email) {
            projectusers.splice(i, 1);
            break;
        }
    }
    await item.save();
}
exports.deleteProjectUser = async (req, res, next) => {
    if (await checkAuthorized(req.session.caasUser.email,null,req.params.projectid,1)) {
        await deleteOneProjectUser(req.params.projectid, req.params.userid);     
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};



exports.updateProjectUser = async (req, res, next) => {
    if (await checkAuthorized(req.session.caasUser.email,null,req.params.projectid,1)) {

        var item = await Projects.findOne({ "_id": req.params.projectid });
        let projectusers = item.users;

        for (let i = 0; i < projectusers.length; i++) {
            if (projectusers[i].email == req.params.userid) {
                let role = 2;
                if (req.params.role == "Editor")
                {
                    role = 1;
                }
                projectusers[i].role = role;
                break;
            }
        }
        await item.save();
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};



async function addOneHubUser(hubid, email, role,accepted) {
    let item = await Hubs.findOne({ "_id": hubid });
    let hubusers = item.users;
    let a = [];
    let alreadyAdded = false;
    for (let i = 0; i < hubusers.length; i++) {
        if (hubusers[i].email == email) {
            alreadyAdded = true;
            break;
        }
    }
    if (!alreadyAdded) {
        let user = await Users.findOne({ "email": email });
        if (user) {
            hubusers.push({ email: user.email, role: role, accepted: accepted });
        }
        else {
            //TODO: Implement email invite for new users
            // let user = await Users.create({
            //     firstName: "empty",
            //     lastName: "empty",
            //     email: req.params.userid,
            //     password: "empty",
            //     status: "NotJoined",        
            // });

            // hubusers.push({email:req.params.userid, role:req.params.role, accepted:false});
        }
    }


    await item.save();

}

exports.addHubUser = async (req, res, next) => {

    if (await checkAuthorized(req.session.caasUser.email,req.params.hubid,null,1)) {
        let role = 2;
        if (req.params.role == "Admin")
        {
            role = 1;
        }

        await addOneHubUser(req.params.hubid, req.params.userid, role, false);
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};



exports.putRenameHub = async (req, res, next) => {
    if (await checkAuthorized(req.session.caasUser.email, req.params.hubid,null, 1)) {
        let item = await Hubs.findOne({ "_id": req.params.hubid });
        item.name = req.params.newname;
        item.save();
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }

};




exports.deleteHubUser = async (req, res, next) => {
    if (await checkAuthorized(req.session.caasUser.email,req.params.hubid,null,1)) {

        var item = await Hubs.findOne({ "_id": req.params.hubid });
        let hubusers = item.users;

        for (let i = 0; i < hubusers.length; i++) {
            if (hubusers[i].email == req.params.userid) {
                hubusers.splice(i, 1);

                let projects = await Projects.find({"hub": req.params.hubid });

                for (let i=0;i<projects.length;i++)
                {
                    await deleteOneProjectUser(projects[i].id, req.params.userid);
                }
                break;
            }
        }
        await item.save();
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};


exports.updateHubUser = async (req, res, next) => {
    if (await checkAuthorized(req.session.caasUser.email,req.params.hubid,null,1)) {

        var item = await Hubs.findOne({ "_id": req.params.hubid });
        let hubusers = item.users;

        for (let i = 0; i < hubusers.length; i++) {
            if (hubusers[i].email == req.params.userid) {
                let role = 2;
                if (req.params.role == "Admin")
                {
                    role = 1;
                }
                hubusers[i].role = role;
                break;
            }
        }
        await item.save();
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};


async function checkAuthorized(email,hubid,projectid, role) {

    if (config.get('hc-caas-um.demoMode')) {     
        return false;
    }

    let found;
    if (hubid) {
        found = await Hubs.findOne({ "_id": hubid, "users": { $elemMatch: { "email": email, "role": { $lte: role } } } });
    }
    else {
        found = await Projects.findOne({ "_id": projectid, "users": { $elemMatch: { "email": email, "role": { $lte: role } } } });
    }

    if (found) {
        return true;
    }
    return false;

}



exports.putDeleteHub = async (req, res, next) => {
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }
    let hub = await Hubs.findOne({ "_id": req.params.hubid, "users": { $elemMatch: { "email": req.session.caasUser.email, "role": { $lt: 1 } } } });
    if (hub) {

        let projects = await Projects.find({"hub": req.params.hubid });
        for (let i = 0; i < projects.length; i++) {
            await deleteOneProject(projects[i].id,req);

        }

        await Hubs.deleteOne({ "_id": req.params.hubid });
    }
    res.sendStatus(200);
};


exports.acceptHub = async (req, res, next) => {

    var item = await Hubs.findOne({ "_id": req.params.hubid });
    let hubusers = item.users;
   
    for (let i = 0; i < hubusers.length; i++) {
        if (hubusers[i].email == req.params.userid) {
            hubusers[i].accepted = true;
            break;           
        }
    }
    await item.save();

    res.sendStatus(200);
};



exports.putNewHub = async(req, res, next) => {    
    if (config.get('hc-caas-um.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }
    console.log("new hub");
    const hub = new Hubs({
        name: req.params.hubname,
        users: [{email:req.session.caasUser.email, role:0, accepted:true}],
    });

    await hub.save();
    
    res.json({hubid:hub.id});
};


exports.putHub = async (req, res, next) => {

    if (req.params.hubid == "none" || await checkAuthorized(req.session.caasUser.email, req.params.hubid,null, 2)) {
        if (config.get('hc-caas-um.demoMode')) {
            res.json({ ERROR: "Not authorized." });
            return;
        }
        if (req.params.hubid != "none") {
            var item = await Hubs.findOne({ "_id": req.params.hubid });
            req.session.caasHub = item;
            res.json({ id: req.params.hubid, name: item.name });
        }
        else {
            req.session.caasHub = null;
            res.sendStatus(200);
        }
        sessionManager.updateSession(req);
    }
    else {
        res.json({ ERROR: "Not authorized." });
    }
};
