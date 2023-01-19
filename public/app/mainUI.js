var mainUI;

class MainUI {


    constructor() {

        this.sideBars = [];

    }


    setupMenu() {

        var viewermenu = [
            {
                name: 'Login',
                fun: async function () {
                    myAdmin.handleLogin();
                }
            },
            {
                name: 'Switch Hub',
                fun: async function () {
                    myAdmin.adminHub.handleHubSwitch();
                }
            },
            {
                name: 'Switch Project',
                fun: async function () {
                    myAdmin.adminProject.handleProjectSwitch();
                }
            },
            {
                name: 'Logout',
                fun: async function () {
                    myAdmin.handleLogout();
                }
            },
            {
                name: 'Register',
                fun: async function () {
                    myAdmin.handleRegistration();
                }
            }

        ];
        if (!myAdmin.demoMode)
        {
          $('#viewermenu1button').contextMenu("menu", viewermenu, {
            'displayAround': 'trigger',
            verAdjust: 45,
            horAdjust: -35
          });
        }
        else
        {
          $('#viewermenu1button').css("display", "none");
          $('.fileUploadButton').css("display", "none");
        }
       
    }

    registerSideBars(div, width, callback) {
        this.sideBars[div] = { width: width, expanded: false, callback: callback };
    }

    collapseAll() {
        for (var i in this.sideBars) {
            $("#" + i).css({ "display": "none" });
            this.sideBars[i].expanded = false;
            $("#" + i + "_button").css("color", "");
        }
        $("#content").css("margin-left", "40px");
        $("#content").css({ "width": "" });

    }

    toggleExpansion(div) {
        var sidebar = this.sideBars[div];
        $(".sidenav").children().css("color", "");
        if (!sidebar.expanded) {
            this.collapseAll();
            $("#content").css("margin-left", "");
            $("#content").css({ "width": "" });

            $("#" + div).css({ "display": "block" });
            $("#" + div).css({ "width": sidebar.width + "px" });
            var newwidth = $("#content").width() - (sidebar.width + 50);

            $("#content").css("margin-left", (sidebar.width + 40) + "px");
            $("#content").css({ "width": newwidth + "px" });
            sidebar.expanded = true;
            $("#" + div + "_button").css("color", "white");

        }
        else {
            this.collapseAll();
        }
        if (sidebar.callback)
            sidebar.callback(sidebar.expanded);

        resizeCanvas();
    }

    updateMenu() {
        
        if (!myAdmin.currentUser) {
            $("li:contains(Logout)").css("opacity", "0.2");
            $("li:contains(Logout)").css("pointer-events", "none");

            $("li:contains(Register)").css("opacity", "1.0");
            $("li:contains(Register)").css("pointer-events", "all");


            $("li:contains(Login)").css("opacity", "1.0");
            $("li:contains(Login)").css("pointer-events", "all");

            $("li:contains(Switch Project)").css("opacity", "0.2");
            $("li:contains(Switch Project)").css("pointer-events", "none");

            $("li:contains(Switch Hub)").css("opacity", "0.2");
            $("li:contains(Switch Hub)").css("pointer-events", "none");


        }
        if (myAdmin.currentUser) {

            $("li:contains(Logout)").css("opacity", "1.0");
            $("li:contains(Logout)").css("pointer-events", "all");

            $("li:contains(Login)").css("opacity", "0.2");
            $("li:contains(Login)").css("pointer-events", "none");

            $("li:contains(Switch Project)").css("opacity", "1");
            $("li:contains(Switch Project)").css("pointer-events", "all");

            $("li:contains(Switch Hub)").css("opacity", "1");
            $("li:contains(Switch Hub)").css("pointer-events", "all");

            $("li:contains(Register)").css("opacity", "0.2");
            $("li:contains(Register)").css("pointer-events", "none");


        }

        if (myAdmin.currentProject) {
            $("#content").css("display", "block");
            $("body").css("background", "");
            $(".sidenav").css("pointer-events", "");
        }
        else {
            $("#content").css("display", "none");
            $("body").css("background", "grey");
            $(".sidenav").css("pointer-events", "none");

        }
    }
}