const serveraddress = "http://" + window.location.host;
var myAdmin;


async function setupApp() {

  $.notify.addStyle('notifyerror', {
    html: "<div><span data-notify-text/></div>",
    classes: {
      base: {
        "white-space": "nowrap",
        "background-color": "white",
        'color': 'black',
        'box-shadow': "rgba(0, 0, 0, 0.35) 0px 5px 15px",
        'border-radius': "25px",
        'opacity': "0.75",
        'padding': "15px"
      }
    }
  });

  mainUI = new MainUI();
  mainUI.registerSideBars("sidebar_models", 450);



  myAdmin = new Admin();
  myAdmin.setUpdateUICallback(mainUI.updateMenu);
  myAdmin.adminProject.setLoadProjectCallback(loadProjectCallback);

  await myAdmin.checkLogin();
  mainUI.setupMenu();

}



function loadProjectCallback() {
  initializeViewer();
  CsManagerClient.msready();
}


function msready() {

  // $("#content").css("top", "0px");
  setTimeout(function () {

    var newheight = $("#content").height() - 40;
    $("#content").css("top", "40px");
    $("#content").css({ "height": newheight + "px" });

    var op = hwv.operatorManager.getOperator(Communicator.OperatorId.Orbit);
    op.setOrbitFallbackMode(Communicator.OrbitFallbackMode.CameraTarget);

    hwv.view.setAmbientOcclusionEnabled(true);


    $(window).resize(function () {
      resizeCanvas();
    });

    $(".webviewer-canvas").css("outline", "none");

  }, 10);
}


async function initializeViewer()
{
  
  let viewer;
  if (!myAdmin.useStreaming) {
    viewer = await Sample.createViewer();
  }
  else {

    let res = await fetch(serveraddress + '/caas_ac_api/streamingSession');
    var data = await res.json();

    viewer = new Communicator.WebViewer({
      containerId: "content",
      endpointUri: 'ws://' + data.serverurl + ":" + data.port + '?token=' + data.sessionid,
      model: "_empty",
      rendererType:  Communicator.RendererType.Client
    });
  }

  hwv = viewer;
  var screenConfiguration =
    md.mobile() !== null
      ? Communicator.ScreenConfiguration.Mobile
      : Sample.screenConfiguration;
  var uiConfig = {
    containerId: "viewerContainer",
    screenConfiguration: screenConfiguration,
    showModelBrowser: true,
    showToolbar: true,
  };

  ui = new Communicator.Ui.Desktop.DesktopUi(hwv, uiConfig);


  hwv.setCallbacks({
    modelStructureReady: msready,
  });

  hwv.start();
}


function resizeCanvas() {

  let offset = $("#content").offset();
  let width = $(window).width() - offset.left;
  let height = $(window).height() - offset.top;
  $("#content").css("width", width + "px");
  $("#content").css("height", (height) + "px");
  hwv.resizeCanvas();
  $("#toolBar").css("left", (width / 2 - 250) + "px");
  $("#toolBar").css("top", (height - 50) + "px");

}