import rq from "request-promise-native"
import {sleep,isJSON} from "./tools"
import tough from "tough-cookie";
import eve from "./events"
import JSONB from "json-bigint"
const WEB_Interface={
    detail:"https://api.vc.bilibili.com/link_draw/v1/doc/detail"
}




class api{
    constructor(){
        this.ts = 0;
        this.thread = 0;
    }
    async origin(options){ 
        /* 全局请求定向到这个函数，方便以后重构到多CDN高并发 */
        let s = (new Date()).valueOf(); //获取当前毫秒时间戳
        if(this.thread >= 4){
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
            uri,
            qs:data,
            form:data,
            timeout:2000,
        };
        return await this.origin(config);
    }
    async getTopic(number){
        let config = {
            method:"get",
            uri:WEB_Interface.detail,
            qs: {doc_id:number},
            form:{doc_id:number},
            timeout:2000,
        };
        return await this.origin(config);
    }

};

let MYAPI = new api();

export default MYAPI;