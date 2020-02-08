const yaml = require('js-yaml');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const findRemoveSync = require('find-remove');
const winston = require('winston');
const moment = require('moment');

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
            .then(() => new Promise((S2, J2) => {
                    fs.readFile(file, 'utf8', function (err, str) {
                        if (err) {
                            return J2(err);
                        }
                        try {
                            str = str.trim();
                            return S2(str !== "" ? JSON.parse(str) : {});
                        } catch (e) {
                            return J2('latest parse error: ' ,e);
                        }
                    })
                })
            )
            //val有值则写入
            .then((info) => new Promise((S3, J3) => {
                    //写入
                    if (!_.isEmpty(newInfo)) {
                        info = newInfo;
                        fs.writeFile(file, JSON.stringify(newInfo), 'utf8', function (err) {
                            err ? J3(err) : S3(info);
                        });
                    } else {
                        S3(info);
                    }
                })
            )
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
                .catch(e=>J(e));
        });
    },
    /**
     * 清除下载文件.
     * 会将 1分钟 前的文件删除
     */
    clearDownload: function () {
        let path = this.downloadPath();
        return new Promise((S, J) => {
            findRemoveSync(path, {age: {seconds: 60}, extensions: ['.jpg', '.png', '.jpge']});
            S();
        });
    },
    /**
     * 创建一个error级别以上写入文件，debug级别输出console的日志
     */
    createLogger:function( outputFileName ){
        let path = this.logPath();
        return new winston.createLogger({
            transports: [
                new winston.transports.File({
                    level: 'error',
                    filename: `${path}/${outputFileName}.log`,
                    handleExceptions: true,
                    maxsize: 52428800, // 5MB
                    maxFiles: 5,
                    colorize: false,
                }),
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    colorize: true,
                    json: false,
                    format: winston.format.combine(
                        winston.format.printf(info => {
                            // you can get splat attribue here as info[Symbol.for("splat")]
                            // if you custome splat please rem splat() into createLogger()
                            return `${moment().format("YYYY-MM-DD HH:mm:ss")} ${info.level}: ${ info.message }`;
                        })
                    )
                })
            ],
            exitOnError: false, // do not exit on handled exceptions
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
    logPath: function () {
        return process.cwd() + "/log/";
    }
};