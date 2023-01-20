const Users = require('../models/Users');
const Projects = require('../models/Projects');
const Hubs = require('../models/Hubs');
const CsFiles = require('../models/csFiles');
const bcrypt = require('bcrypt');
const csmanager = require('../libs/csManager');
let mongoose = require('mongoose'); 
const config = require('config');

//var nodemailer = require('nodemailer');


const fs = require('fs');


async function copyStarterProject(user,hub)
{
    let newproject = null;
    let project = await Projects.findOne({ "_id": config.get('caas-ac.demoProject') });
    if (project) {
        newproject = new Projects({
            name: project.name,
            users:[],
            hub:hub
        });

        await newproject.save();
        await addOneProjectUser(newproject.id,user.email,0);
      
        let files = await CsFiles.find({ "project": project });
        for (let i = 0; i < files.length; i++) {
            let newfile = new CsFiles({
                project: newproject,
                name: files[i].name,
                converted: true,
                storageid: files[i].storageid,
                filesize: files[i].filesize,
                hasStep: files[i].hasStep,
                hasFBX: files[i].hasFBX,
                hasHSF: files[i].hasHSF,
                uploaded: files[i].uploaded,              
            });
            await newfile.save();            
        }

    }
    return newproject;
}

exports.postRegister = async(req, res, next) => {
    if (config.get('caas-ac.demoMode')) {
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

        req.session.user = user;

        if (config.get('caas-ac.assignDemoHub') == true && config.get('caas-ac.demoProject') != "")
        {
            let hub = new Hubs({ "name": "Demo Hub", users:[]});
            await hub.save();
            await addOneHubUser(hub.id,user.email,0, true);
            let project = await copyStarterProject(user,hub);
            await addOneProjectUser(project.id,user.email,0);
            
        }
        res.json({user:req.session.user.email});
    }
    else 
        res.json({ERROR:"User already exists"});
};



exports.postLogin = async(req, res, next) => {    
    console.log("login");
    if (config.get('caas-ac.demoMode')) {
        res.json({ERROR:"Demo mode. No manual login allowed."});
        return;
    }

    let item = await Users.findOne({ "email":  req.body.email });
    if (!item) 
    {        
        res.json({ERROR:"User not found"});
    }
    else 
    {
        data = req.body;
        let result = await bcrypt.compare(req.body.password, item.password);
        if (result)
        {       
            req.session.user = item; 
            res.json({succeeded:true, user:{email:req.session.user.email}});
        }
        else
            res.json({ERROR:"Wrong password"});
    }
};


exports.configuration = async(req, res, next) => {    
    console.log("configuration");    
    res.json({useDirectFetch : config.get('caas-ac.useDirectFetch'),useStreaming : config.get('caas-ac.useStreaming'),demoMode: config.get('caas-ac.demoMode')});    
};



exports.checkLogin = async (req, res, next) => {
    console.log("check login");
    if (config.get('caas-ac.demoMode')) {
        req.session.user = null;
        let item = await Users.findOne({ "email": "demouser@techsoft3d.com" });
        if (item) {
            let hub = await Hubs.findOne({ "name": "Demo Hub", "users.email": item.email });
            if (hub) {
                let project = await Projects.findOne({ "users.email": item.email, "name": "Demo Project", "hub": hub.id });

                if (project) {
                    req.session.user = item;
                    req.session.project = project;
                    req.session.hub = hub;
                }
            }
        }
    }

    if (req.session && req.session.user) {
        let projectid = null;
        let hubinfo = null;

        let item = await Users.findOne({ "email": req.session.user.email });
        if (!item) {
            req.session.destroy();
            res.json({ succeeded: false });

        }
        else {

            if (req.session.hub) {
                hubinfo = { id: req.session.hub._id, name: req.session.hub.name };
            }

            if (req.session.project) {
                projectid = req.session.project._id;
            }
            if (req.session.hub) {
                hubinfo = { id: req.session.hub._id, name: req.session.hub.name };
            }
            res.json({ succeeded: true, user: { email: req.session.user.email }, project: projectid, hub: hubinfo });
        }
    }
    else
        res.json({ succeeded: false });
};

exports.putLogout = async (req, res, next) => {
    console.log("logout");
    req.session.destroy();
    res.json({ succeeded: true });
};

exports.putNewProject = async (req, res, next) => {
    
    if (await checkHubAuthorized(req.session.user.email, req.session.hub._id.toString(), 1)) {

        console.log("new project");
        const project = new Projects({
            name: req.params.projectname,
            users: [{ email: req.session.user.email, role: 0 }],
            hub: req.session.hub
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
    let project = await Projects.findOne({ "_id": projectid, "users": { $elemMatch: { "email": req.session.user.email, "role": { $lte: 1 } } } });

    if (project) {
        let models = await CsFiles.find({ project: projectid });
        for (let i = 0; i < models.length; i++) {
            await csmanager.deleteModel(models[i]._id.toString());
        }
        await Projects.deleteOne({ "_id": projectid });
    }

}

exports.putDeleteProject = async(req, res, next) => {    

    if (await checkHubAuthorized(req.session.user.email, req.session.hub._id.toString(), 1)) {
        await deleteOneProject(req.params.projectid, req);
        res.sendStatus(200);   
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};

exports.putRenameProject = async (req, res, next) => {

    if (await checkHubAuthorized(req.session.user.email, req.session.hub._id.toString(), 1)) {

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
        var item = await Projects.findOne({ "_id": req.params.projectid });
        req.session.project = item;
        res.json({projectname:item.name});
    }
    else {
        req.session.project = null;
        res.sendStatus(200);
    }
};


exports.getProjects = async(req, res, next) => {    

 //   let projects = await Projects.find({ "users.email": req.session.user.email,"hub": req.session.hub } );
    let projects = await Projects.find({ "hub": req.session.hub,"users.email": req.session.user.email} );
  
    let a = [];
    for (let i = 0; i < projects.length; i++) {
        a.push({ id: projects[i].id.toString(), name: projects[i].name});
    }
    res.json(a);    
};


exports.getHubs = async(req, res, next) => {    

    let hubs = await Hubs.find({ "users.email": req.session.user.email});

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

    if (await checkHubAuthorized(req.session.user.email,req.session.hub._id.toString(),1)) {
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
    if (await checkHubAuthorized(req.session.user.email,req.session.hub._id.toString(),1)) {
        await deleteOneProjectUser(req.params.projectid, req.params.userid);     
        res.sendStatus(200);
    }
    else
    {
        res.json({ ERROR: "Not authorized." });
    }
};



exports.updateProjectUser = async (req, res, next) => {
    if (await checkHubAuthorized(req.session.user.email,req.session.hub._id.toString(),1)) {

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

    if (await checkHubAuthorized(req.session.user.email,req.params.hubid,1)) {
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
    if (await checkHubAuthorized(req.session.user.email, req.params.hubid, 1)) {
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
    if (await checkHubAuthorized(req.session.user.email,req.params.hubid,1)) {

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
    if (await checkHubAuthorized(req.session.user.email,req.params.hubid,1)) {

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


async function checkHubAuthorized(email,hubid, role) {

    if (config.get('caas-ac.demoMode')) {     
        return false;
    }

    let hub = await Hubs.findOne({ "_id": hubid, "users": { $elemMatch: { "email": email, "role": { $lte: role } } } });

    if (hub) {
        return true;
    }
    return false;

}



exports.putDeleteHub = async (req, res, next) => {
    if (config.get('caas-ac.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }
    let hub = await Hubs.findOne({ "_id": req.params.hubid, "users": { $elemMatch: { "email": req.session.user.email, "role": { $lt: 1 } } } });
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
    if (config.get('caas-ac.demoMode')) {
        res.json({ERROR:"Not authorized."});
        return;
    }
    console.log("new hub");
    const hub = new Hubs({
        name: req.params.hubname,
        users: [{email:req.session.user.email, role:0, accepted:true}],
    });

    await hub.save();
    
    res.json({hubid:hub.id});
};


exports.putHub = async (req, res, next) => {

    if (req.params.hubid == "none" || await checkHubAuthorized(req.session.user.email, req.params.hubid, 2)) {
        if (config.get('caas-ac.demoMode')) {
            res.json({ ERROR: "Not authorized." });
            return;
        }
        if (req.params.hubid != "none") {
            var item = await Hubs.findOne({ "_id": req.params.hubid });
            req.session.hub = item;
            res.json({ id: req.params.hubid, name: item.name });
        }
        else {
            req.session.hub = null;
            res.sendStatus(200);
        }
    }
    else {
        res.json({ ERROR: "Not authorized." });
    }
};
