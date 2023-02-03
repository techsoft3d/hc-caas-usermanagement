/** This class provides a wrapper for the CaaS User Management Server REST API*/
export class CaasUserManagementClient {
    /**
         * Creates a CaaS User Management Object
         * @param  {string} serveraddress - Address of CaaS User Management Server
         */
    constructor(serveraddress) {
        this.currentUser = null;
        this.currentProject = null;
        this.currentHub = null;
        this.demoMode = false;
        this.useDirectFetch = false;
        this.useStreaming = true;
        this.serveraddress = serveraddress;
    }
    /**
        * Retrieves the currently active (logged in) user
        * @return {Object} Current User Object
        */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
         * Retrieves the currently active hub
         * @return {Object} Current Hub Object
         */
    getCurrentHub() {
        return this.currentHub;
    }

    /**
         * Retrieves the currently active project
         * @return {Object} Current Project Object
         */
    getCurrentProject() {
        return this.currentProject;
    }


    /**
         * Retrieves if the CaaS User Management Server is configured for direct fetch
         * @return {bool} true if direct fetch is configured
         */
    getUseDirectFetch() {
        return this.useDirectFetch;
    }


    /**
         * Retrieves if the CaaS User Management Server is configured for streaming
         * @return {bool} true if streaming is configured
         */
    getUseStreaming() {
        return this.useStreaming;
    }


    /**
         * Retrieves if the CaaS User Management Server is in demo mode
         * @return {bool} true if streaming is configured
         */
    getDemoMode() {
        return this.demoMode;
    }

    /**
         * Retrieves the URL for uploading models to the CaaS User Management Server
         * @return {string} URL to upload models to
         */
    getUploadURL() {
        return this.serveraddress + '/caas_um_api/upload';
    }


    /**
       * Retrieves the URL for uploading multiple models (assembly upload) to the CaaS User Management Server
       * @return {string} URL to upload models to
       */
    getUploadArrayURL() {
        return this.serveraddress + '/caas_um_api/uploadArray';
    }


    /**
         * Retrieves the CaaS User Management Server configuration
         * @return {object} Server Configuration
         */
    async getConfiguration() {
        let res = await fetch(this.serveraddress + '/caas_um_api/configuration');
        let data = await res.json();
        this.useDirectFetch = data.useDirectFetch;
        this.useStreaming = data.useStreaming;
        this.demoMode = data.demoMode;
    }


    /**
            * Validates cookie based login state
            * @return {bool} true if logged in
            */
    async checkLogin() {
        let res = await fetch(this.serveraddress + '/caas_um_api/checklogin');
        let data = await res.json();
        if (data.succeeded) {
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


    /**
            * Logout currently active user        
            */
    async logout() {
        await fetch(this.serveraddress + '/caas_um_api/logout/', { method: 'PUT' });

    }

    /**
      * Register a new user
      * @param  {object} info - User Information
      */
    register(info) {

        let fd = new FormData();
        fd.append('firstName', info.firstName);
        fd.append('lastName', info.lastName);
        fd.append('email', info.email);
        fd.append('password', info.password);
        let _this = this;
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: _this.serveraddress + "/caas_um_api/register",
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

    /**
         * Login an existing user
         * @param  {string} email - User Email
         * @param  {string} password - User Password
         */
    async login(email, password) {


        let response = await fetch(this.serveraddress + '/caas_um_api/login/' + email + '/' + password, { method: 'PUT' });
        response = await response.json();
        if (response.ERROR) {

            return response;
        }
        else {
            this.currentUser = response.user;
            return response;
        }
    }



    /**
            * Leave currently active Hub        
            */
    async leaveHub() {
        await fetch(this.serveraddress + '/caas_um_api/hub/none', { method: 'PUT' });

        this.currentProject = null;
        this.currentHub = null;
    }


    /**
            * Retrieves all hubs associated with the current user
            * @return {Object} List of hubs
            */
    async getHubs() {

        let response = await fetch(this.serveraddress + '/caas_um_api/hubs');
        let hubs = await response.json();
        return hubs;
    }

    /**
            * Rename a hub
            * @param  {string} hubid - Id of Hub
            * @param  {string} name - New Hub Name
            */
    async renameHub(hubid, name) {
        await fetch(this.serveraddress + '/caas_um_api/renameHub/' + hubid + "/" + name, { method: 'PUT' });
    }

    /**
            * Create a new Hub associated with the current user       
            * @param  {string} name - Name of new Hub
            * @return {Object} Data about new Hub  
            */
    async createHub(name) {
        let res = await fetch(this.serveraddress + '/caas_um_api/newhub/' + name, { method: 'PUT' });
        let data = await res.json();
        return data;
    }

    /**
            * Load a Hub 
            * @param  {string} hubid - Id of Hub
            */
    async loadHub(hubid) {

        let res = await fetch(this.serveraddress + '/caas_um_api/hub/' + hubid, { method: 'PUT' });

        let hubinfo = await res.json();
        this.currentHub = hubinfo;
    }

    /**
            * Retrieve all users associated with a Hub      
            * @param  {string} hubid - Id of Hub
            * @return {Object} Users associated with Hub
            */
    async getHubUsers(hubid) {
        let response = await fetch(this.serveraddress + '/caas_um_api/hubusers/' + hubid);
        return await response.json();
    }

    /**
            * Add a user to a Hub      
            * @param  {string} hubid - Id of Hub
            * @param  {string} email - User email
            * @param  {string} role - User Role ("User" "Admin", "Owner")
            */
    async addHubUser(hubid, email, role) {
        await fetch(this.serveraddress + '/caas_um_api/addHubUser/' + hubid + "/" + email + "/" + role, { method: 'PUT' });
    }

    /**
            * Modify a user's role in a Hub     
            * @param  {string} hubid - Id of Hub
            * @param  {string} email - User email
            * @param  {string} role - User Role ("User" "Admin", "Owner")
            */
    async updateHubUser(hubid, email, role) {
        await fetch(this.serveraddress + '/caas_um_api/updateHubUser/' + hubid + "/" + email + "/" + role, { method: 'PUT' });
    }

    /**
            * Delete a user from a Hub      
            * @param  {string} hubid - Id of Hub
            * @param  {string} email - User email
            */
    async deleteHubUser(hubid, email) {

        await fetch(this.serveraddress + '/caas_um_api/deleteHubUser/' + hubid + "/" + email, { method: 'PUT' });
    }

    /**
            * Delete a Hub      
            * @param  {string} hubid - Id of Hub
            */
    async deleteHub(hubid) {

        await fetch(this.serveraddress + '/caas_um_api/deleteHub/' + hubid, { method: 'PUT' });
    }

    /**
            * Accept a Hub invitation     
            * @param  {string} hubid - Id of Hub
            * @param  {string} email - User email
            */
    async acceptHub(hubid, email) {
        await fetch(this.serveraddress + '/caas_um_api/acceptHub/' + hubid + "/" + email, { method: 'PUT' });
        this.refreshHubTable();
    }


    /**
            * Leave currently active Project        
            */
    async leaveProject() {
        await fetch(this.serveraddress + '/caas_um_api/project/none', { method: 'PUT' });
        this.currentProject = null;

    }
    /**
              * Rename a Project
              * @param  {string} hubid - Id of Hub
              * @param  {string} projectid - Id of Project
              * @param  {string} name - New Hub Project
              */
    async renameProject(projectid, name) {
        await fetch(this.serveraddress + '/caas_um_api/renameproject/' + projectid + "/" + name, { method: 'PUT' });
    }

    /**
            * Create a new Project associated to a hub
            * @param  {string} name - Name of new Project
            * @return {Object} Data about new Project  
            */
    async createProject(hubid, name) {
        let res = await fetch(this.serveraddress + '/caas_um_api/newproject/' + hubid + "/" + name, { method: 'PUT' });
        let data = await res.json();
        return data;
    }

    /**
            * Delete a user from a project      
            * @param  {string} projectid - Id of Project
            */
    async deleteProject(projectid) {
        await fetch(this.serveraddress + '/caas_um_api/deleteproject/' + projectid, { method: 'PUT' });
    }

    /**
         * Load a Project 
         * @param  {string} hubid - Id of Hub* 
         * @param  {string} projectid - Id of Project
         */
    async loadProject(projectid) {
        let res = await fetch(this.serveraddress + '/caas_um_api/project/' + projectid, { method: 'PUT' });
        let data = await res.json();
        this.currentProject = data;
    }

    /**
            * Retrieves all projects associated with a hub
            * @param  {string} hubid - Id of Hub
            * @return {Object} List of projects
            */
    async getProjects(hubid) {

        let response = await fetch(this.serveraddress + '/caas_um_api/projects/' + hubid);
        let projects = await response.json();
        return projects;
    }

    /**
            * Retrieve all users associated with a project      
            * @param  {string} projectid - Id of Project
            * @return {Object} Users associated with Hub
            */
    async getProjectUsers(projectid) {
        let response = await fetch(this.serveraddress + '/caas_um_api/projectusers/' + projectid);
        let projectusers = await response.json();
        return projectusers;
    }


    /**
            * Add a user to a Project      
            * @param  {string} projectid - Id of Project
            * @param  {string} email - User email
            * @param  {string} role - User Role ("User" "Admin", "Owner")
            */
    async addProjectUser(projectid, email, role) {
        await fetch(this.serveraddress + '/caas_um_api/addProjectUser/' + projectid + "/" + email + "/" + role, { method: 'PUT' });
    }


    /**
            * Modify a user's role in a Project     
            * @param  {string} hubid - Id of Project
            * @param  {string} email - User email
            * @param  {string} role - User Role ("User" "Admin", "Owner")
            */
    async updateProjectUser(projectid, email, role) {
        let res = await fetch(this.serveraddress + '/caas_um_api/updateProjectUser/' + projectid + "/" + email + "/" + role, { method: 'PUT' });
    }


    /**
            * Delete a user from a Project      
            * @param  {string} projectid - Id of Project
            * @param  {string} email - User email
            */
    async deleteProjectUser(projectid, email) {
        await fetch(this.serveraddress + '/caas_um_api/deleteProjectUser/' + projectid + "/" + email, { method: 'PUT' });
    }


    /**
            * Retrieve an upload token for a file     
            * @param  {string} name - Name of file
            * @param  {integer} size of file
            * @return {Object} Upload Token
            */
    async getUploadToken(name, size) {
        let data = await fetch(this.serveraddress + '/caas_um_api/uploadToken/' + name + "/" + size);
        let json = await data.json();
        return json;
    }


    /**
            * Process a file after upload is complete
            * @param  {string} itemid - File Id
            * @param  {string} startpath (if zipped assembly)
            */
    processUploadFromToken(itemid, startpath = "") {
        fetch(this.serveraddress + '/caas_um_api/processToken/' + itemid, { method: 'PUT', headers: { 'startpath': startpath } });
    }


    /**
            * Retrieve all models associated to currently active project    
            * @return {Object} List of models
            */
    async getModels() {
        let res = await fetch(this.serveraddress + '/caas_um_api/models');
        let data = await res.json();
        return data;
    }


    /**
            * Retrieve a download token for a file
            * @param  {string} itemid - File Id
            * @param  {string} file type
            * @return {Object} Download Token
            */
    async getDownloadToken(itemid, type) {
        let res = await fetch(this.serveraddress + '/caas_um_api/downloadToken/' + itemid + "/" + type);
        let json = await res.json();
        return json;
    }


    /**
            * Retrieves the png for a model    
            * @param  {string} itemid - File Id       
            * @return {Object} Image
            */
    async getPNG(itemid) {
        let image = await fetch(this.serveraddress + '/caas_um_api/png/' + itemid);
        return image;
    }

    /**
            * Retrieves the scs data for a model    
            * @param  {string} itemid - File Id       
            * @return {Object} Scs data
            */
    async getSCS(itemid) {
        let res = await fetch(this.serveraddress + '/caas_um_api/scs/' + itemid);
        let ab = await res.arrayBuffer();
        let byteArray = new Uint8Array(ab);
        return byteArray;
    }

    /**
            * Enables Stream Access for a model  
            * @param  {string} itemid - File Id       
            */

    async enableStreamAccess(itemid) {
        await fetch(this.serveraddress + '/caas_um_api/enableStreamAccess/' + itemid, { method: 'PUT' });
    }


    /**
            * Deletes a model 
            * @param  {string} itemid - File Id       
            */
    async deleteModel(itemid) {
        await fetch(this.serveraddress + '/caas_um_api/deleteModel/' + itemid, { method: 'PUT' });
    }


    /**
            * Initializes Webviewer
            * @param  {string} container - Div of Webviewer Container  
            */
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

            let res = await fetch(this.serveraddress + '/caas_um_api/streamingSession');
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

