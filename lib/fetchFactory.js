const nodeFetch = require("node-fetch");
const HttpsProxyAgent = require('https-proxy-agent');
const socks5Fetch = require("socks5-node-fetch");
const _ =  require("lodash");
/**
 * http proxy wrapped
 */
function httpProxy( proxy ){
    return function( url,opt ){
        opt = opt || {};
        opt.agent = new HttpsProxyAgent('http://' + proxy.address + ':' + proxy.port);
        return nodeFetch( url,opt );
    }
}
/**
 * return wrapped fetch  with different proxy。
 * support poxy:
 * 1. http/https
 * 2. socks5
 * proxy info:
 * {
 *     type: http,socks5,
 *     address: proxy address. default 127.0.0.1
 *     port: proxy port. default 1080
 * }
 * @param   proxy   object  proxy info.
 */
module.exports = function( proxy ){
    proxy = proxy || {};
    //check proxy information
    if( proxy.type && _.indexOf( ['http','socks5'],proxy.type) === -1 ){
        throw new Error("proxy information error! " + JSON.stringify( proxy ));
    }
    //proxy default
    proxy.address = proxy.address || "127.0.0.1";
    proxy.port = proxy.port || 1080;
    //return http proxy fetch
    if( proxy.type === "http" ){
        return httpProxy( proxy );
    }
    //return socks5 proxy fetch
    if( proxy.type === "socks5" ){
        return socks5Fetch({
            socksHost: proxy.address,
            socksPort: proxy.port
        })
    }
    //standard fetch.
    return nodeFetch;
};