const yaml = require('js-yaml');
const fs   = require('fs');
const findRemoveSync = require('find-remove');

module.exports = {
    /**
     * 记录一轮成功时间.
     * 如果不串入参数，则是读取上一次完成时间.
     * 如果未记录上次时间，返回当前时间
     */
    finishTime:function( isUpdate ){
        let that = this;
        let file = that.downloadPath() + "latest";
        let nowSeconds = Math.floor((Date.now()) / 1000);
        return new Promise((S,J)=>{
            if( isUpdate ){
                fs.writeFile( file , nowSeconds, function(err) {
                    err ? J( err ) : S();
                });
            }
            else{
                fs.readFile(file, function (err, str) {
                    err ? J( err ) : S( parseInt( str ) || 0 );
                });
            }
        })
    },
    /**
     * 计算下一次执行时间
     * 间隔 - （当前时间 - 上次完成时间）
     */
    nextRunTime:function( interval ){
        let that = this;
        return new Promise(( S,J )=>{
            that.finishTime()
                .then(( lastTime )=>{
                    return lastTime || ( lastTime= Math.floor((Date.now()) / 1000) );
                })
                .then(( lastTime )=>{
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
    clearDownload:function(){
        let path = this.downloadPath();
        return new Promise(( S,J )=>{
            console.log('clear download:',path);
            findRemoveSync(path, {age: {seconds: 60},extensions:['.jpg','.png','.jpge'] });
            S();
        });
    },
    /**
     * 读取配置.
     * 填充默认下载路径为当前目录的 download下
     */
    readConf:function(){
        let that = this;
        return new Promise(function( S,J ){
            try {
                let conf = yaml.safeLoad(fs.readFileSync(process.cwd() + '/config.yml', 'utf8'));
                conf.savePath = that.downloadPath();
                S( conf );
            } catch (e) {
                J( e );
            }
        });
    },
    /**
     * 下载目录
     */
    downloadPath:function(){
        return process.cwd()+"/download/";
    },
};