/**
 * 完整的处理流.
 * 查找链接，下载图片，更换壁纸，记录日期所有流程
 * 运行在独立线程内.
 * 当被丢弃时，下载的图片要删除，不能写时间
 * **/
const wallpaper = require('wallpaper');
const loadPhoto = require('./loader');
const util = require('./util');
let conf = null;

/**
 * 启动流
 * 清空下载目录,加载图片，设置壁纸，记录时间，返回
 */
function start(){
    console.log('flow start.');
    let photoFile = null;
    util.clearDownload()
        //加载照片，会自动下载到目录内
        .then( ()=>{
            return loadPhoto( conf );
        } )
        //设置本机壁纸
        .then(( pf )=>{
            photoFile = pf;
            return wallpaper.set( pf,{ scale:"fill" } );
        })
        //记录时间
        .then(()=>{
            return util.latestInfo( {
                "changeTime":Math.floor((Date.now()) / 1000),
                "photoFile":photoFile,
            } )
        })
        //完成，向主进程汇报
        .then(()=>{
            process.send({ status:"done",photoFile:photoFile });
            process.exit();
        })
        //出错，汇报
        .catch(( e )=>{
            process.send({ status:"error",msg:e.toString() });
            process.exit();
        })
}

/**
 * 终止流
 */
function abort(){
    console.log('flow process exit!');
    process.send({ status:"abort" });
    process.exit();
}


/*
* 事件中心
* */
process.on('message',function( event ){
    if( event.action === "abort" ){
        abort();
    }
    if( event.action === "start" ){
        conf = event.conf;
        start();
    }
});