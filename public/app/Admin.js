class Admin {

    constructor() {
       
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
   

    async checkLogin()
    {
        await myCaaSAC.getConfiguration();
        let success = await myCaaSAC.checkLogin();
        if (success) {

            let user = myCaaSAC.getCurrentUser();
            if (user && this._loggedInCallback)
            {
                this._loggedInCallback();
            }
  
            $(".loggedinuser").html(user.email);

            if (myCaaSAC.getCurrentHub())
            {
                $(".loggedinuser").html(user.email + " - Hub:" + myCaaSAC.getCurrentHub().name);
            }
            else
            {
                $(".loggedinuser").html(user.email);
            }
               
            if (!myCaaSAC.getCurrentHub()) {            
                this.adminHub.handleHubSelection();
            }
            else if (!myCaaSAC.getCurrentProject()) {
              
                this.adminProject.handleProjectSelection();
            }
            else {              
                this.adminProject.loadProject(myCaaSAC.getCurrentProject());
            }
        }
        this._updateUI();
    }

    async handleLogout()
    {
        await myCaaSAC.logout();
        window.location.reload(true); 

    }

  
    handleRegistration()
    {
        let myModal = new bootstrap.Modal(document.getElementById('registerusermodal'));
        myModal.toggle();

    }

    async _submitRegistration() {

        let res = await myCaaSAC.register({firstName: $("#register_firstname").val(), lastName: $("#register_lastname").val(), email: $("#register_email").val(), password: $("#register_password").val()});
        if (res == "SUCCESS") {
            CsManagerClient.msready();
        }
        else {
            $.notify("Error: " + res, { style:"notifyerror",autoHideDelay: 3000, position: "bottom center" });
            myAdmin.handleRegistration();
        }   
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

    async _submitLogin() {
        let response = await myCaaSAC.login( $("#login_email").val(), $("#login_password").val());


        if (response.ERROR) {

            myAdmin.handleLogin();
            $.notify("Error: " + response.ERROR, { style:"notifyerror",autoHideDelay: 3000, position: "bottom center" });
        }
        else {
            $(".loggedinuser").empty();
            $(".loggedinuser").append(response.user.email);
            this.adminHub.handleHubSelection();
            this._updateUI();

            if (myCaaSAC.getCurrentUser() && _this._loggedInCallback)
            {
                this._loggedInCallback();
            }
        }
    }

}

