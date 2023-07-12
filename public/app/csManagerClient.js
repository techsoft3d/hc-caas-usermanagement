var csManagerClient = null;
var myDropzone;
var checkForNewModelsPending = false;

function paramNameForSend() {
    return "files";
}

class CsManagerClient {

    static msready() {

        csManagerClient = new CsManagerClient();
        csManagerClient.initialize();

        let _this = csManagerClient;

        $("#uploadModal").on("hidden.bs.modal", function () {
            if (_this._zipViewActive) {
                myDropzone.removeAllFiles(true);
                _this.uploadTable.clearData();
                _this._zipViewActive = false;
            }
        });




        if (myUserManagmentClient.getUseDirectFetch()) {
            csManagerClient.setupDropzoneForDirectFetch();
        }
        else {
            csManagerClient.setupDropzone();
        }
      
        csManagerClient.uploadTable = new Tabulator("#uploadtable", {
            layout: "fitColumns",
            responsiveLayout: "hide",
            cellVertAlign: "middle",
            selectable: 1,
            rowClick: function (e, row) {
                var i = 0;

            },
            columns: [
                { title: "ID", field: "id", visible: false, sorter: "number", headerSort: false },
                {
                    title: "Progress", field: "progress", formatter: "progress", maxWidth: 80, formatterParams: {
                        legend: function (val) {
                            if (val > 0) {
                                return "";
                            }
                            else {
                                return "Pending";
                            }
                        }
                    }
                },
                { title: "Filename", field: "name", formatter: "plaintext" },
                { title: "Type", field: "type", formatter: "plaintext", maxWidth: 80 },
            ],
        });

        csManagerClient.zipTable = new Tabulator("#zipcontentdivtable", {
            layout: "fitColumns",
            responsiveLayout: "hide",
            cellVertAlign: "middle",
            selectable: 1,
            rowClick: function (e, row) {
                var i = 0;

            },
            columns: [
                { title: "Filename", field: "name", formatter: "plaintext", sorter: "string" },
                { title: "Type", field: "type", formatter: "plaintext", maxWidth: 80 },
            ],
        });

    }

    constructor() {
        this._updatedTime = undefined;
        this._modelHash = [];
    }

    async chooseZipContent(file, cb) {
        let _this = this;
        this._cb = cb;
        this._zipViewActive = true;
        this._zipFile = file;
        $("#standarduploaddiv").css('display', 'none');
        $("#dropzonewrapper").css('display', 'none');
        $("#zipcontentdiv").css('display', 'block');
        let entries = await (new zip.ZipReader(new zip.BlobReader(file))).getEntries();
        this.zipTable.clearData();

        for (let i = 0; i < entries.length; i++) {
            if (!entries[i].directory) {
                let firstDot = entries[i].filename.indexOf(".");
                let extension = "";
                if (firstDot != -1) {
                    extension = entries[i].filename.substring(firstDot + 1);
                }
                this.zipTable.addData([{ name: entries[i].filename, type: extension }]);
            }
        }
        this.zipTable.setSort([
            { column: "name", dir: "asc" }
        ]);

        let rows = this.zipTable.getRows();
        for (let i = 0; i < rows.length; i++) {

            if (rows[i].getPrevRow() == 0) {
                rows[i].select();
                break;
            }
        }
    }

    async zipFileSelected() {
        let selectedRows = this.zipTable.getSelectedRows();
        if (selectedRows.length == 1) {
            $("#standarduploaddiv").css('display', 'block');
            $("#zipcontentdiv").css('display', 'none');
            $("#dropzonewrapper").css('display', 'block');
            this.startPath = selectedRows[0].getData().name;
            this._zipViewActive = false;
            if (myUserManagmentClient.getUseDirectFetch()) {
                let json = await myUserManagmentClient.getUploadToken(this._zipFile.name, this._zipFile.size);
                this._zipFile.itemid = json.itemid;
                this._zipFile.signedRequest = json.token;
            }
            this._cb();
        }
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
            columns: [
                { title: "ID", field: "id", visible: false, sorter: "number", headerSort: false },
                { title: "", field: "image", formatter: "image", minWidth: 60, maxWidth: 60, responsive: 0, formatterParams: { width: "55px", height: "45px" } },
                { title: "Name", field: "name", formatter: "plaintext", vertAlign: "middle" },
                { title: "Created", field: "created", formatter: "datetime", responsive: 2, vertAlign: "middle" },
                {
                    title: "Size", field: "size", formatter: "money", responsive: 2, maxWidth: 80, vertAlign: "middle", formatterParams: {
                        decimal: ".",
                        thousand: "",
                        symbol: "MB",
                        symbolAfter: true,
                        precision: false
                    }
                }
            ],
        });

        this.modelTable.on("rowSelected", function (row) {
            let data = row.getData();
            _this.loadModel(data.id);
        });

        setInterval(async function () {
            await _this._checkForNewModels();
        }, 2000);
    }

    showUploadWindow() {

        $("#standarduploaddiv").css('display', 'block');
        $("#dropzonewrapper").css('display', 'block');
        $("#zipcontentdiv").css('display', 'none');
        let myModal = new bootstrap.Modal(document.getElementById('uploadModal'));
        // myDropzone.removeAllFiles(true);
        // this.uploadTable.clearData();

        myModal.toggle();
    }

  

    uploadAsAssemblyStartClicked() {
        myDropzone.processQueue();
    }


    hideUploadWindow() {
        $("#filedroparea").css("display", "none");
    }

    async _checkForNewModels() {

        if (checkForNewModelsPending) {
            return;
        }
        checkForNewModelsPending = true;
        let data = await myUserManagmentClient.getModels();
        checkForNewModelsPending = false;

        let newtime = Date.parse(data.updated);
        if (this._updatedTime == undefined || this._updatedTime != newtime) {
            await this._updateModelList(data.modelarray);
            this._updatedTime = newtime;
        }
    }

    async _fetchImage(data) {
        let image;
        if (myUserManagmentClient.getUseDirectFetch()) {
            let json = await myUserManagmentClient.getDownloadToken(data.id, "png");
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
                let json = await myUserManagmentClient.getDownloadToken(modelid, "scs");
                let res = await fetch(json.token);
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

    uploadAsAssemblyClicked() {
        if (myUserManagmentClient.getUseDirectFetch()) {
            if ($("#uploadAsAssemblycheck")[0].checked) {
                $("#assemblyuploadbutton").css('display', "block");
                myDropzone.options.autoProcessQueue = false;
                myDropzone.options.uploadMultiple = true;
                myDropzone.options.parallelUploads = 500;
                myDropzone.options.paramName = paramNameForSend;
                myDropzone.options.url = myUserManagmentClient.getUploadArrayURL();
            }
            else {
                $("#assemblyuploadbutton").css('display', "none");
                myDropzone.options.autoProcessQueue = true;
                myDropzone.options.uploadMultiple = false;
                myDropzone.options.parallelUploads = 3;
                myDropzone.options.paramName = "file";
                myDropzone.options.url = myUserManagmentClient.getUploadURL();
            }
        }
        else {
            if ($("#uploadAsAssemblycheck")[0].checked) {
                $("#assemblyuploadbutton").css('display', "block");
                myDropzone.options.autoProcessQueue = false;
                myDropzone.options.uploadMultiple = true;
                myDropzone.options.parallelUploads = 500;
                myDropzone.options.paramName = paramNameForSend;
                myDropzone.options.url = myUserManagmentClient.getUploadArrayURL();
            }
            else {
                $("#assemblyuploadbutton").css('display', "none");
                myDropzone.options.autoProcessQueue = true;
                myDropzone.options.uploadMultiple = false;
                myDropzone.options.parallelUploads = 3;
                myDropzone.options.paramName = "file";
                myDropzone.options.url = myUserManagmentClient.getUploadURL();
            }
        }

    }

    async setupDropzone() {
        let _this = this;
        myDropzone = new Dropzone("div#dropzonearea", {
            headers: { 'CSUM-API-SESSIONID': myUserManagmentClient.getSessionID() },
            url: myUserManagmentClient.getUploadURL(), maxFiles: 500, parallelUploads: 10, method: 'post', timeout: 180000, uploadMultiple: false, autoProcessQueue: true,
            addedfile: function (file) {
                let firstDot = file.name.indexOf(".");
                let extension = "";
                if (firstDot != -1) {
                    extension = file.name.substring(firstDot + 1);
                }
                _this.uploadTable.addData([{ id: file.upload.uuid, name: file.name, type: extension, progress: 0 }]);
            },
            uploadprogress: function (file, progress, bytesSent) {
                _this.uploadTable.updateData([{ id: file.upload.uuid, progress: progress }]);
            },
            accept: async function (file, cb) {
                if (file.name.indexOf(".zip") != -1) {

                    if (_this._zipViewActive) {
                        _this.uploadTable.deleteRow(file.upload.uuid);
                        myDropzone.removeFile(file);
                    }
                    else {
                        await _this.chooseZipContent(file, cb);
                    }
                }
                else {
                    cb();
                }
            },
        });
        myDropzone.on("success", async function (file, response) {
            _this.uploadTable.deleteRow(file.upload.uuid);
            myDropzone.removeFile(file);
        });

        myDropzone.on("successmultiple", async function (file, response) {
            _this.uploadTable.clearData();
        });

        myDropzone.on("sending", async function (file, response, request) {
            response.setRequestHeader('startpath', _this.startPath);
        });

        myDropzone.on("sendingmultiple", async function (file, response, request) {
            var selectedRows = _this.uploadTable.getSelectedRows();
            let name;
            if (selectedRows.length != 0) {
                name = selectedRows[0].getData().name;
            }
            else {
                name = _this.uploadTable.getRows()[0].getData().name;
            }
            response.setRequestHeader('startmodel', name);
        });
    }


    async setupDropzoneForDirectFetch() {
        let _this = this;
        myDropzone = new Dropzone("div#dropzonearea", {
            headers: { 'CSUM-API-SESSIONID': myUserManagmentClient.getSessionID() },
            url:  "#", maxFiles: 500, parallelUploads: 10, method: 'put', timeout: 180000, uploadMultiple: false, autoProcessQueue: false,
            addedfile: function (file) {
                let firstDot = file.name.indexOf(".");
                let extension = "";
                if (firstDot != -1) {
                    extension = file.name.substring(firstDot + 1);
                }
                _this.uploadTable.addData([{ id: file.upload.uuid, name: file.name, type: extension, progress: 0 }]);
            },
            uploadprogress: function (file, progress, bytesSent) {
                _this.uploadTable.updateData([{ id: file.upload.uuid, progress: progress }]);
            },
            accept: async function (file, cb) {
                if (file.name.indexOf(".zip") != -1) {

                    if (_this._zipViewActive) {
                        _this.uploadTable.deleteRow(file.upload.uuid);
                        myDropzone.removeFile(file);
                    }
                    else {
                        await _this.chooseZipContent(file, cb);
                    }
                }
                else {
                    let json = await myUserManagmentClient.getUploadToken(file.name, file.size);

                    file.itemid = json.itemid;
                    file.signedRequest = json.token;

                    cb();
                }
            },
            sending: function (file, xhr) {

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
             myUserManagmentClient.processUploadFromToken(file.itemid, _this.startPath);
            _this.uploadTable.deleteRow(file.upload.uuid);
            myDropzone.removeFile(file);
        });

        myDropzone.on("successmultiple", async function (file, response) {
            _this.uploadTable.clearData();
        });

        myDropzone.on("sending", async function (file, response, request) {

            response.setRequestHeader('startpath', _this.startPath);

        });

        myDropzone.on("sendingmultiple", async function (file, response, request) {
            var selectedRows = _this.uploadTable.getSelectedRows();
            let name;
            if (selectedRows.length != 0) {
                name = selectedRows[0].getData().name;
            }
            else {
                name = _this.uploadTable.getRows()[0].getData().name;
            }

            response.setRequestHeader('startmodel', name);
        });
    }
}
