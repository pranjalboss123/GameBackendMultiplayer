import { redis } from './redis';
import { setStatus, removeStatus } from './playerStore';
import { matchQueue } from './queue';
const QUEUE='matchmaking_queue';
const score=(l,r)=>l*1000+r;
export async function addPlayer(u,l,r){
  const data=JSON.stringify({u,l,r});
  await redis.zadd(QUEUE,score(l,r),data);
  await setStatus(u,'matchmaking');
  await matchQueue.add('match-task', {});
}
export async function removePlayer(u){
  const all=await redis.zrange(QUEUE,0,-1);
  for(const p of all){const o=JSON.parse(p); if(o.u===u){await redis.zrem(QUEUE,p); await removeStatus(u); return true;}}
  return false;
}
export async function findAndMatchPlayers(){
  const all=await redis.zrange(QUEUE,0,-1);
  for(let i=0;i<all.length-1;i++){
    const p1=JSON.parse(all[i]), p2=JSON.parse(all[i+1]);
    if(Math.abs(p1.l-p2.l)<=2 && Math.abs(p1.r-p2.r)<=1){
      await redis.zrem(QUEUE,all[i],all[i+1]);
      await setStatus(p1.u,'started');
      await setStatus(p2.u,'started');
      const { createSession } = await import('./sessionManager');
      const sid = await createSession(p1.u,p2.u);
      // notify via Socket.io
      import('../socket').then(s=>s.io.to(sid).emit('matched',{sessionId:sid,players:[p1.u,p2.u]}));
      return;
    }
  }
}