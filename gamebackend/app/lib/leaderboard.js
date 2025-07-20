import { redis } from './redis';
const CK='leaderboard:cache', TTL=60;
export async function getGlobal(){
  const c=await redis.get(CK);
  if(c) return JSON.parse(c);
  const raw=await redis.zrevrange('leaderboard:global',0,9,'WITHSCORES');
  const out=[]; for(let i=0;i<raw.length;i+=2) out.push({playerId:raw[i],score:+raw[i+1]});
  await redis.set(CK,JSON.stringify(out),'EX',TTL);
  return out;
}
export async function getPlayer(u){
  const h=await redis.hgetall(`player:${u}:score`);
  const his=await redis.lrange(`player:${u}:history`,0,-1);
  const r= await redis.zrevrank('leaderboard:global',u);
  return {playerId:u,rank:r!==null?r+1:null,totalScore:+h.total||0,totalWins:+h.wins||0,history:his};
}