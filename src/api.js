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
    use(user){
        if(user.isLogin){
            let sma = {
                eve:eve,
                user:user,
                headers:{
                    'host': 'api.live.bilibili.com',
                    
                },
                ori_rq:this.origin,
                cookies:user.cookies,
                send:function(uri,method="get",data,retry=0){
                    let options = {
                        method,
                        uri:uri,
                        qs: data,
                        form:data,
                        headers: this.headers,
                        timeout:2000,
                    };
                    return this.origin(options).then((res)=>{
                        if(res.code === 0){
                            return res;
                        }else{
                            /* Un normal */
                            if(res.code===-101){
                                this.eve.emit("user_validate",this.user);
                            }
                            return res;
                        }
                    }).catch((e)=>{
                        
                        if(retry < RETRY_LIMIT){
                            return this.send(uri,method,data,retry+1);
                        }
                        throw new Error("网络异常");
                    });
                },
                origin:function(options){
                    let jar = new rq.jar();
                    let domain = options.uri.match(/https?:\/\/([^\/]+)/i)[0];
                    domain = domain.substr(domain.indexOf(":")+3,1000);
                    if( !(this.cookies&&this.cookies.cookies)){
                        //console.log(options);
                        throw new Error(`${this.user.name} cookies不存在`);
                    }
                    for(let ck of this.cookies.cookies){
                        let cookie = new tough.Cookie({
                            key: ck.name,
                            value: ck.value,
                            domain: domain,
                            httpOnly: ck.http_only==true,
                            expires : new Date(ck.expires*1000),
                        });
                        jar.setCookie(cookie+"",options.uri);
                        //我不知道发生了什么，反正将cookie转成字符串就可以工作了！！！

                    }
                    options.jar = jar;
                    if(!options.headers){
                        options.headers={
                            "Referer": "https://t.bilibili.com/",
                            "User-Agent":" Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
                        }
                    }
                    
                    return this.ori_rq(options);;
                }
            }
            return sma;
        }else{
            throw new Error("未登陆");
        }
    }
    async origin(options){ 
        /* 全局请求定向到这个函数，方便以后重构到多CDN高并发 */
        let s = (new Date()).valueOf(); //获取当前毫秒时间戳
        if(this.thread >= 7){
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