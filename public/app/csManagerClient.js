var csManagerClient = null;

class CsManagerClient {

    static msready() {
        csManagerClient = new CsManagerClient();
        let myDropzone;
        if (!myUserManagmentClient.getUseDirectFetch()) {

            myDropzone = new Dropzone("div#dropzonearea", { url: myUserManagmentClient.getUploadURL(), timeout: 180000 });
            myDropzone.on("success", async function (file, response) {
                myDropzone.removeFile(file);
            });       

            myDropzone.on("sending", async function (file, response, request) {
                response.setRequestHeader('startpath', $("#modelpath").val());
            });
        }
        else {
            myDropzone = new Dropzone("div#dropzonearea", {
                url: "#", timeout: 180000, method: "PUT",
                accept: async function (file, cb) {
                    let json = await myUserManagmentClient.getUploadToken(file.name,file.size);
                    
                    file.itemid = json.itemid;
                    file.signedRequest = json.token;
                    cb();

                }, sending: function (file, xhr) {

                    console.log('sending');
                    var _send = xhr.send;
                    //            xhr.setRequestHeader('x-amz-acl', 'public-read');
                    xhr.send = function () {
                        _send.call(xhr, file);
                    };
                },
                processing: function (file) {
                    this.options.url = file.signedRequest;
                }

            });

            myDropzone.on("success", async function (file, response) {
                myUserManagmentClient.processUploadFromToken(file.itemid,$("#modelpath").val());
                myDropzone.removeFile(file);
            });
        }
    }

    constructor() {
        let _this = this;
        this._updatedTime = undefined;
        this._modelHash = [];

        this._checkForNewModels();

        setInterval(async function () {
            await _this._checkForNewModels();
        }, 3000);
    }

    showUploadWindow() {
        $("#filedroparea").css("display", "block");
    }

    hideUploadWindow() {
        $("#filedroparea").css("display", "none");
    }

    async _checkForNewModels() {
        let data = await myUserManagmentClient.getModels();

        let newtime = Date.parse(data.updated);
        if (this._updatedTime == undefined || this._updatedTime != newtime) {
            await this._updateModelList(data.modelarray);
            this._updatedTime = newtime;
        }
    }

    async _updateModelList(data) {
      
        for (var i = 0; i < data.length; i++) {
            var part;
            var file = data[i].name.split(".")[0];
            if (!data[i].pending) {
                let image = null;
                if (myUserManagmentClient.getUseDirectFetch()) {
                    let json = myUserManagmentClient.getDownloadToken(data[i].id, "png");
                    if (!json.error) {
                        image = await fetch(json.token);
                    }
                }
                else {
                    image = await myUserManagmentClient.getPNG(data[i].id);
                }

                if (image && image.status == 200) {
                    let imageblob = await image.blob();
                    let urlCreator = window.URL || window.webkitURL;
                    part = urlCreator.createObjectURL(imageblob);
                }
            }
            else
                part = "app/images/spinner.gif";

            if (part) {
                if (!this._modelHash[data[i].id]) {
                    this._modelHash[data[i].id] = { nodeid: null, name: data[i].name,image: part, filesize: data[i].filesize, uploaded: data[i].uploaded};
                }
                this._modelHash[data[i].id].image = part;
            }
        }
        this._drawModelList("sidebar_modellist");
    }

    async _drawModelList(targetdiv) {

        $("[id^=modelmenubutton]").each(function (index) {
            $(this).contextMenu("destroy");
        });

        var html = "";
        $("#" + targetdiv).empty();
        html += '<button onclick=\'csManagerClient.showUploadWindow()\' class="bcfbutton fileUploadButton"><i class="bx bx-upload"></i></button>';
        html += '<div style="top:40px;position:relative;">';

        for (var i in this._modelHash) {
            html += '<div id="' + i + '" class = "modelcard">';
            if (this._modelHash[i].image.indexOf("spinner.gif") != -1)
                html += '<img src="' + this._modelHash[i].image + '" class="modelcard_imagespinner"></img>';
            else
                html += '<img src="' + this._modelHash[i].image + '" class="modelcard_image"></img>';
            html += '<div class="modelcard_info">';
            html += '<span class="modelcard_title">' + this._modelHash[i].name + '</span><br>';
            if (this._modelHash[i].filesize) {
                html += '<span class="modelcard_size">Size:' + (this._modelHash[i].filesize / (1024 * 1024)).toFixed(2) + 'MB</span><br>';
            }
            else {
                html += '<span class="modelcard_size">Size:n/a</span><br>';
            }
            if (this._modelHash[i].uploaded) {
                html += '<span class="modelcard_size">Uploaded:' + moment(this._modelHash[i].uploaded).format("MM/DD/YYYY h:mm:ss a") + '</span>';
            }
            else {
                html += '<span class="modelcard_size">Uploaded:n/a</span>';
            }
            html += "</div>";
            html += '<label class="switch">';
            if (this._modelHash[i].nodeid) {
                html += '<input type="checkbox" checked onclick=\'csManagerClient.addModel(this,"' + i + '")\'><span class="slider round"></span></label>';
            }
            else {
                html += '<input type="checkbox" onclick=\'csManagerClient.addModel(this,"' + i + '")\'><span class="slider round"></span></label>';
            }
            html += '<button id="modelmenubutton_' + i + '" class="modelmenubutton"><i style="pointer-events:none" class="bx bx-dots-vertical"></i></button>';
            html += "</div>";
        }
        html += "</div>";
        $("#" + targetdiv).append(html);

        let viewermenu = [                    
            {
                name: 'Delete',
                fun: async function (item) {
                    //csManagerClient
                    let modelid = item.trigger[0].id.split("_")[1];

                    if (csManagerClient._modelHash[modelid].nodeid != null) {
                        hwv.model.deleteNode(csManagerClient._modelHash[modelid].nodeid);
                        csManagerClient._modelHash[modelid].nodeid = null;
                    }
                    delete csManagerClient._modelHash[modelid];
                    await myUserManagmentClient.deleteModel(modelid);

                }
            }  
        ];

        $("[id^=modelmenubutton]").each(function (index) {
            let modelid = this.id.split("_")[1];
            let item = csManagerClient._modelHash[modelid];
          
            $(this).contextMenu("menu", viewermenu, {
                'displayAround': 'trigger',
                'position': 'bottom',
                verAdjust: 0,
                horAdjust: 0
            });
        });
    }

    async addModel(o, modelid) {
        if (o.checked) {
            if (this._modelHash[modelid].nodeid == null) {
                let numberchecked = 0;
                for (var i in this._modelHash) {
                    if (this._modelHash[i].nodeid != null) {
                        numberchecked++;
                    }
                }
                if (numberchecked == 0) {
                    hwv.model.clear();
                }
                let res;
                if (!myUserManagmentClient.getUseStreaming()) {
                    let byteArray;
                    if (myUserManagmentClient.getUseDirectFetch()) {
                        let json = myUserManagmentClient.getDownloadToken(modelid, "scs");
                        res = await fetch(json.token);
                        let ab = await res.arrayBuffer();
                        byteArray = new Uint8Array(ab);
                    }
                    else {
                        byteArray = await myUserManagmentClient.getSCS(modelid);
                    }

                    if (this._modelHash[modelid].name.indexOf(".dwg") != -1 && numberchecked == 0) {
                        hwv.view.setAmbientOcclusionEnabled(false);
                        await hwv.model.loadSubtreeFromScsBuffer(hwv.model.getRootNode(), byteArray);
                        this._modelHash[modelid].nodeid = hwv.model.getRootNode();
                    }
                    else {
                        hwv.view.setAmbientOcclusionEnabled(true);
                        let modelnode = hwv.model.createNode(modelid);
                        await hwv.model.loadSubtreeFromScsBuffer(modelnode, byteArray);
                        this._modelHash[modelid].nodeid = modelnode;
                    }
                }
                else {
                    await myUserManagmentClient.enableStreamAccess(modelid);
                    let modelnode = hwv.model.createNode(modelid);
                    await hwv.model.loadSubtreeFromModel(modelnode,this._modelHash[modelid].name);
                    this._modelHash[modelid].nodeid = modelnode;
                }
            }
        }
        else {           
            if (this._modelHash[modelid].nodeid != hwv.model.getRootNode()) {            
                hwv.model.deleteNode(this._modelHash[modelid].nodeid);
            }
            else {
                hwv.model.clear();
            }
            this._modelHash[modelid].nodeid = null;
        }
    }
}