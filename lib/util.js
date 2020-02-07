const yaml = require('js-yaml');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const findRemoveSync = require('find-remove');

module.exports = {
    /**
     * 记录一轮成功时间.
     * 如果不串入参数，则是读取上一次完成时间.
     * 如果未记录上次时间，返回当前时间
     */
    latestInfo: function (newInfo) {
        let file = this.downloadPath() + "latest";
        return new Promise((S, J) => {
            fse.ensureFile(file, function (err) {
                err ? J( err ) : S();
            });
        })
            //先全部读取出来
            .then(() => {
                return new Promise((S, J) => {
                    fs.readFile(file,'utf8', function (err, str) {
                        let info = null;
                        try{
                            info = str ? JSON.parse( str ) : {};
                        }
                        catch (e) {
                            return J('file content error!');
                        }
                        err ? J(err) : S( info );
                    });
                })
            })
            //val有值则写入
            .then(( info ) => {
                return new Promise((S,J)=>{
                    //写入
                    if (typeof (newInfo) !== "undefined") {
                        info = newInfo;
                        fs.writeFile(file, JSON.stringify(newInfo),'utf8', function (err) {
                            err ? J(err) : S( info );
                        });
                    }
                    else{
                        S( info );
                    }
                })
            })
    },
    /**
     * 计算下一次执行时间
     * 间隔 - （当前时间 - 上次完成时间）
     */
    nextRunTime: function (interval) {
        let that = this;
        return new Promise((S, J) => {
            that.latestInfo()
                .then(( info ) => {
                    return _.has( info,"changeTime" ) ? info.changeTime : Math.floor((Date.now()) / 1000);
                })
                .then((lastTime) => {
                    let nowSeconds = Math.floor((Date.now()) / 1000);
                    let diff = nowSeconds - lastTime;
                    let time = interval - diff;
                    return S(time < 0 ? 0 : time);
                })
        });
    },
    /**
     * 清除下载文件.
     * 会将 1分钟 前的文件删除
     */
    clearDownload: function () {
        let path = this.downloadPath();
        return new Promise((S, J) => {
            console.log('clear download:', path);
            findRemoveSync(path, {age: {seconds: 60}, extensions: ['.jpg', '.png', '.jpge']});
            S();
        });
    },
    /**
     * 读取配置.
     * 填充默认下载路径为当前目录的 download下
     */
    readConf: function () {
        let that = this;
        return new Promise(function (S, J) {
            try {
                let conf = yaml.safeLoad(fs.readFileSync(process.cwd() + '/config.yml', 'utf8'));
                conf.savePath = that.downloadPath();
                S(conf);
            } catch (e) {
                J(e);
            }
        });
    },
    /**
     * 下载目录
     */
    downloadPath: function () {
        return process.cwd() + "/download/";
    },
};