class AdminProject {

    constructor() {
   
        this._userhash = [];
        this._projectusertable = null;
        this._loadProjectCallback = null;
    }

    setLoadProjectCallback(loadprojectcallback)
    {
        this._loadProjectCallback = loadprojectcallback;
    }

    async handleProjectSwitch()
    {
        await myCaaSAC.leaveProject();
        window.location.reload(true); 

    }

    
    handleNewProjectDialog() {
        let myModal = new bootstrap.Modal(document.getElementById('newprojectModal'));
        myModal.toggle();
    }


    async renameProject() {
        await myCaaSAC.renameProject(this.editProject.id, $("#editProjectName").val());
    }

    async newProject() {
        let data = await myCaaSAC.createProject($("#newProjectName").val());
        this.loadProject(data.projectid);
    }


    async deleteProject() {
         $('#chooseprojectModal').modal('hide');
        await myCaaSAC.deleteProject($("#projectselect").val());
        this.handleProjectSelection();
    }

    

    async loadProject(projectid) {
       
        await myCaaSAC.loadProject(projectid);

        $(".projectname").empty();
        $(".projectname").append(myCaaSAC.getCurrentProject());  

        myAdmin._updateUI();
        $(".modal-backdrop").remove();
        if (this._loadProjectCallback) {
            this._loadProjectCallback();
        }
    }

    async loadProjectFromDialog() {
        await this.loadProject($("#projectselect").val());
    }

    async handleProjectSelection() {
      
        let myModal = new bootstrap.Modal(document.getElementById('chooseprojectModal'));
        myModal.toggle();
        let models =  await myCaaSAC.getProjects();

        $("#projectselect").empty();
        var html = "";
        for (var i = 0; i < models.length; i++) {
            let cm = models[i];
            html += '<option value="' + cm.id + '">' + cm.name + '</option>';
        }
        $("#projectselect").append(html);

    }


    async refreshProjectTable() {
        this._projectusertable.clearData();

        let users = await myCaaSAC.getProjectUsers(this.editProject.id);

        for (let i = 0; i < users.length; i++) {

            let prop = { id: i, email: users[i].email, role: users[i].role, edit:false};

            this._projectusertable.addData([prop], false);
        }

        this._projectusertable.redraw();

    }

    async _acceptEdit(event) {
        let id = event.currentTarget.id.split("-")[1];
        let email = this._projectusertable.getRow(id).getCell("email").getValue();
        let role = this._projectusertable.getRow(id).getCell("role").getValue();


        let projectusers = await myCaaSAC.getProjectUsers(this.editProject.id);

        let isUser = false;
        for (let i = 0; i < projectusers.length; i++) {
            if (projectusers[i].email == email) {
                isUser = true;
                break;
            }
        }
        if (!isUser) {
            await myCaaSAC.addProjectUser(this.editProject.id, email, role);
        }
        else
        {
            await myCaaSAC.updateProjectUser(this.editProject.id, email, role);
        }

        this._projectusertable.getRow(id).getCell("edit").setValue(false);
        this.refreshProjectTable();
    }
    
    async _deleteUserFromProject(event) {
        let id = event.currentTarget.id.split("-")[1];
        let email = this._projectusertable.getRow(id).getCell("email").getValue();
        await myCaaSAC.deleteProjectUser(this.editProject.id, email);
        this.refreshProjectTable();
    }

    addUserToProject()
    {
        let prop = {id:this._projectusertable.getData().length,email:"", role:"Viewer", edit:true};

        this._projectusertable.addData([prop], false);
        this._projectusertable.redraw();
    }

    _discardEdit(event) {
        let id = event.currentTarget.id.split("-")[1];
        this._projectusertable.getRow(id).getCell("edit").setValue(false);
        this.refreshProjectTable();
    }

    _enableEdit(event) {
        let id = event.currentTarget.id.split("-")[1];
        this._projectusertable.getRow(id).getCell("edit").setValue(true);
    }


    async handleEditProjectDialog() {

        this.editProject = {id:$("#projectselect").val(), name:$("#projectselect option:selected").text()};

        $("#editProjectName").val(this.editProject.name);
        let myModal = new bootstrap.Modal(document.getElementById('editProjectModal'));


        let hubusers = await myCaaSAC.getHubUsers(myCaaSAC.getCurrentHub().id);
        this._userhash = [];
        let emaillist  = [];
        for (let i=0; i<hubusers.length; i++) {
            this._userhash[hubusers[i].email] = hubusers[i];
            emaillist.push(hubusers[i].email);
        }

        let _this = this;
        this._projectusertable = new Tabulator("#projectuserstab", {
            layout: "fitColumns",
            selectable: 0,
            columns: [
                {
                    title: "ID", field: "id", width: 60
                },              
                {
                    title: "", width: 150, field: "edit", formatter: function (cell, formatterParams, onRendered) {
                        onRendered(function () {
                            _this._renderEditCell(cell);
                        });
                    },
                },              
                {  
                    title: "User", field: "email", editor: "select", editable:this._editCheck, editorParams: { values: emaillist }
                },
                {
                    title: "Role", field: "role", width: 90, editor: "select", editable:this._editCheck, editorParams: { values: ["Editor", "Viewer"] }
                },

            ],
        });

        this._projectusertable.on("tableBuilt", function (e, row) {
            _this.refreshProjectTable();
        });
    
        myModal.toggle();
    }

    _renderEditCell(cell) {
        let _this = this;
        
        let content = "";
        let editable = cell.getValue();

        let rowdata = cell.getRow().getData();

        if (rowdata.role == "Owner") {
            return;
        }
     

        content += '<div style="height:20px">';
        
        if (editable)
        {
            content += '<button id="epc_accept-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-check"></i></button>';
            content += '<button id="epc_cancel-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-x"></i></button>';
        }
        else
        {
            content += '<button id="epc_edit-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-edit"></i></button>';
            content += '<button id="epc_delete-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-trash"></i></button>';

        }

        content += '</div>';
        $(cell.getElement()).append(content);
        $("#epc_accept-" + cell.getData().id).on("click", function (event) { _this._acceptEdit(event); });
        $("#epc_edit-" + cell.getData().id).on("click", function (event) { _this._enableEdit(event); });
         $("#epc_cancel-" + cell.getData().id).on("click", function (event) { _this._discardEdit(event); });
         $("#epc_delete-" + cell.getData().id).on("click", function (event) { _this._deleteUserFromProject(event); });
        // this._updateCellStyle(cell.getData().id);        
    }

    _editCheck(cell) {
        let row = cell.getRow();
        let data = row.getData();
        return data.edit;
    }

}