class Admin {

    constructor() {
        this.currentUser = null;
        this.currentProject = null;
        this.currentHub = null;
        this.demoMode = false;
        this.useDirectFetch = false;
        this.useStreaming = true;
    
        this._updateUICallback = null;
        this._loggedInCallback = null;
     
        this.adminHub = new AdminHub();
        this.adminProject = new AdminProject();

    }

 
    setUpdateUICallback(updateuicallback)
    {
        this._updateUICallback = updateuicallback;
    }

    setLoggedInCallback(loggedincallback)
    {
        this._loggedInCallback = loggedincallback;
    }


    _updateUI() {
        if (this._updateUICallback) {
            this._updateUICallback();
        }
    }

    async getConfiguration()
    {
        var res = await fetch(serveraddress + '/api/configuration');
        var data = await res.json();
        this.useDirectFetch = data.useDirectFetch;     
        this.useStreaming = data.useStreaming; 
        this.demoMode = data.demoMode;                 
    }

    async checkLogin()
    {
        await this.getConfiguration();
        var res = await fetch(serveraddress + '/api/checklogin');
        var data = await res.json();
        if (data.succeeded)
        {
            this.currentUser = data.user;
            if (this.currentUser && this._loggedInCallback)
            {
                this._loggedInCallback();
            }
  
            $(".loggedinuser").html(data.user.email);

            if (data.hub)
            {
                $(".loggedinuser").html(data.user.email + " - Hub:" + data.hub.name);
            }
            else
            {
                $(".loggedinuser").html(data.user.email);
            }
               
            if (!data.hub) {
                this.currentProject = null;
                this.currentHub = null;
                this.adminHub.handleHubSelection();
            }
            else if (!data.project) {

                this.currentHub = data.hub;
                this.currentProject = null;
                this.adminProject.handleProjectSelection();
            }
            else {
                this.currentHub = data.hub;
                this.adminProject.loadProject(data.project);
            }
        }
        this._updateUI();
    }

    async handleLogout()
    {
        var res = await fetch(serveraddress + '/api/logout/', { method: 'PUT' });
        window.location.reload(true); 

    }

  
    handleRegistration()
    {
        let myModal = new bootstrap.Modal(document.getElementById('registerusermodal'));
        myModal.toggle();

    }

    _submitRegistration() {

        var fd = new FormData();
        fd.append('firstName', $("#register_firstname").val());
        fd.append('lastName', $("#register_lastname").val());
        fd.append('email', $("#register_email").val());
        fd.append('password', $("#register_password").val());

        $.ajax({
            url: serveraddress + "/api/register",
            type: 'post',
            data: fd,
            contentType: false,
            processData: false,
            success: function (response) {
                if (response.ERROR) {
                    $.notify("Error: " + response.ERROR, { style:"notifyerror",autoHideDelay: 3000, position: "bottom center" });
                    myAdmin.handleRegistration();
                }
                else {
                    CsManagerClient.msready();
                }
            },
        });
    }

    handleLogin()
    {
      
        let myModal = new bootstrap.Modal(document.getElementById('loginusermodal'));
        myModal.show();

        var input = document.getElementById("login_password");
        input.addEventListener("keyup", function(event) {
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
              // Cancel the default action, if needed
              event.preventDefault();
              // Trigger the button element with a click
              document.getElementById("loginbutton").click();
            }
          });

    }

    _submitLogin() {

        var fd = new FormData();
        fd.append('email', $("#login_email").val());
        fd.append('password', $("#login_password").val());

        var _this = this;
        $.ajax({
            url: serveraddress + "/api/login",
            type: 'post',
            data: fd,
            contentType: false,
            processData: false,
            success: function (response) {


                if (response.ERROR) {

                    myAdmin.handleLogin();
                    $.notify("Error: " + response.ERROR, { style:"notifyerror",autoHideDelay: 3000, position: "bottom center" });


                }
                else {

                    _this.currentUser = response.user;
                    $(".loggedinuser").empty();
                    $(".loggedinuser").append(response.user.email);
                    _this.adminHub.handleHubSelection();
                    _this._updateUI();

                    if (_this.currentUser && _this._loggedInCallback)
                    {
                        _this._loggedInCallback();
                    }
                }


            },
        });
    }

}

