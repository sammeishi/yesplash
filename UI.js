const { app, BrowserWindow,Menu,ipcMain,Tray,nativeImage } = require('electron');
const master = require('./master');
const _ = require('lodash');
const path = require('path');
const fse = require('fs-extra');
const util = require('./lib/util');
let win = null;
let send2win = (e,d)=> win.webContents.send(e, d);
let tray = null;
/**
 * 主进程logger
 */
let logger = util.createLogger('master');

/**
 * 初始化
 */
function init(){
    //确保下载目录存在
    try{
        fse.ensureDirSync( util.downloadPath() );
        fse.ensureDirSync( util.logPath() );
    }
    catch (e) {
        logger.error( "init mkdir error: ", e );
        process.exit();
    }
    //master给予主logger
    master.setLogger( logger );
    //创建窗口
    createWindow();
    //创建托盘图标
    tray = new Tray( path.join(__dirname, 'tray.png'));
    tray.on('click', ()=>{
        win.isVisible() ? win.hide() : win.show();
        win.isVisible() ?win.setSkipTaskbar(false):win.setSkipTaskbar(true);
    });
    //监听主操作事件
    listenMaster();
    //监听UI事件
    listenUIEvent();
}

/**
 * 窗口准备好的init
 */
function onWinLoad(){
    //更新一次窗口
    send2win('log', "free");
    //启动
    master.start();
    //第一次启动，显示最新的照片
    showLatestPhoto();
}

/**
 * 监听UI发来事件
 */
function listenUIEvent(){
    /**
     * 监听UI事件：切换下一个
     */
    ipcMain.on('next', () => {
        master.next().catch(( e )=>{
            logger.error( e );
        })
    });
    /**
     * 监听窗口加载完成
     */
    ipcMain.on('load',onWinLoad);
    /**
     * 窗口关闭
     */
    ipcMain.on('closeWin',()=> win.hide());
    //退出
    ipcMain.on('exit',()=>{
        win.destroy();
        app.quit();
    } );
}

/**
 * 监听master事件
 */
function listenMaster(){
    /*
    * 监听主逻辑发来 壁纸更换 事件
    * 向UI界面通知更换
    * */
    master.on("change",function( data ){
        send2win('change', data.photoFile);
    });
    master.on("log",function( log ){
        send2win('log', log);
    });
}

/**
 * 创建窗口
 */
function createWindow() {
    // 创建浏览器窗口
    win = new BrowserWindow({
        width: 800,
        height: 600,
        show: !(/--hide/.test( process.argv.join(".") )),
        useContentSize: true,
        titleBarStyle: 'hidden',
        frame: false,
        backgroundColor: '#090909',
        webPreferences: {
            nodeIntegration: true
        }
    });
    // 加载index.html文件
    win.loadFile('UI/index.html');
}

/**
 * 读取上次图片，显示出来.
 */
function showLatestPhoto(){
    util.latestInfo()
        .then(( info )=>{
            if( _.has(info,"photoFile") ){
                send2win('change', info.photoFile);
            }
        })
        .catch( e => logger.error( e ));
}

/**
 * app准备好后初始化
 */
app.whenReady().then(init);
