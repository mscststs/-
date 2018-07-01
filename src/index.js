import eve from "./events";
import {formatTime,store as log,sleep, getNowSeconds} from "./tools"
import api from "./api"
import originList from "./Origin_list.js"
const Json2csvParser = require('json2csv').Parser;
import fs from "fs";
import iconv from  "iconv-lite"

init();

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
    console.log("当前已获取 ： "+result.length+"条");
    if(result.length == 13000){
        //当全部获取完毕时
        Save();
    }
}
function Save(){
    console.log("当前已获取："+result.length);
    console.log("获取完毕，将保存为 result.csv ");
    result.sort((a,b)=>a.count-b.count);
    let json2csvParser = new Json2csvParser({ fields });
    let csv = json2csvParser.parse(result);
    let text = iconv.encode(csv,"GBK")
    fs.writeFile('result.csv', text,  function(err) {
        if (err) {
            console.error(err);
        }
        else{
            console.log("数据写入成功");
        }
    });
}

async function getInfo(uid,count,retry=0){
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
        let baseInfo = await api.origin({
            uri:"https://api.bilibili.com/x/web-interface/card",
            method:"get",
            form:{
                mid: uid,
                photo:"true"
            },
        });
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
            
            //user_info.regTime = formatTime(baseInfo.data.regtime*1000,"YYYY-MM-DD"); //注册时间 (无法获取)
        } 
        let relation  = await api.send("https://api.bilibili.com/x/relation/stat","get",{
            vmid:uid
        });
        if(relation.code==0){
            user_info.following = relation.data.following; //关注数量
            user_info.follower = relation.data.follower; //粉丝数量
        }

        let WatchInfo = await api.send("https://api.bilibili.com/x/space/upstat","get",{
            mid:uid
        });
        if(WatchInfo.code==0){
            user_info.watch = WatchInfo.data.archive.view+WatchInfo.data.article.view; //观看量
        }
        
        let star = await api.send("https://api.bilibili.com/x/space/fav/nav","get",{
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
            await getInfo(uid,count,retry+1);//重试
        }else{
            console.log(e.message);
            Save();
            process.exit();
        }
    }
}
async function init(){
    let count = 0;
    for(let uid of originList){
        count++;
        await getInfo(uid,count);
        //console.log("Now Progress: "+count);
        await sleep(400);
        if(api.thread >= 4 ){
            await sleep(20);
        }
    }
}
