export class CaasAcc {

    constructor(serveraddress) {
        this.currentUser = null;
        this.currentProject = null;
        this.currentHub = null;
        this.demoMode = false;
        this.useDirectFetch = false;
        this.useStreaming = true;            
        this.serveraddress = serveraddress;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentHub() {
        return this.currentHub;
    }

    getCurrentProject() {
        return this.currentProject;
    }

    getUseDirectFetch() {
        return this.useDirectFetch;
    }

    
    getUseStreaming() {
        return this.useStreaming;
    }

    getDemoMode() {
        return this.demoMode;
    }

    getUploadURL() {
        return this.serveraddress + '/caas_ac_api/upload';
    }

    async getConfiguration()
    {
        let res = await fetch(this.serveraddress + '/caas_ac_api/configuration');
        let data = await res.json();
        this.useDirectFetch = data.useDirectFetch;     
        this.useStreaming = data.useStreaming; 
        this.demoMode = data.demoMode;                 
    }

    async checkLogin()
    {
        let res = await fetch(this.serveraddress + '/caas_ac_api/checklogin');
        let data = await res.json();
        if (data.succeeded)
        {
            this.currentUser = data.user;            
               
            if (!data.hub) {
                this.currentProject = null;
                this.currentHub = null;
            }
            else if (!data.project) {

                this.currentHub = data.hub;
                this.currentProject = null;
            }
            else {
                this.currentHub = data.hub;
                this.currentProject = data.project;
            }
            return true;
        }
        return false;
    }

    async logout()
    {
        await fetch(this.serveraddress + '/caas_ac_api/logout/', { method: 'PUT' });        

    }
    
    register(info) {

        let fd = new FormData();
        fd.append('firstName', info.firstName);
        fd.append('lastName', info.lastName);
        fd.append('email', info.email);
        fd.append('password', info.password);
        let _this = this;
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: _this.serveraddress + "/caas_ac_api/register",
                type: 'post',
                data: fd,
                contentType: false,
                processData: false,
                success: function (response) {
                    if (response.ERROR) {
                        resolve(response.ERROR);
                    }
                    else {
                        resolve("SUCCESS");
                    }
                },
            });
        });
    }

    async login(email, password) {


        let response = await fetch(this.serveraddress + '/caas_ac_api/login/' + email + '/' + password, { method: 'PUT' });
        response = await response.json();
        if (response.ERROR) {

            return response;
        }
        else {
            this.currentUser = response.user;
            return response;
        }
    }

    async leaveHub() {
        await fetch(this.serveraddress + '/caas_ac_api/hub/none', { method: 'PUT' });

        this.currentProject = null;
        this.currentHub = null;
    }

    async getHubs() {

        let response = await fetch(this.serveraddress + '/caas_ac_api/hubs');
        let hubs = await response.json();
        return hubs;
    }

    async renameHub(hubid, name) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/renameHub/' + hubid + "/" + name, { method: 'PUT' });
    }

    async createHub(name) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/newhub/' + name, { method: 'PUT' });
        let data = await res.json();
        return data;
    }

    async loadHub(hubid) {
       
        let res = await fetch(this.serveraddress + '/caas_ac_api/hub/' + hubid, { method: 'PUT' });

        let hubinfo  = await res.json();
        this.currentHub = hubinfo;
    }

    async getHubUsers(hubid) {
        let response = await fetch(this.serveraddress + '/caas_ac_api/hubusers/' + hubid);
        return await response.json();
    }

    async addHubUser(hubid,email, role) {
  
        let res = await fetch(this.serveraddress + '/caas_ac_api/addHubUser/' + hubid + "/" + email + "/" + role, { method: 'PUT' });
    }

    async updateHubUser(hubid,email, role) {
  
        let res = await fetch(this.serveraddress + '/caas_ac_api/updateHubUser/' + hubid + "/" + email + "/" + role, { method: 'PUT' });
    }

    async deleteHubUser(hubid,email) {
  
        await fetch(this.serveraddress + '/caas_ac_api/deleteHubUser/' + hubid + "/" + email, { method: 'PUT' });        
    }

    async deleteHub(hubid) {
  
        await fetch(this.serveraddress + '/caas_ac_api/deleteHub/' + hubid, { method: 'PUT' });
    }
    
    async acceptHub(hubid, email) {
        await fetch(this.serveraddress + '/caas_ac_api/acceptHub/' + hubid + "/" + email, { method: 'PUT' });        
        this.refreshHubTable();
    }

    async leaveProject()
    {
        await fetch(this.serveraddress + '/caas_ac_api/project/none', { method: 'PUT' });
        this.currentProject = null;

    }

    async renameProject(projectid,name) {
        await fetch(this.serveraddress + '/caas_ac_api/renameproject/' + projectid + "/" +  name, { method: 'PUT' });
    }

    async createProject(name) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/newproject/' + name, { method: 'PUT' });
        let data = await res.json();
        return data;
    }

    async deleteProject(projectid) {
       await fetch(this.serveraddress + '/caas_ac_api/deleteproject/' + projectid, { method: 'PUT' });
   }

    async loadProject(projectid) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/project/' + projectid, { method: 'PUT' });
        let data = await res.json();
        this.currentProject = data.projectname;
    }

    async getProjects() {
      
        let response = await fetch(this.serveraddress + '/caas_ac_api/projects');
        let projects = await response.json();
        return projects;
    }

    async getProjectUsers(projectid) {
        let response = await fetch(this.serveraddress + '/caas_ac_api/projectusers/' + projectid);
        let projectusers = await response.json();
        return projectusers;
    }

    async addProjectUser(projectid, email, role) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/addProjectUser/' + projectid + "/" + email + "/" + role, { method: 'PUT' });
    }

    async editProjectUser(projectid, email, role) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/updateProjectUser/' + projectid + "/" + email + "/" + role, { method: 'PUT' });
    }

    async deleteProjectUser(projectid,email) {
        await fetch(this.serveraddress + '/caas_ac_api/deleteProjectUser/' + projectid + "/" + email, { method: 'PUT' });        
    }

    async getUploadToken(name,size) {
        let data = await fetch(this.serveraddress + '/caas_ac_api/uploadToken/' + name + "/" + size);                    
        let json = await data.json();
        return json;
    }

    processUploadFromToken(itemid, startpath) {
        fetch(this.serveraddress + '/caas_ac_api/processToken/' + itemid, { method: 'PUT',headers: {'startpath': startpath} });
    }

    async getModels() {        
        let res = await fetch(this.serveraddress + '/caas_ac_api/models');
        let data = await res.json();
        return data;
    }

    async getDownloadToken(itemid, type) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/downloadToken/' + itemid + "/" + type);
        let json = await res.json();
        return json;
    }

    async getPNG(itemid) {
        let image = await fetch(this.serveraddress + '/caas_ac_api/png/' + itemid);
        return image;
    }

    async getSCS(itemid) {
        let res = await fetch(this.serveraddress + '/caas_ac_api/scs/' + itemid);
        let ab = await res.arrayBuffer();
        let byteArray = new Uint8Array(ab);
        return byteArray;        
    }

    async enableStreamAccess(itemid) {
        await fetch(this.serveraddress + '/caas_ac_api/enableStreamAccess/' + itemid,{ method: 'PUT' });        
    }

    async deleteModel(itemid) {
        await fetch(this.serveraddress + '/caas_ac_api/deleteModel/' + itemid, { method: 'PUT'});
    }

    async initializeWebviewer(container) {

        let viewer;
        if (!this.useStreaming) {
            viewer = new Communicator.WebViewer({
                containerId: container,
                empty: true,
                streamingMode: 1
              });
        }
        else {

            let res = await fetch(this.serveraddress + '/caas_ac_api/streamingSession');
            let data = await res.json();

            viewer = new Communicator.WebViewer({
                containerId: container,
                endpointUri: 'ws://' + data.serverurl + ":" + data.port + '?token=' + data.sessionid,
                model: "_empty",
                rendererType: Communicator.RendererType.Client
            });
        }
        return viewer;
    }
}

