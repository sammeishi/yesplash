/*
* 加载一张图片
* 运行在独立线程中.
* */
const fetchFactory = require('./fetchFactory');
const Unsplash = require('unsplash-js').default;
const FileSaver = require('file-saver');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
let conf = null;

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
            console.log('download url:',url);
            return download( url );
        })
        .then(( photoFile )=>{
            console.log('donwload ok:',photoFile);
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
 * 下载图片
 * @return 下载好的文件
 */
function download(url) {
    return fetch(url, Object.assign({credentials: "same-origin"}))
        .then((res) => {
            if (!res.ok){
                return Promise.reject("download photo error:" + res.status);
            }
            else{
                let saveFile = makeSaveFile( res.headers );
                let fileStream = fs.createWriteStream( saveFile );
                console.log( "downloading:",saveFile );
                return new Promise((resolve,reject)=>{
                    res.body.pipe(fileStream);
                    res.body.on("error", (err) => {
                        reject(err);
                    });
                    fileStream.on("finish", function() {
                        fileStream.close();
                        resolve( saveFile );
                    });
                })
            }
        });
}

/**
 * 随机抓取一个图片url
 * 并按照顺序挑选大小
 */
function randomPhoto(unsplash) {
    return unsplash.photos.getRandomPhoto({ orientation: "landscape" })
        .then(res => res.json())
        .then(res => {
            if (!_.isObject(res) || !_.has(res, 'urls') || _.isEmpty(res.urls)) {
                return Promise.reject('Unsplash API error: ' + JSON.stringify(res));
            }
            return res.urls;
        })
        .then((urls) => {
            console.log( "down size:", _.keys(urls) );
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
module.exports = function( c ){
    conf = c;
    if( !c ){
        throw new Error("missing conf!");
    }
    return start();
};