/*
* 加载一张图片
* 运行在独立线程中.
* */
const fetchFactory = require('./fetchFactory');
const Unsplash = require('unsplash-js').default;
const FileSaver = require('file-saver');
const fs = require('fs');
const util = require('./util');
const _ = require('lodash');
const moment = require('moment');
let conf = null;
let logger = util.createLogger(`loader`);
/**
 * 开启下载图片
 * 返回 photoFile
 */
function start() {
    //根据代理包装fetch
    global.fetch = fetchFactory(conf.proxy);
    //随机一张照片
    return randomPhoto(new Unsplash({accessKey: conf.unsplash.AccessKey}))
        //下载图片
        .then((url) => {
            logger.debug(`download url: ${url} `);
            return download( url );
        })
        .then(( photoFile )=>{
            logger.debug('download ok!');
            return photoFile;
        })
}

/**
 * 获取http头中的文件名
 */
function makeSaveFile(headers) {
    let fileType = headers.get('content-type');
    let ext = "jpg";
    if (fileType.indexOf("png") !== -1) {
        ext = "png";
    }
    let name = moment().format('YYYYMMDDHHmmss') + "." + Math.floor(Math.random() * 100000) + "." + ext;
    let path = conf.savePath;
    return path + name;
}

/**
 * 下载图片.
 * 如果超时( 120秒 )，结束下载报错.
 * @return 下载好的文件
 */
function download(url) {
    return new Promise((S,J)=>{
        let isDone = false;
        let fileStream = null;
        let timeout = 1000 * 120;
        //超时检测
        setTimeout(()=>{
            PromiseDone( false, "download photo timeout!!" );
        },timeout);
        //包装S,J
        let PromiseDone = function( success,data ){
            if( !isDone ){
                isDone = true;
                return success ? S( data ) : J( data );
            }
        };
        //执行下载
        fetch(url, Object.assign({credentials: "same-origin"}))
            .then((res) => {
                //报错，直接挂掉
                if (!res.ok){
                    PromiseDone( false, "download photo error:" + res.status);
                }
                //保存到文件，返回新的Promise
                else{
                    let saveFile = makeSaveFile( res.headers );
                    fileStream = fs.createWriteStream( saveFile );
                    logger.debug( `downloading: ${saveFile}` );
                    res.body.pipe(fileStream);
                    res.body.on("error", (err) => PromiseDone(false,err));
                    fileStream.on("finish", function() {
                        fileStream.close();
                        PromiseDone( true, saveFile );
                    });
                }
            })
            .catch(( e )=>{
                PromiseDone( false,e );
            })
    });
}

/**
 * 随机抓取一个图片url
 * 并按照顺序挑选大小
 */
function randomPhoto(unsplash) {
    return new Promise((S,J)=>{
        logger.debug('getRandomPhoto.');
        let isDone = false;
        let randomTimeout = 15 * 1000;
        //15秒超时直接失败Promise,标记idDone
        setTimeout(()=>{
            if( !isDone ){
                J("unsplash getRandomPhoto timeout!");
                isDone = true;
            }
        },randomTimeout);
        //调用 Unsplash 接口
        unsplash.photos.getRandomPhoto({ orientation: "landscape" })
            .then(( res )=>{
                if( !isDone ){
                    S( res );
                    isDone = true;
                }
            })
            .catch(( e )=>{
                if( !isDone ){
                    J( e );
                    isDone = true;
                }
            });
    })
        .then(res => res.json())
        .then(res => {
            if (!_.isObject(res) || !_.has(res, 'urls') || _.isEmpty(res.urls)) {
                return Promise.reject('Unsplash API error: ' + JSON.stringify(res));
            }
            return res.urls;
        })
        .then((urls) => {
            logger.debug( `down size: ${ _.keys( urls ) }`);
            let url = null;
            urls.raw ? url = urls.raw : null;
            !url && urls.full ? url = urls.full : null;
            !url && urls.regular ? url = urls.regular : null;
            if (!url) {
                return Promise.reject(' wrong resolution!! ' + JSON.stringify(urls));
            }
            return url;
        })
}

/**
 导出
 */
module.exports = function( c,logger ){
    conf = c;
    if( !c ){
        throw new Error("missing conf!");
    }
    return start();
};