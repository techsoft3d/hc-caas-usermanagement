var csManagerClient = null;

class CsManagerClient {

    static msready() {
        csManagerClient = new CsManagerClient();
        csManagerClient.initialize();

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
        this._updatedTime = undefined;
        this._modelHash = [];


    }

    async initialize() {
        let _this = this;

        this._checkForNewModels();

        let rowMenu = [
            {
                label: "<i class='fas fa-user'></i> Delete",
                action: async function (e, row) {
                    let modelid = row.getData().id;
                    delete csManagerClient._modelHash[modelid];
                    _this.modelTable.deleteRow(modelid);
                    await myUserManagmentClient.deleteModel(modelid);
                }
            },
        ];

        this.modelTable = new Tabulator("#sidebar_modellist", {
            layout: "fitColumns",
            responsiveLayout: "hide",
            cellVertAlign: "middle",
            selectable: 1,
            rowContextMenu: rowMenu,
            rowClick: function (e, row) {
                var i = 0;

            },
            columns: [
                { title: "ID", field: "id", visible: false, sorter: "number", headerSort: false },
                { title: "", field: "image", formatter: "image", minWidth: 60, maxWidth: 60, responsive: 0, formatterParams: { width: "50px", height: "50px" } },
                { title: "Name", field: "name", formatter: "plaintext",vertAlign: "middle" },
                { title: "Created", field: "created", formatter: "datetime", responsive: 2,vertAlign: "middle" },
                {
                    title: "Size", field: "size", formatter: "money", responsive: 2, maxWidth: 80,vertAlign: "middle", formatterParams: {
                        decimal: ".",
                        thousand: "",
                        symbol: "MB",
                        symbolAfter: true,
                        precision: false
                    }
                }
            ],
        });

        this.modelTable.on("rowSelected", function(row){
            let data = row.getData();
            _this.loadModel(data.id);
        });
      
        setInterval(async function () {
            await _this._checkForNewModels();
        }, 2000);
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

    async _fetchImage(data) {
        let image;
        if (myUserManagmentClient.getUseDirectFetch()) {
            let json = myUserManagmentClient.getDownloadToken(data.id, "png");
            if (!json.error) {
                image = await fetch(json.token);
            }
        }
        else {
            image = await myUserManagmentClient.getPNG(data.id);
        }

        if (image) {
            let imageblob = await image.blob();
            let urlCreator = window.URL || window.webkitURL;
            let part = urlCreator.createObjectURL(imageblob);
            this._modelHash[data.id].image = part;
            this.modelTable.updateData([{ id: data.id, image: part }]);
        }
    }

    async _updateModelList(data) {
          

        for (var i = 0; i < data.length; i++) {
            let part = null;
            if (!data[i].pending && (!this._modelHash[data[i].id] || !this._modelHash[data[i].id].image)) {
                part = this._fetchImage(data[i]);
            }

            if (!this._modelHash[data[i].id]) {               
                this._modelHash[data[i].id] = { nodeid: null, name: data[i].name, image: part, filesize: data[i].filesize, uploaded: data[i].uploaded };
                this.modelTable.addData([{
                    id: data[i].id, name: this._modelHash[data[i].id].name, created: luxon.DateTime.fromISO(this._modelHash[data[i].id].uploaded),
                    image: this._modelHash[data[i].id].image ? this._modelHash[data[i].id].image : "app/images/spinner.gif", size: (this._modelHash[data[i].id].filesize / (1024 * 1024)).toFixed(2)
                }]);
            }
            else {
                if (!this._modelHash[data[i].id].image && part) {
                    this._modelHash[data[i].id].image = part;
                    this.modelTable.updateData([{ id: data[i].id, image: part }]);
                }
            }
        }    
    }
   
    async loadModel(modelid) {
        hwv.model.clear();
        if (this._modelHash[modelid].name.indexOf(".dwg")) {
            hwv.view.setAmbientOcclusionEnabled(false);
        }
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
            await hwv.model.loadSubtreeFromScsBuffer(hwv.model.getRootNode(), byteArray);
        }
        else {
            await myUserManagmentClient.enableStreamAccess(modelid);
            await hwv.model.loadSubtreeFromModel(hwv.model.getRootNode(), this._modelHash[modelid].name);
        }        
    }
}