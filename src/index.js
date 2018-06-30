import eve from "./events";
import {formatTime,store as log,sleep, getNowSeconds} from "./tools"
import store from "./store"
import api from "./api"

let Signal = [];
let MyAccount ;

init();
async function init(){
    IntervalSignal(); //初始化信号机
    ListenSignal(); //监听其他地方的信号

    await userLogin(true); // 等待用户登录
    IntervalSignal(false); //发送信号

}
async function userLogin(){
    try{
        await store.Init();
        MyAccount = new user("15351868617","mscststs@970518","两个");
        await MyAccount.Login(true);
        let eq = await api.use(MyAccount).send("https://api.live.bilibili.com/live_user/v1/UserInfo/get_info_in_room","get",{roomid:"6328840"});
        MyAccount.uid = eq.data.level.uid;
    }catch(e){
        eve.emit("log","UserLogin",e.message);
    }
    
}

function IntervalSignal(init=true){
    if(init){
        //初始化 
        setInterval(()=>{
            for(let s of Signal){
                if(s.using){
                    return;
                }
            }
            eve.emit("Rolling");
        },5*60*1e3);//五分钟一个信号
    }else{
        eve.emit("Rolling");
    }
}

function ListenSignal(){
    eve.on("Signal",(type,using)=>{
        let foundFlag = 0;
        for(let s of Signal){
            if(s.type == type){
                foundFlag = 1;
                s.using = using?true:false;
            }
        }
        if(!foundFlag){
            Signal.push({
                type,
                using:using?true:false
            })
        }
    });
    eve.on("log",(...data)=>{
        let s  = formatTime()+": ";
        for(let words of data){
            s+=words+" ";
        };
        console.log(s);
        log(s);
    })
    eve.on("Rolling",()=>{
        if(store.data.last){
            
            GetDocTillEnd(store.data.last+1);
        }else{
            eve.emit("log","Rolling Step","未指定最后的时间");
            GetDocTillEnd(5195269);
        }
    })
}
async function GetDocTillEnd(start_id){
    eve.emit("Signal","GetDoc",1);
    eve.emit("log","NewRolling","新的一轮开始了");
    let pr = [];
    for(let i = start_id;;i++){
        if(i%500==0){
            console.log("Rolling--"+i);
        }
        pr.push(getDoc(i));
        if(pr.length==100){
            let pr_result =await Promise.all(pr);
            let n = 0;
            let count = 0;
            for(let res of pr_result){
                if(res == true){
                    store.data.last = i-100+n; //当前编号
                    count++;
                }
                n++;
            }
            if(count<=10){
                break;
            }
            pr = [];
        }
    }  
    eve.emit("log","本次获取到抽奖条目",(RewardList.length));
    Resolve(RewardList);
    eve.emit("Signal","GetDoc",0);
    clearRewardList();
    store.Save();
}
async function isDangerUser(userid){
    try{
        let F = await api.send("https://api.bilibili.com/x/relation/stat","get",{
            vmid:userid,
        });
        if(F.code==0){
            if(F.data.following > F.data.follower){
                //粉丝数小于关注数
                return true;
            }
        }
        let Info = await api.origin({
            uri:"https://space.bilibili.com/ajax/member/GetInfo",
            method:"post",
            form:{
                mid: userid,
            },
            headers:{
                Host: "space.bilibili.com",
                Origin: "https://space.bilibili.com",
                Referer: "https://space.bilibili.com/"+userid+"/",
            }
        });
        if(F.code==0 && Info.status && Info.data.official_verify.type == -1 && F.follower<10000){
            //非认证账号且粉丝数小于一万
            return true;
        }
        let view = await api.send("https://api.bilibili.com/x/space/upstat","get",{
            mid:userid,
        });
        if(view.code==0){
            if(view.data.archive.view+view.data.article.view < F.data.follower){
                // 阅读+播放数 小于 粉丝数 
                return true;
            }
        }
    }catch(e){
        eve.emit("log","危险用户判定",e.message);
    }
    
    return false;
}
async function Resolve(RewardList){
    eve.emit("Signal","Resolve",1);
    let NowSeconds = getNowSeconds();
    for(let Reward of RewardList){
        if(Reward.item.ext.lott_cfg.lottery_time > NowSeconds){
            if(UserBlackList.indexOf(Reward.user.uid)>=0){
                eve.emit("log","黑名单","发现一个黑名单用户，不予操作");
                continue;
            }
            
            if(await isDangerUser(Reward.user.uid)){
                eve.emit("log","危险用户",`${Reward.user.uid}`);
                continue;
            }

            if(Reward.item.ext.lott_cfg.lottery_time < NowSeconds+60*60*10
                ||Reward.item.ext.lott_cfg.notice_msg.length<10&&(Reward.item.ext.lott_cfg.notice_msg.indexOf("测试">=0)||Reward.item.ext.lott_cfg.notice_msg.indexOf("test">=0))
            ){
                eve.emit("log","无营养的抽奖 "+Reward.dynamic_id);
                continue;
            }

            await Join(Reward,MyAccount);
            eve.emit("log","Reposted A Dynamic",Reward.dynamic_id);
            await sleep(30*1e3);
        }
    }
    store.update(data=>{
        if(!data.DelPrepare){
            data.DelPrepare = [];
        }
        data.DelPrepare.push(...RewardList);
    });
    TryDelete();
    RewardList = [];
    eve.emit("Signal","Resolve",0);
}
async function TryDelete(){
    eve.emit("Signal","TryDelete",1);
    let next = []
    for(let s of store.data.DelPrepare){
        if(s.item.ext.lott_cfg.lottery_time < (getNowSeconds()-(600))){ //开奖时间十分钟后
            //removeRepost(MyAccount,s.repost_id);
        }else{
            next.push(s);
        }
    }
    store.update(data=>{
        data.DelPrepare = next;
    });
    eve.emit("Signal","TryDelete",0);
}
async function Join(info,user){
    if(info.item.ext.lott_cfg.feed_limit){
        await attention(user,1,info.user.uid);
    }
    let re = await repost(info.item.ext.lott_cfg.at_num,0,1,user,info.dynamic_id);
    info.repost_id = re;
}
