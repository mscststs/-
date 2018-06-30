import eve from "./events";
import {formatTime,store as log,sleep, getNowSeconds} from "./tools"
import api from "./api"
import originList from "./Origin_list.json"

init();

async function getInfo(uid){

}
async function init(){
    let 
    for(let uid of originList){
        getInfo(uid);
    }
}
