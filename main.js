/* INIT VARS */
const electron = require('electron')
const {
  app,
  ipcMain,
  ipcRenderer,
  BrowserWindow,
  Tray,
  Menu
} = require('electron')
var path = require('path')
let mainWindow

/* INIT PROGRAM*/
loadApp();
let isQuiting = false;

/* FUNCTIONS */

function loadApp() {
  app.on('ready', function() {
    createCallbacks();
    setupTray();
    createWindow();
  })

  app.on('uncaughtException', function(error) {
    alert(error)
  });


  app.on('activate', function() {
    if (mainWindow === null) {
      createCallbacks();
      setupTray();
      createWindow()
    }
  })
  app.on('window-all-closed', function(event) {
    event.preventDefault();
    app.exit();
  })

}
console.log(path.join(__dirname, ''));

function createCallbacks() {
  console.log("Create Callbacks");
  ipcMain.on('update-notify-value', function(event, arg) {
    const notifier = require('node-notifier');
    notifier.notify({
      icon: path.join(__dirname, 'icon.png'),
      title: 'Arionum Wallet',
      message: arg,
      appID: ""
    });
  });
}
var appIcon;

function setupTray() {
  const path = require('path');
  const imgPath = path.join(process.resourcesPath, 'icon.ico')
  console.log("Create Tray");
  appIcon = new Tray(imgPath);
  var contextMenu = Menu.buildFromTemplate([{
      label: 'Show App',
      click: function() {
        loadSite();
        mainWindow.show();
      }
    },
    {
      label: 'Quit',
      click: function() {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  appIcon.setContextMenu(contextMenu)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      webSecurity: false
    },
    height: 748,
    width: 468,
    transparent: true,
    frame: false,
    icon: path.join(__dirname, 'assets/icons/64x64.png')
  });

  mainWindow.on('show', function() {
    appIcon.setHighlightMode('always')
  })
  mainWindow.on('minimize', function(event) {
    event.preventDefault();
    mainWindow.hide();
  });
  mainWindow.on('close', function() {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.minimize();
    }
    return false;
  })

  registerWindowEvents();
  loadSite();
}

function loadSite() {
  if (checkData("publickey") == "") {
    mainWindow.loadFile('login.html');
    mainWindow.center();
  } else {
    mainWindow.setResizable(false);
    mainWindow.setSize(1318, 790, true);
    mainWindow.center();
    mainWindow.loadFile('index.html');
  }
}

function registerWindowEvents() {
  mainWindow.onbeforeunload = (e) => {
    e.returnValue = true;
  };
  mainWindow.webContents.on('will-navigate', function(event, newUrl) {
    var new_site = newUrl.split("/")[newUrl.split("/").length - 1] + "";
    new_site = new_site.replace(".html", "");

    if (new_site == "index") {
      //mainWindow.setResizable( true );
      mainWindow.setResizable(false);
      mainWindow.setSize(1318, 790, true);
      mainWindow.center();
    }
    if (new_site == "login") {
      mainWindow.setResizable(true);
      mainWindow.setSize(468, 748, true);
      mainWindow.center();
      mainWindow.setResizable(false);
    }
  });
}


function checkData(key) {
  const electron = require('electron');
  const fs = require('fs');
  const userDataPath = (electron.app || electron.remote.app).getPath('userData');
  var paths = path.join(userDataPath, "arionum-config" + '.json');
  var data = parseDataFile(paths, key);
  return data;
}

function parseDataFile(filePath, key) {
  try {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(filePath))[key];
  } catch (error) {
    return "";
  }
}