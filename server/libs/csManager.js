const fs = require('fs');
const del = require('del');
const files = require('../models/Files');
const Projects = require('../models/Projects');

const FormData = require('form-data');
let conversionServiceURI = "";

const config = require('config');
const caasClient = require('ts3d.hc.caas.api');

const stats = require('../models/Stats');

const startedAt = new Date();

exports.init = async (uri) =>
{
    conversionServiceURI = uri;

    caasClient.init(uri,{accessPassword:config.get('hc-caas-um.caasAccessPassword'),
    accessKey:config.get('hc-caas-um.caasAccessKey'),
         webhook:global.caas_um_publicip + '/caas_um_api/webhook'});

    let caasInfo = await caasClient.getInfo();
    console.log("Connected to CaaS. Version: " + caasInfo.version);
    
    _checkPendingConversions();      

    if (config.get('hc-caas-um.usePolling') == true ) {
        setInterval(_checkPendingConversions, 10000);
    }
};

exports.process = async (tempid, filename, project,startpath) => {

    let stats = fs.statSync(config.get('hc-caas-um.uploadDirectory') + "/" +  tempid + "/" + filename);
    const item = new files({
        name: filename,
        converted: false,
        storageID: "NONE",
        filesize: stats.size,
        uploaded: new Date(),   
        uploadDone: true,    
        project:project

    });
    await item.save();
    const modelid = item._id.toString();

    const data = await caasClient.uploadModelFromFile(config.get('hc-caas-um.uploadDirectory') + "/" +  tempid + "/" + filename, startpath);

    del(config.get('hc-caas-um.uploadDirectory') + "/" +  tempid, {force: true});
    item.storageID = data.itemid;
    item.save();
    await _updated(project);

    return modelid;    
};


exports.processMultiple = async (infiles, startmodel, project) => {

    let uploadFiles = [];    
    for (let i = 0; i < infiles.length; i++) {
        let tempid = infiles[i].destination.split("/").pop();
        uploadFiles.push(config.get('hc-caas-um.uploadDirectory') + "/" +  tempid + "/" + infiles[i].originalname);
    }

    const info = await caasClient.uploadModelFromFiles(uploadFiles, startmodel);

    const item = new files({
        name: startmodel,
        converted: false,
        storageID: "NONE",
        filesize: info.totalsize,
        uploaded: new Date(),       
        uploadDone: true,    
        project:project

    });
    await item.save();
    const modelid = item._id.toString();

    for (let i = 0; i < infiles.length; i++) {
        let tempid = infiles[i].destination.split("/")[1];
        del(config.get('hc-caas-um.uploadDirectory') + "/" + tempid, {force: true});
    }
    item.storageID = info.data.itemid;
    item.save();
    await _updated(project);
    return modelid;    
};

exports.createEmptyModel = async (name, size, startpath, project) => {

        let json = await caasClient.createEmptyModel(name, {startPath:startpath});
        const item = new files({
            name: name,
            converted: false,
            storageID: json.itemid,
            filesize: size,
            uploaded: new Date(),
            uploadDone: false,    
            project: project
        });
    await item.save();
    await _updated(project);
    _checkPendingConversions();
    return { itemid: item._id.toString() };
};

exports.getUploadToken = async (name, size, itemid, project) => {
    let existingItemId = undefined;
    if (itemid) {
        let item = await files.findOne({ "_id": itemid, project: project });
        existingItemId = item.storageID;
    }

    let json = await caasClient.getUploadToken(name, size, {storageid:existingItemId});

    if (!itemid) {
        const item = new files({
            name: name, converted: false, storageID: json.itemid,
            filesize: size, uploaded: new Date(), uploadDone: false, project: project
        });
        await item.save();
        await _updated(project);
        _checkPendingConversions();
        return { token: json.token, itemid: item._id.toString() };
    }
    else {
        return { token: json.token };
    }
};

exports.getDownloadToken = async (itemid, type, project) => {
    let item = await files.findOne({ "_id": itemid, project: project });
    try {
        let json = await caasClient.getDownloadToken(item.storageID, type);

        if (!json.error) {
            return { token: json.token };
        }
        else {
            return { error: json.error };
        }
    } catch (error) {
        console.log(error);
        return { error: "ERROR" };
    }
};

exports.processFromToken = async (itemid, project, startpath) => {
    let item = await files.findOne({ "_id": itemid, project:project});    
    item.uploadDone = true;
    item.save();
    console.log("processing:" + item.name);

    let json = await caasClient.reconvertModel(item.storageID, {startPath: startpath, multiConvert:item.name.indexOf(".zip") == -1 ? true : false});
    await _updated(project);
    return json;
};

exports.generateCustomImage = async (itemid, project, startpath) => {

    let item = await files.findOne({ "_id": itemid, project: project });
    await item.save();
    let json = await caasClient.createCustomImage(item.storageID, {customImageCode: "let rmatrix = Communicator.Matrix.xAxisRotation(-90);await hwv.model.setNodeMatrix(hwv.model.getRootNode(), rmatrix);await hwv.view.fitWorld();"});
    console.log("processing custom image:" + item.name);
    _updated(project);
};


exports.getModels = async (project) => {
    let models = await files.find({project:project});
    let res = [];
    for (let i = 0; i < models.length; i++) {
        if (models[i].uploadDone || models[i].uploadDone == undefined) {
            res.push({ name: models[i].name, id: models[i]._id.toString(), pending: !models[i].converted, category:models[i].category,uploaded:models[i].uploaded, filesize:models[i].filesize});
        }
    }
    let projectObj = await Projects.findOne({ "_id": project });
    if (projectObj) {
        return {"updated":projectObj.updatedAt, "modelarray":res};
    }
    else {
        console.log("getModels: Project does not exist");
        return {error: "Project does not exist"};
    }
};



exports.getSCS = async (itemid,project) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    return await caasClient.getFileByType(item.storageID,"scs"); 
};

exports.deleteModel = async (itemid, project, purgeFromCaaS = true) => {
    let item;
    if (project) {
        item = await files.findOne({ "_id": itemid, project:project });
    }
    else {
        item = await files.findOne({ "_id": itemid});
    }
    if (item) {
        await files.deleteOne({ "_id": itemid });
        let items = await files.find({ "storageID": item.storageID });
        if (items.length == 0 && purgeFromCaaS) {
            return await caasClient.deleteModel(item.storageID); 
        }
        if (project) {
            _updated(project);
        }
    }
};

exports.getPNG = async (itemid, project) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    return await caasClient.getFileByType(item.storageID,"png"); 
};

exports.updateConversionStatus =  async (storageId, convertedFiles) => {
    let item = await files.findOne({ "storageID": storageId});
    _checkPendingConversions();
};


exports.getStreamingSession =  async (geo, ssrEnabled = false) => {    
    let data =  await caasClient.getStreamingSession(geo ? geo.timezone : "",ssrEnabled ? "server" : undefined ); 
    data.ssrEnabled = (ssrEnabled && ((data.renderType == "server") || (data.renderType == "mixed")));
    return data;
};



exports.enableStreamAccess =  async (itemid, project, streamingSessionId) => {
    let item = await files.findOne({ "_id": itemid, project:project});
    if (item && item.storageID) {
        await caasClient.enableStreamAccess(streamingSessionId,[item.storageID]); 
        return item.name;
    }
    else {
        return "";
    }
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

                const data = await caasClient.getModelData(notConverted[i].storageID);
                if (data.ERROR) { console.log(data.ERROR); } 
            
                if (data.ERROR ==undefined) {
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

exports.createStatusPage = async () => {
    let data1 = await caasClient.getStatus(true);
    let s = await stats.find();
    let caasInfo  = await caasClient.getInfo();
    return(makeHTML(data1,s,caasInfo.version));

}

function formatUptime() {
    let current = new Date();
  
    let diffInMilliseconds = current - startedAt;
    let diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  
    let hours = Math.floor(diffInHours);
    let minutes = Math.floor((diffInHours - hours) * 60);
  
    return `${hours} Hours ${minutes} Minutes`;
  
  }
  
  function formatDate(date) {
      return new Date(date).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  
  
  // Generate the HTML page
  const makeHTML = (serverData, statsdata, caasVersion) => {
      const tableRows = serverData.map(row => {
        const statusClass = row.status === 'Offline' ? 'status-offline' : '';
        return `
            <tr>
              <td>${row.servername}</td>
              <td>${row.serveraddress}</td>
              <td>${row.type}</td>
              <td class="${statusClass}">${row.status}</td>
              <td>${row.lastAccess}</td>
            </tr>
          `;
      }).join('');
  
      const tableRows2 = statsdata.map(row => {
          return `
              <tr>
                <td>${row.Type}</td>
                <td>${row.From}</td>
                <td>${row.Value}</td>
                <td>${formatDate(row.createdAt)}</td>
              </tr>
            `;
        }).join('');
    
      const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Server Status</title>
              <style>
              .status-offline {
                background: red;
              }
              </style>
            </head>
            <body>
              <table>
                <thead>
                  <tr>
                    <th>Server Name</th>
                    <th>Server Address</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Last Access</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
              Uptime: ${formatUptime()}<br>
              CaaS Version: ${caasVersion}<br>
              CaasUM Version: ${process.env.caas_um_version}<br><br>
              Usage Info<br><br>
              <table>            
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Address</th>
                  <th>Info</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows2}
              </tbody>
            </table>
            </body>
          </html>
        `;
    
      return html;
    };