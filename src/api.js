import rq from "request-promise-native"
import {sleep,isJSON} from "./tools"
import tough from "tough-cookie";
const http = require('http');
const dns = require('dns');
const net = require('net');
import JSONB from "json-bigint"

const CDNs = `113.133.46.196,119.29.47.156,193.112.234.101,120.92.218.109,111.231.212.88,111.230.84.45,59.53.86.4,140.249.9.7,140.143.82.138,111.230.85.89,122.228.77.85,118.89.74.45,118.89.128.160,211.159.214.11,118.89.74.220,120.92.174.135,112.117.218.167,111.230.84.59,112.25.54.213,140.249.9.4,114.80.223.172,114.80.223.177,111.231.211.246,27.221.61.100,221.13.201.9,27.221.61.109,113.207.83.212,120.192.82.106,58.222.35.202,101.200.58.11,140.143.177.142,170.33.36.101,61.147.236.15,123.206.1.201,120.92.78.97`.split(",");



class api{
    constructor(ip){
        this.ts = 0;
        this.thread = 0;
        this.ip = ip;
        this.agent = new http.Agent({ keepAlive: true });
        this.agent.createConnection=(options,callback)=>{
            //重写createConnection函数,强制使用自定义ip
            options.lookup = (hostname, options, callback)=>{
                const ip = this.ip;
                if (ip === '') {
                    return dns.lookup(hostname, options, callback);
                }
                return callback(null, ip, 4);
            };
            return net.createConnection(options, callback)
        }
    }
    async origin(options){ 
        /* 全局请求定向到这个函数，方便以后重构到多CDN高并发 */
        let s = (new Date()).valueOf(); //获取当前毫秒时间戳
        if(this.thread >= 2){
            /* 并发限制，不得超过7 */
            await sleep(200);
            return this.origin(options);
        }
        if(s - this.ts < 70){
            /* 频率限制，不得超过50 */
            await sleep(50);
        }
        this.ts = s;
        this.thread++;
        let res;
        try{
            res = await rq(options);//必须返回request-promise模块的promise
            //必须放置在try块中，否则会抛出错误导致thread死锁
            if(isJSON(res)){
                res = JSONB.parse(res);
            }
        }catch(e){
            throw e;
        }finally{
            this.thread--;
        }
        
        
        return res;
    }
    async send(uri,method="get",data={}){
        let config = {
            method,
            uri:`http://${this.ip}/${uri}`,
            qs:data,
            form:data,
            timeout:2000,
            agent:this.agent,
            headers:{
                'host': 'api.bilibili.com'
            }
        };
        return await this.origin(config);
    }
    async getTTR(){
        let time = (new Date()).valueOf();
        try{
            let k=await this.send("x/web-interface/card","get",{
                mid:179053897,
                photo:true
            });
            //console.log(k);
            if(typeof(k.code)!=="undefined"&&k.code==0){
                time =  (new Date()).valueOf() - time;
                return time;
            }
        }catch(e){
            //console.log(e.message);
        }
        return 100000;
    }
};

let MYAPIs = [];
for(let ip of CDNs){
    let a = new api(ip);
    MYAPIs.push(a);
}
export default MYAPIs;