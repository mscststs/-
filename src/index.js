import {formatTime,store as log,sleep, getNowSeconds} from "./tools"
import apis from "./api"
import originList from "./Origin_list.js"
const Json2csvParser = require('json2csv').Parser;
import fs from "fs";
import iconv from  "iconv-lite"
import MYAPIs from "./api";


const start_number = 9931;
const startTime = getNowSeconds();

let result = [];//用以保存最终文件的数组
const fields = [
    {
        label:"序号",
        value:"count"
    },
    {
        label:"UID",
        value:"uid"
    },
    {
        label:"获奖等级",
        value:"award_level"
    },
    {
        label:"头像",
        value:"face"
    },
    {
        label:"主站等级",
        value:"MainSiteLevel"
    },
    {
        label:"昵称",
        value:"name",
    },
    {
        label:"签名",
        value:"sign",
    },
    {
        label:"是否大会员",
        value:"isVip",
    },
    {
        label:"大会员类别",
        value:"vipType"
    },
    {
        label:"关注数",
        value:"following",
    },
    {
        label:"粉丝数",
        value:"follower",
    },
    {
        label:"观看量",
        value:"watch"
    },
    {
        label:"收藏视频数",
        value:"starCount"
    },

]

function SaveResult(info){
    result.push(info);
    console.clear();

    let End = Math.round((getNowSeconds()-startTime)/(info.count - start_number) * (13000-info.count));//尚余时间
    console.log("当前已获取 ： "+result.length+"条 ; 预计还需要 "+End+" 秒" );
}
function Save(isEnd = false){
    console.log("当前已获取："+result.length);
    console.log("将保存为 result.csv ");
    let json2csvParser = new Json2csvParser({ fields });
    let csv = json2csvParser.parse(result);
    let text = iconv.encode(csv,"GBK")
    fs.writeFile('result.csv', text,  (err)=>{
        if (err) {
            console.error(err);
        }
        else{
            console.log("数据写入成功");
            if(isEnd){
                process.exit(0);
            }
        }
    });
}

async function getInfo(api,uid,count,retry=0){
    let award_level = "三等奖";
    if(count <=1000){
        award_level = "一等奖";
    }else if(count <= 3000){
        award_level = "二等奖";
    }
    let user_info = {
        uid, // 用户uid
        count, // 排序
        award_level, // 获奖等级

    };

    try{
        let baseInfo = await api.send(
            "x/web-interface/card",
            "get",
            {
                mid: uid,
                photo:"true"
            }
        );
        // console.log(baseInfo);
        if(baseInfo.code==0){
            if(baseInfo.data.card.face.indexOf("noface.gif")>=0){
                user_info.face = "无头像";
            }else{
                user_info.face = baseInfo.data.card.face
            }
            user_info.MainSiteLevel = baseInfo.data.card.level_info.current_level;//主站等级
            user_info.name = baseInfo.data.card.name;//昵称
            user_info.sign = baseInfo.data.card.sign; //签名
            user_info.isVip = baseInfo.data.card.vip.vipStatus; //是否大会员
            user_info.vipType =  baseInfo.data.card.vip.vipStatus?baseInfo.data.card.vip.vipType:0; //大会员种类
            
            //user_info.regTime = formatTime(baseInfo.data.regtime*1000,"YYYY-MM-DD"); //注册时间 (无法获取)
        } 
        let relation  = await api.send("x/relation/stat","get",{
            vmid:uid
        });
        if(relation.code==0){
            user_info.following = relation.data.following; //关注数量
            user_info.follower = relation.data.follower; //粉丝数量
        }

        let WatchInfo = await api.send("x/space/upstat","get",{
            mid:uid
        });
        if(WatchInfo.code==0){
            user_info.watch = WatchInfo.data.archive.view+WatchInfo.data.article.view; //观看量
        }
        
        let star = await api.send("x/space/fav/nav","get",{
            mid:uid
        });
        if(star.code==0){
            let starCount = 0;
            for(let bag of star.data.archive){
                starCount+=bag.cur_count;
            }
            user_info.starCount = starCount; //收藏夹收藏视频计数
        }


        //上面的操作没有报错
        SaveResult(user_info);
    }catch(e){
        if(retry<=5){
            await sleep(200);
            await getInfo(api,uid,count,retry+1);//重试
        }else{
            console.log(e.message);
            Save();
        }
    }
}
async function init(){
    setInterval(function(){
        Save();
    },60e3);//每分钟自动保存一次

    let apiList  = await getUsefulAPIs(apis);
    console.log("有效CDN个数："+apiList.length);
    await sleep(2000);
    // process.exit(0);
    for(let count = start_number;count<13000;){
        let block = [];
        for(let api of apiList){
            let s = count;
            block.push(getInfo(api,originList[s],s));
            count++;
            if(count >= 13000){
                break;
            }
        }
        await Promise.all(block);
        await sleep(2000);
    }
    Save(true);
}
async function getUsefulAPIs(apis){
    console.log("开始测试CDN列表");
    let pr = [];
    for(let api of apis){
        pr.push(api.getTTR());
    }
    let useful = [];

    let result =await  Promise.all(pr);
    for(let count = 0;count < result.length;count++){
        if(result[count]<=1000){
            useful.push(apis[count]);
        }
    }
    return useful;
    //返回有效api列表
}
init();