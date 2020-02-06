/*
* 主逻辑
* 负责开启flow进程，定时运行等.
* 对UI提供接口
* */
const { app} = require('electron');
const child_process = require('child_process');
const util = require('./lib/util');
const moment = require('moment');
let currFlow = null; //当前处理流进程
const events = require('events');
let eventCenter = new events.EventEmitter();
let doImmediately = false;

/*
* 创建一个处理流进程
* 并立即启动
* */
function newFlow( conf ){
    let flow = child_process.fork( app.getAppPath() + '/lib/flow.js');
    flow.send({ action:"start",conf:conf });
    return flow;
}

/*
* 强行停止当前执行
* 取消 下一轮定时
* 取消 flow执行定时器
* 发送终止 给flow进程
* */
function abort(){
    if( roundTimer ){
        clearTimeout( roundTimer );
        roundTimer = null;
    }
    if( flowTimer ){
        clearTimeout( flowTimer );
        flowTimer = null;
    }
    if( currFlow ){
        try{
            currFlow.send({ action:"abort" });
        }
        catch (e) {

        }
        currFlow = null;
    }
}

/**
 * flow汇报事件
 * {
 *     status: running,done,error
 * }
 */
function listenFlow( data ){
    //flow完成
    if( data.status === "done" ){
        console.log('done!!');
        currFlow = null;
        //事件通知更换壁纸事件
        eventCenter.emit('change',data);
        nextRound();
    }
    //flow退出
    if( data.status === "abort" ){
        currFlow = null;
    }
    //flow失败
    if( data.status === "error" ){
        currFlow = null;
        console.log('flow error:',data.msg);
        nextRound();
    }
}

/**
 * 执行一轮更换壁纸.
 */
let roundTimer = null;
let flowTimer= null;
function round( opt ){
    console.log('=======================');
    eventCenter.emit('log','running');
    let conf = null;
    opt = opt ||{};
    util.readConf()
        //计算下次运行时间，间隔 - （当前时间 - 上次完成）
        .then(( c )=>{
            conf = c;
            if( opt.immediately || (!doImmediately && conf.immediately) ){
                doImmediately = true;
                return 0;
            }
            else{
                let interval = conf.interval || 60 * 60; //默认1小时间隔
                return util.nextRunTime( interval );
            }
        })
        //开启定时器,启动流进程处理,流处理完毕会汇报
        .then(( t )=>{
            console.log('wait time:',t+"s","start flow.");
            eventCenter.emit('log','wait to ' + moment( (Date.now()) + t * 1000 ).format("HH:mm:ss") );
            flowTimer = setTimeout(()=>{
                eventCenter.emit('log','running' );
                currFlow = newFlow( conf );
                currFlow.on('message',listenFlow);
                //状态变更
            },t * 1000 );
        })
        //出错，继续下一轮
        .catch(( e )=>{
            console.log('error! ',e);
            nextRound();
        })
}
//10秒后下一轮
function nextRound(){
    console.log('waite 10s,next round!');
    eventCenter.emit('log','nextRound' );
    roundTimer = setTimeout(round,1000 * 2);
}

/**
 * 导出控制接口
 */
module.exports = {
    //启动运行
    start:function( opt ){
        round( opt );
    },
    //重启
    restart:function(){
        abort();
        this.start();
    },
    //监听壁纸变更
    on:function( event, cb ){
        eventCenter.on(event,cb);
    },
    //立即更换下一个壁纸,终止当前
    next:function(){
        let that = this;
        return new Promise(()=>{
            abort();
            util.finishTime(true)
                .then(()=>{
                    that.start( { immediately: true } );
                })
                .catch((e)=>{
                    console.log( e.toString() );
                });
        })
    },
};
