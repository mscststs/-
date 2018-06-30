import fs from "fs"
import JSONB from  "JSON-bigint"


function  sleep(ms){
    return new Promise(reject=>{
        setTimeout(()=>{reject(ms)},ms);
    })
}
function store(text){
    //console.log("=====")
    fs.appendFile('log.txt',text+"\r\n",'utf8',function(err){  
        if(err)  
        {  
            console.log(err);  
        }  
    });  
}
function isJSON(str) {
    if (typeof str == 'string') {
        try {
            var obj=JSONB.parse(str);
            if(typeof obj == 'object' && obj ){
                return true;
            }else{
                return false;
            }

        } catch(e) {
            //console.log('error：'+str+'!!!'+e);
            return false;
        }
    }
    return false;
    //console.log('It is not a string!')
}
function formatTime(date = new Date(), fmt = "YYYY-MM-DD HH:mm:ss") {
    date = typeof date === "number" ? new Date(date) : date;
    var o = {
      "M+": date.getMonth() + 1,
      "D+": date.getDate(),
      "h+": date.getHours() % 12 === 0 ? 12 : date.getHours() % 12,
      "H+": date.getHours(),
      "m+": date.getMinutes(),
      "s+": date.getSeconds(),
      "q+": Math.floor((date.getMonth() + 3) / 3),
      S: date.getMilliseconds()
    };
    var week = {
      "0": "\u65e5",
      "1": "\u4e00",
      "2": "\u4e8c",
      "3": "\u4e09",
      "4": "\u56db",
      "5": "\u4e94",
      "6": "\u516d"
    };
    if (/(Y+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (date.getFullYear() + "").substr(4 - RegExp.$1.length)
      );
    }
    if (/(E+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (RegExp.$1.length > 1
          ? RegExp.$1.length > 2 ? "\u661f\u671f" : "\u5468"
          : "") + week[date.getDay() + ""]
      );
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1
            ? o[k]
            : ("00" + o[k]).substr(("" + o[k]).length)
        );
      }
    }
    return fmt;
  }

  function getNowSeconds(){
      return Date.parse(new Date())/1000;
  }

export {sleep,store,isJSON,formatTime,getNowSeconds}