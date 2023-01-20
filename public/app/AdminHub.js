class AdminHub {

    constructor() {
   
        this._hubusertable = null;
       

    }
    async handleHubSwitch()
    {
        myCaaSAC.leaveHub();
        window.location.reload(true); 

    }


    async loadHubFromDialog() {
        await this.loadHub($("#hubselect").val());
    }

    async handleHubSelection() {
      
        let myModal = new bootstrap.Modal(document.getElementById('choosehubModal'));
        myModal.toggle();
        let models = await myCaaSAC.getHubs();

        $("#hubselect").empty();
        var html = "";
        for (var i = 0; i < models.length; i++) {
            let cm = models[i];
            html += '<option value="' + cm.id + '">' + cm.name + '</option>';
        }
        $("#hubselect").append(html);

    }

    
    async renameHub() {
        myCaaSAC.renameHub(this.editHub.id, $("#editHubName").val());
    }

    
    handleNewHubDialog() {
        let myModal = new bootstrap.Modal(document.getElementById('newhubModal'));
        myModal.toggle();
    }

    
    async newHub() {
        let data = myCaaSAC.createHub($("#newHubName").val());
        this.loadHub(data.hubid);
    }

    
    async loadHub(hubid) {
       
        await myCaaSAC.loadHub(hubid);
        
        $(".loggedinuser").html(myCaaSAC.getCurrentUser().email + " - Hub:" + myCaaSAC.getCurrentHub().name);
           
        myAdmin._updateUI();
        myAdmin.adminProject.handleProjectSelection();
    }

    async _acceptEdit(event) {
        let id = event.currentTarget.id.split("-")[1];
        let email = this._hubusertable.getRow(id).getCell("email").getValue();
        let role = this._hubusertable.getRow(id).getCell("role").getValue();

        let hubusers = await myCaaSAC.getHubUsers(this.editHub.id);

        let isUser = false;
        for (let i = 0; i < hubusers.length; i++) {
            if (hubusers[i].email == email) {
                isUser = true;
                break;
            }
        }
        if (!isUser) {
            await myCaaSAC.addHubUser(this.editHub.id, email, role);
        }
        else
        {
            await myCaaSAC.updateHubUser(this.editHub.id, email, role);
        }

        this._hubusertable.getRow(id).getCell("edit").setValue(false);
        this.refreshHubTable();
    }

    _editCheck(cell) {
        let row = cell.getRow();
        let data = row.getData();
        return data.edit;
    }


    addUserToHub()
    {
        let prop = {id:this._hubusertable.getData().length,email:"", role:"User", edit:true};

        this._hubusertable.addData([prop], false);
        this._hubusertable.redraw();
    }

    _enableEdit(event) {
        let id = event.currentTarget.id.split("-")[1];
        this._hubusertable.getRow(id).getCell("edit").setValue(true);
    }

    _discardEdit(event) {
        let id = event.currentTarget.id.split("-")[1];
        this._hubusertable.getRow(id).getCell("edit").setValue(false);
        this.refreshHubTable();
    }

    async _deleteUserFromHub(event) {
        let id = event.currentTarget.id.split("-")[1];
        let email = this._hubusertable.getRow(id).getCell("email").getValue();
        await myCaaSAC.deleteUserFromHub(this.editHub.id, email);
        this.refreshHubTable();
    }

    async deleteHub() {
        $('#choosehubModal').modal('hide');
        await myCaaSAC.deleteHub($("#hubselect").val());
        this.handleHubSelection();
    }


    async _acceptHubParticipation(event) {
        let id = event.currentTarget.id.split("-")[1];
        let email = this._hubusertable.getRow(id).getCell("email").getValue();
        await myCaaSAC.acceptHub(this.editHub.id, email);
        this.refreshHubTable();
    }
    
    _renderEditCell(cell) {
        let _this = this;
        
        let content = "";
        let editable = cell.getValue();

        let rowdata = cell.getRow().getData();

        if (rowdata.role == "Owner") {
            return;
        }

        let accepted = rowdata.accepted;

        content += '<div style="height:20px">';
        
        if (editable)
        {
            content += '<button id="ehc_accept-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-check"></i></button>';
            content += '<button id="ehc_cancel-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-x"></i></button>';
        }
        else
        {
            content += '<button id="ehc_edit-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-edit"></i></button>';
            content += '<button id="ehc_delete-' + cell.getData().id + '" type="button" class="edithubbuttons" ><i style="pointer-events:none" class="bx bx-trash"></i></button>';

        }

        let hasAcceptButton = false;
        if (!accepted && rowdata.email != "") {
            if (rowdata.email == myAdmin.currentUser.email)
            {
                content += '<button id="ehc_accept2-' + cell.getData().id + '" type="button" class="edithubbuttons2" style="position:relative;top:-5px;border-style:none;height:20px"><span style="font-size:12px;top:-2px;position:relative;">Accept</span></button>';
                hasAcceptButton = true;
            }
            else
            {
                content+='<span style="position:relative;top:-7px;left:5px">...Pending</span>';
            }
        }

        content += '</div>';
        $(cell.getElement()).append(content);
        $("#ehc_accept-" + cell.getData().id).on("click", function (event) { _this._acceptEdit(event); });
        $("#ehc_edit-" + cell.getData().id).on("click", function (event) { _this._enableEdit(event); });
         $("#ehc_cancel-" + cell.getData().id).on("click", function (event) { _this._discardEdit(event); });
         $("#ehc_delete-" + cell.getData().id).on("click", function (event) { _this._deleteUserFromHub(event); });
         $("#ehc_accept2-" + cell.getData().id).on("click", function (event) { _this._acceptHubParticipation(event); });
        // this._updateCellStyle(cell.getData().id);        
    }

    async refreshHubTable() {
        this._hubusertable.clearData();
        let users = await myCaaSAC.getHubUsers(this.editHub.id);

        for (let i = 0; i < users.length; i++) {

            let prop = { id: i, email: users[i].email, role: users[i].role, edit:false, accepted:users[i].accepted};

            this._hubusertable.addData([prop], false);
        }

        this._hubusertable.redraw();

    }

    async handleEditHubDialog() {

        this.editHub = {id:$("#hubselect").val(), name:$("#hubselect option:selected").text()};

        $("#editHubName").val(this.editHub.name);
        let myModal = new bootstrap.Modal(document.getElementById('edithubModal'));
    
        let _this = this;
        this._hubusertable = new Tabulator("#hubuserstab", {
            layout: "fitColumns",
            selectable: 0,
            columns: [
                {
                    title: "ID", field: "id", width: 60
                },
                {
                    title: "accepted", field: "accepted", width: 60,visible:false
                },
                {
                    title: "", width: 150, field: "edit", formatter: function (cell, formatterParams, onRendered) {
                        onRendered(function () {
                            _this._renderEditCell(cell);
                        });
                    },
                },              
                { title: "User", field: "email", editor: "input", editable:this._editCheck, validator:"regex:[a-z0-9]+@[a-z]+\.[a-z]{2,3}", editorParams: { }},
                {
                    title: "Role", field: "role", width: 90, editor: "select", editable:this._editCheck, editorParams: { values: ["Admin", "User"] }
                },

            ],
        });

        this._hubusertable.on("tableBuilt", function (e, row) {
            _this.refreshHubTable();
        });


        myModal.toggle();
    }

}

