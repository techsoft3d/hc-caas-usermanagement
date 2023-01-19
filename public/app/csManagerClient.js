var csManagerClient = null;

class CsManagerClient {

    static msready() {

        csManagerClient = new CsManagerClient();
        let myDropzone;
        if (!myAdmin.useDirectFetch) {

            myDropzone = new Dropzone("div#dropzonearea", { url: serveraddress + "/api/upload", timeout: 180000 });
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

                    var params = {
                        fileName: file.name,
                        fileType: file.type,
                    };

                    let data = await fetch(serveraddress + '/caas_ac_api/uploadToken/' + file.name + "/" + file.size);
                    
                    let json = await data.json();

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
                fetch(serveraddress + '/caas_ac_api/processToken/' + file.itemid, { method: 'PUT',headers: {'startpath': $("#modelpath").val()} });

                myDropzone.removeFile(file);
            });

        }

    }

    constructor() {
        var _this = this;
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
        var _this = this;

        var res = await fetch(serveraddress + '/caas_ac_api/models');
        var data = await res.json();

        var newtime = Date.parse(data.updated);
        if (this._updatedTime == undefined || this._updatedTime != newtime)
        {
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
                if (myAdmin.useDirectFetch) {
                    let res = await fetch(serveraddress + '/caas_ac_api/downloadToken/' + data[i].id + "/" + "png");
                    let json = await res.json();
                    if (!json.error) {

                        image = await fetch(json.token);
                    }
                }
                else {

                    image = await fetch(serveraddress + '/caas_ac_api/png/' + data[i].id);
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
                this._modelHash[data[i].id].hasStep  = data[i].hasStep;
                this._modelHash[data[i].id].hasFBX  = data[i].hasFBX;
                this._modelHash[data[i].id].hasHSF  = data[i].hasHSF;
                this._modelHash[data[i].id].hasGLB  = data[i].hasGLB;
                this._modelHash[data[i].id].hasXML  = data[i].hasXML;
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
            if (this._modelHash[i].filesize)
                html += '<span class="modelcard_size">Size:' + (this._modelHash[i].filesize / (1024 * 1024)).toFixed(2) + 'MB</span><br>';
            else
                html += '<span class="modelcard_size">Size:n/a</span><br>';
            if (this._modelHash[i].uploaded)
                html += '<span class="modelcard_size">Uploaded:' + moment(this._modelHash[i].uploaded).format("MM/DD/YYYY h:mm:ss a") + '</span>';
            else
                html += '<span class="modelcard_size">Uploaded:n/a</span>';
            html += "</div>";
            html += '<label class="switch">';
            if (this._modelHash[i].nodeid)
            {
                html += '<input type="checkbox" checked onclick=\'csManagerClient.addModel(this,"' + i + '")\'><span class="slider round"></span></label>';
            }
            else
            {
                html += '<input type="checkbox" onclick=\'csManagerClient.addModel(this,"' + i + '")\'><span class="slider round"></span></label>';
            }
            html += '<button id="modelmenubutton_' + i + '" class="modelmenubutton"><i style="pointer-events:none" class="bx bx-dots-vertical"></i></button>';

            html += "</div>";
        }
        html += "</div>";

        $("#" + targetdiv).append(html);

        var viewermenu = [
            {
                name: 'Generate STEP',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];
                   
                    await fetch(serveraddress + '/caas_ac_api/generateStep/' + modelid, { method: 'PUT'});
                }
            },
            {
                name: 'Generate XML',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];
                   
                    await fetch(serveraddress + '/caas_ac_api/generateXML/' + modelid, { method: 'PUT'});
                }
            },
            {
                name: 'Generate GLB',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];
                   
                    await fetch(serveraddress + '/caas_ac_api/generateGLB/' + modelid, { method: 'PUT'});
                }
            },
            {
                name: 'Download STEP',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/step/' + modelid);
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);

                    csManagerClient._exportToFile(byteArray, csManagerClient._modelHash[modelid].name + ".step");
                   

                }
            },
            {
                name: 'Download XML',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/xml/' + modelid);
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);
                    csManagerClient._exportToFile(byteArray, csManagerClient._modelHash[modelid].name + ".xml");                   
                }
            },
            {
                name: 'Download GLB',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/glb/' + modelid);
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);
                    csManagerClient._exportToFile(byteArray, csManagerClient._modelHash[modelid].name + ".glb");                   
                }
            },
            {
                name: 'Download SCS',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/scs/' + modelid);
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);

                    csManagerClient._exportToFile(byteArray, csManagerClient._modelHash[modelid].name + ".scs");
                   

                }
            },
            {
                name: 'Generate Custom Image',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/customImage/' + modelid, { method: 'PUT'});
                                     
                }
            },
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
                    await fetch(serveraddress + '/caas_ac_api/deleteModel/' + modelid, { method: 'PUT'});

                }
            },
            {
                name: 'Generate HSF',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];
                   
                    await fetch(serveraddress + '/caas_ac_api/generateHSF/' + modelid, { method: 'PUT'});
                }
            },
            {
                name: 'Download HSF',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/hsf/' + modelid);
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);
                    csManagerClient._exportToFile(byteArray, csManagerClient._modelHash[modelid].name + ".hsf");                   
                }
            },
            {
                name: 'Generate FBX',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];
                   
                    await fetch(serveraddress + '/caas_ac_api/generateFBX/' + modelid, { method: 'PUT'});
                }
            },
            {
                name: 'Download FBX',
                fun: async function (item) {
                    let modelid = item.trigger[0].id.split("_")[1];

                    let res = await fetch(serveraddress + '/caas_ac_api/fbx/' + modelid);
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);
                    csManagerClient._exportToFile(byteArray, csManagerClient._modelHash[modelid].name + ".fbx");                   
                }
            },
        ];

        $("[id^=modelmenubutton]").each(function (index) {
            let modelid = this.id.split("_")[1];
            let item = csManagerClient._modelHash[modelid];
            let newViewerMenu = [viewermenu[6],viewermenu[7],viewermenu[8]];
            if (item.hasStep == "true")
            {
                newViewerMenu.unshift(viewermenu[3]);
            }        
            else if (!item.hasStep || item.hasStep == "false")
            {
                newViewerMenu.unshift(viewermenu[0]);
            }

            if (item.hasXML && item.hasXML == "true")
            {
                newViewerMenu.unshift(viewermenu[4]);
            }        
            else if (!item.hasXML || item.hasXML == "false")
            {
                newViewerMenu.unshift(viewermenu[1]);
            }

            
            if (item.hasGLB && item.hasGLB == "true")
            {
                newViewerMenu.unshift(viewermenu[5]);
            }        
            else if (!item.hasGLB || item.hasGLB == "false")
            {
                newViewerMenu.unshift(viewermenu[2]);
            }

            if (item.hasHSF && item.hasHSF == "true")
            {
                newViewerMenu.unshift(viewermenu[10]);
            }        
            else if (!item.hasHSF || item.hasHSF == "false")
            {
                newViewerMenu.unshift(viewermenu[9]);
            }
            if (item.hasFBX && item.hasFBX == "true")
            {
                newViewerMenu.unshift(viewermenu[12]);
            }        
            else if (!item.hasFBX || item.hasFBX == "false")
            {
                newViewerMenu.unshift(viewermenu[11]);
            }

            $(this).contextMenu("menu", newViewerMenu, {
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
                if (numberchecked == 0)
                {
                    hwv.model.clear();
                }

                let res;
                if (!myAdmin.useStreaming) {
                    if (myAdmin.useDirectFetch) {
                        res = await fetch(serveraddress + '/caas_ac_api/downloadToken/' + modelid + "/" + "scs");
                        let json = await res.json();
                        res = await fetch(json.token);
                    }
                    else {
                        res = await fetch(serveraddress + '/caas_ac_api/scs/' + modelid);
                    }
                    let ab = await res.arrayBuffer();
                    let byteArray = new Uint8Array(ab);

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
                else
                {
                    res = await fetch(serveraddress + '/caas_ac_api/enableStreamAccess/' + modelid,{ method: 'PUT' });
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
            else
            {
                hwv.model.clear();
            }
            this._modelHash[modelid].nodeid = null;
        }
    }

    _exportToFile(data, filename) {

        function _makeBinaryFile(text) {
            let data = new Blob([text],  {type: "application/octet-stream"});           
            let file = window.URL.createObjectURL(data);
        
            return file;
          }

      
        let link = document.createElement('a');
        link.setAttribute('download', filename);
        link.href = _makeBinaryFile(data);
        document.body.appendChild(link);

        window.requestAnimationFrame(function () {
            let event = new MouseEvent('click');
            link.dispatchEvent(event);
            document.body.removeChild(link);
        });
    }              

}