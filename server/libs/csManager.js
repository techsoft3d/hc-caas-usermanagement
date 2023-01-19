const fsp = require('fs').promises;
const fs = require('fs');
const del = require('del');
const CsFiles = require('../models/csFiles');

const FormData = require('form-data');
const fetch = require('node-fetch');

let conversionServiceURI = "";
let _updatedTime = new Date();

exports.init = (uri) =>
{
    conversionServiceURI = uri;
    _checkPendingConversions();      
};

exports.process = async (tempid, filename, project,startpath) => {

    let stats = fs.statSync("./csmodelupload/" + tempid + "/" + filename);
    const item = new CsFiles({
        name: filename,
        converted: false,
        storageID: "NONE",
        filesize: stats.size,
        uploaded: new Date(),
        hasSTEP: "false",
        hasFBX: "false",
        hasHSF: "false",
        hasGLB: "false",
        hasXML: "false",
        project:project

    });
    await item.save();
    const modelid = item._id.toString();

    let form = new FormData();
    form.append('file', fs.createReadStream("./csmodelupload/" + tempid + "/" + filename));

//    let api_arg  = {webhook:"http://localhost:3000" + '/api/webhook',conversionCommandLine:["--output_scs","","--output_png","","background_color","0,0,0","--output_step",""] };
    let api_arg  = {webhook:"http://localhost:3000" + '/api/webhook', startPath:startpath};
        
    res = await fetch(conversionServiceURI + '/api/upload', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
    const data = await res.json();

    del("./csmodelupload/" + tempid);
    item.storageID = data.itemid;
    item.save();
    _updated();

    return modelid;
    
};

exports.getUploadToken = async (name, size, project) => {
    let api_arg = { webhook: "http://localhost:3000" + '/api/webhook' };

    let res;
    try {
        res = await fetch(conversionServiceURI + '/api/uploadToken' + "/" + name, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
    } catch (error) {
        console.log(error);
        return { error: "Conversion Service can't be reached" };
    }
        let json = await res.json();
        const item = new CsFiles({
            name: name,
            converted: false,
            storageID: json.itemid,
            filesize: size,
            uploaded: new Date(),
            hasSTEP: "false",
            hasFBX: "false",
            hasHSF: "false",
            hasGLB: "false",
            hasXML: "false",
            project: project
        });
        await item.save();
        _updated();
        _checkPendingConversions();

        return { token: json.token, itemid: item._id.toString() };   
};

exports.getDownloadToken = async (itemid,type, project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
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
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    console.log("processing:" + item.name);
    let api_arg  = {startPath:startpath};

    res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });

};


exports.generateSTEP = async (itemid, project, startpath) => {
    
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    if (item.hasSTEP == "false")
    {
        item.hasSTEP = "pending";
        await item.save();
        console.log("processing STEP:" + item.name);
        let api_arg  = {conversionCommandLine:["--output_step",""] };            
        res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
         _updated();

    }

};



exports.generateFBX = async (itemid, project, startpath) => {
    
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    if (item.hasFBX == "false")
    {
        item.hasFBX = "pending";
        await item.save();
        console.log("processing FBX:" + item.name);
        let api_arg  = {conversionCommandLine:["--output_fbx",""] };            
        res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
         _updated();

    }

};



exports.generateHSF = async (itemid, project, startpath) => {
    
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    if (item.hasHSF == "false")
    {
        item.hasHSF = "pending";
        await item.save();
        console.log("processing HSF:" + item.name);
        let api_arg  = {conversionCommandLine:["--output_hsf",""] };            
        res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
         _updated();

    }
};




exports.generateGLB = async (itemid, project, startpath) => {
    
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    if (item.hasGLB == "false")
    {
        item.hasGLB = "pending";
        await item.save();
        console.log("processing GLB:" + item.name);
        let api_arg  = {conversionCommandLine:["--output_glb",""] };            
        res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
         _updated();

    }

};



exports.generateCustomImage = async (itemid, project, startpath) => {

    let item = await CsFiles.findOne({ "_id": itemid, project: project });

    await item.save();
    console.log("processing custom image:" + item.name);
    let api_arg = { customImageCode: "let rmatrix = Communicator.Matrix.xAxisRotation(-90);await hwv.model.setNodeMatrix(hwv.model.getRootNode(), rmatrix);await hwv.view.fitWorld();" };
    res = await fetch(conversionServiceURI + '/api/customImage/' + item.storageID, { method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
    _updated();
};


exports.generateXML = async (itemid, project, startpath) => {
    
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    if (!item.hasXML || item.hasXML == "false")
    {
        item.hasXML = "pending";
        await item.save();
        console.log("processing XML:" + item.name);
        let api_arg  = {conversionCommandLine:["--output_xml_assemblytree","","--sc_export_attributes","1"] };            
        res = await fetch(conversionServiceURI + '/api/reconvert/' + item.storageID, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
         _updated();

    }

};

exports.getModels = async (project) => {
    let models = await CsFiles.find({project:project});
    let res = [];
    for (let i = 0; i < models.length; i++) {
        res.push({ name: models[i].name, id: models[i]._id.toString(), pending: !models[i].converted, category:models[i].category,uploaded:models[i].uploaded, filesize:models[i].filesize, hasStep:models[i].hasSTEP,
            hasXML:models[i].hasXML,hasGLB:models[i].hasGLB,hasHSF:models[i].hasHSF,hasFBX:models[i].hasFBX});
    }
    return {"updated":_updatedTime.toString(), "modelarray":res};
};

exports.getSTEP = async (itemid,project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/step");
    return await res.arrayBuffer();
};


exports.getFBX = async (itemid,project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/fbx");
    return await res.arrayBuffer();
};

exports.getGLB = async (itemid,project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/glb");
    return await res.arrayBuffer();
};



exports.getHSF = async (itemid,project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/hsf");
    return await res.arrayBuffer();
};


exports.getXML = async (itemid,project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/xml");
    return await res.arrayBuffer();
};


exports.getSCS = async (itemid,project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/scs");
    return await res.arrayBuffer();
};

exports.deleteModel = async (itemid, project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project });
    res = await fetch(conversionServiceURI + '/api/delete/' + item.storageID, { method: 'put'});
    await CsFiles.deleteOne({ "_id": itemid });
    _updated();
};

exports.getPNG = async (itemid, project) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    let res = await fetch(conversionServiceURI + '/api/file/' + item.storageID + "/png");
    return await res.arrayBuffer();
};

exports.updateConversionStatus =  async (storageId, files) => {
    let item = await CsFiles.findOne({ "storageID": storageId});

    if (files && (item.hasSTEP == "pending" || item.hasXML == "pending" || item.hasGLB == "pending" || item.hasHSF == "pending" || item.hasFBX == "pending"))
    {
        for (let i=0;i<files.length;i++)
        {
            if (files[i].indexOf(".step") !=-1)
            {
                item.hasSTEP = "true";
                await item.save();
                _updated();
            }

            if (files[i].indexOf(".fbx") !=-1)
            {
                item.hasFBX = "true";
                await item.save();
                _updated();
            }
            
            if (files[i].indexOf(".xml") !=-1)
            {
                item.hasXML = "true";
                await item.save();
                _updated();
            }
            if (files[i].indexOf(".glb") !=-1)
            {
                item.hasGLB = "true";
                await item.save();
                _updated();
            }

            if (files[i].indexOf(".hsf") !=-1)
            {
                item.hasHSF = "true";
                await item.save();
                _updated();
            }
        }
    }
    _checkPendingConversions();
};


exports.getStreamingSession =  async () => {
    let res = await fetch(conversionServiceURI + '/api/streamingSession');
    let data = await res.json();
    return data;
};



exports.enableStreamAccess =  async (itemid, project, streamingSessionId) => {
    let item = await CsFiles.findOne({ "_id": itemid, project:project});
    await fetch(conversionServiceURI + '/api/enableStreamAccess/' + streamingSessionId,{ method: 'put',headers:{'items':JSON.stringify([item.storageID])}});
};

var ONE_HOUR = 60 * 60 * 1000;

async function _checkPendingConversions() {
    let notConverted = await CsFiles.find({ "converted": false });

    for (let i = 0; i < notConverted.length; i++) {
        if (((new Date()) - notConverted[i].uploaded) > ONE_HOUR) {
            console.log("old");
            await CsFiles.deleteOne(notConverted[i]);
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
                        _updated();
                    }
                    else if (data.conversionState.indexOf("ERROR") != -1) {
                        console.log(notConverted[i]._id);
                        await CsFiles.deleteOne(notConverted[i]);
                        _updated();
                    }
                }
            }
        }
    }
}

function _updated()
{
    _updatedTime = new Date();
}
