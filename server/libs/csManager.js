const fs = require('fs');
const del = require('del');
const files = require('../models/Files');
const Projects = require('../models/Projects');

const FormData = require('form-data');
const fetch = require('node-fetch');

let conversionServiceURI = "";

const config = require('config');


exports.init = (uri) =>
{
    conversionServiceURI = uri;
    _checkPendingConversions();      
};

exports.process = async (tempid, filename, project,startpath) => {

    let stats = fs.statSync("./upload/" + tempid + "/" + filename);
    const item = new files({
        name: filename,
        converted: false,
        storageID: "NONE",
        filesize: stats.size,
        uploaded: new Date(),       
        project:project

    });
    await item.save();
    const modelid = item._id.toString();

    let form = new FormData();
    form.append('file', fs.createReadStream("./upload/" + tempid + "/" + filename));

    let api_arg  = {webhook:config.get('hc-caas-um.serverURI') + '/caas_um_api/webhook', startPath:startpath};
        
    res = await fetch(conversionServiceURI + '/api/upload', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
    const data = await res.json();

    del("./upload/" + tempid);
    item.storageID = data.itemid;
    item.save();
    await _updated(project);

    return modelid;    
};


exports.processMultiple = async (infiles, startmodel, project) => {

    let form = new FormData();

    let size = 0;
    for (let i = 0; i < infiles.length; i++) {
        let tempid = infiles[i].destination.split("/")[1];
        form.append('files', fs.createReadStream("./upload/" + tempid + "/" + infiles[i].originalname));
        let stats = fs.statSync("./upload/" + tempid + "/" + infiles[i].originalname);
        size += stats.size;        
    }

    const item = new files({
        name: startmodel,
        converted: false,
        storageID: "NONE",
        filesize: size,
        uploaded: new Date(),       
        project:project

    });
    await item.save();
    const modelid = item._id.toString();

    let api_arg  = {webhook:config.get('hc-caas-um.serverURI') + '/caas_um_api/webhook', rootFile:startmodel};    
        
    res = await fetch(conversionServiceURI + '/api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
    const data = await res.json();

    for (let i = 0; i < infiles.length; i++) {
        let tempid = infiles[i].destination.split("/")[1];
        del("./upload/" + tempid);
    }
    item.storageID = data.itemid;
    item.save();
    await _updated(project);
    return modelid;    
};


exports.getUploadToken = async (name, size, project) => {
    let api_arg = { webhook: config.get('hc-caas-um.serverURI') + '/caas_um_api/webhook' };

    let res;
    try {
        res = await fetch(conversionServiceURI + '/api/uploadToken' + "/" + name, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
    } catch (error) {
        console.log(error);
        return { error: "Conversion Service can't be reached" };
    }
        let json = await res.json();
        const item = new files({
            name: name,
            converted: false,
            storageID: json.itemid,
            filesize: size,
            uploaded: new Date(),
            project: project
        });
        await item.save();
        await _updated(project);
        _checkPendingConversions();

        return { token: json.token, itemid: item._id.toString() };   
};

exports.getDownloadToken = async (itemid,type, project) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    let json;
    try {
        let res = await fetch(conversionServiceURI + '/api/downloadToken' + "/" +  item.storageID + "/" + type);     
        json = await res.json();  
    
        if (!json.error)
        {
            return {token:json.token};
        }
        else
        {
            return {error: json.error};
        }
    } catch (error) {
        console.log(error);
        return {error: "ERROR"};
    }
};

exports.processFromToken = async (itemid, project, startpath) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    console.log("processing:" + item.name);
    let api_arg  = {startPath:startpath};

    res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });

};

exports.generateCustomImage = async (itemid, project, startpath) => {

    let item = await files.findOne({ "_id": itemid, project: project });

    await item.save();
    console.log("processing custom image:" + item.name);
    let api_arg = { customImageCode: "let rmatrix = Communicator.Matrix.xAxisRotation(-90);await hwv.model.setNodeMatrix(hwv.model.getRootNode(), rmatrix);await hwv.view.fitWorld();" };
    res = await fetch(conversionServiceURI + '/api/customImage/' + item.storageID, { method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
    _updated(project);
};


exports.getModels = async (project) => {
    let models = await files.find({project:project});
    let res = [];
    for (let i = 0; i < models.length; i++) {
        res.push({ name: models[i].name, id: models[i]._id.toString(), pending: !models[i].converted, category:models[i].category,uploaded:models[i].uploaded, filesize:models[i].filesize});
    }
    let projectObj = await Projects.findOne({ "_id": project });
    return {"updated":projectObj.updatedAt, "modelarray":res};
};



exports.getSCS = async (itemid,project) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/scs");
    return await res.arrayBuffer();
};

exports.deleteModel = async (itemid, project) => {
    let item = await files.findOne({ "_id": itemid, project:project });
    if (item) {
        await files.deleteOne({ "_id": itemid });
        let items = await files.find({ "storageID": item.storageID });
        if (items.length == 0) {
            res = await fetch(conversionServiceURI + '/api/delete/' + item.storageID, { method: 'put'});
        }
        _updated(project);
    }
};

exports.getPNG = async (itemid, project) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/png");
    return await res.arrayBuffer();
};

exports.updateConversionStatus =  async (storageId, convertedFiles) => {
    let item = await files.findOne({ "storageID": storageId});

    _checkPendingConversions();
};


exports.getStreamingSession =  async () => {
    let res = await fetch(conversionServiceURI + '/api/streamingSession');
    let data = await res.json();
    return data;
};



exports.enableStreamAccess =  async (itemid, project, streamingSessionId) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    await fetch(conversionServiceURI + '/api/enableStreamAccess/' + streamingSessionId,{ method: 'put',headers:{'items':JSON.stringify([item.storageID])}});
};

var ONE_HOUR = 60 * 60 * 1000;

async function _checkPendingConversions() {
    let notConverted = await files.find({ "converted": false });

    for (let i = 0; i < notConverted.length; i++) {
        if (((new Date()) - notConverted[i].uploaded) > ONE_HOUR) {
            console.log("old");
            await files.deleteOne(notConverted[i]);
        }
        else {
            if (notConverted[i].storageID != "NONE") {
                try {
                    res = await fetch(conversionServiceURI + '/api/data' + "/" + notConverted[i].storageID);
                } catch (error) {
                    console.log("fetch error");
                } 
                const data = await res.json();
                if (data.error ==undefined) {
                    if (data.conversionState == "SUCCESS") {
                        notConverted[i].converted = true;
                        notConverted[i].save();
                        _updated(notConverted[i].project);
                    }
                    else if (data.conversionState.indexOf("ERROR") != -1) {
                        console.log(notConverted[i]._id);
                        await files.deleteOne(notConverted[i]);
                        _updated(notConverted[i].project);
                    }
                }
            }
        }
    }
}

async function _updated(project)
{
    let projectobj = await Projects.findOne({ "_id": project });
    projectobj.updatedAt = new Date();
    await projectobj.save();

}
