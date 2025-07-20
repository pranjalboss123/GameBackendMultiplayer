import { redis } from './redis';
import { v4 as uuidv4 } from 'uuid';
import { setStatus, removeStatus } from './playerStore';
const TTL=300;
export async function createSession(p1,p2){
  const sid=uuidv4(), key=`session:${sid}`;
  const players=[p1,p2], scores={ [p1]:0, [p2]:0 };
  await redis.hset(key,{players:JSON.stringify(players),score:JSON.stringify(scores),status:'ongoing',startedAt:Date.now()});
  await redis.expire(key,TTL);
  return sid;
}
export async function getSession(id){
  const key=`session:${id}`, h=await redis.hgetall(key);
  if(!h.players) return null;
  return { players:JSON.parse(h.players), score:JSON.parse(h.score), status:h.status, startedAt:+h.startedAt, endTime:h.endTime };
}
export async function updateScore(id,u,delta){
  const s=await getSession(id); if(!s||s.status!=='ongoing'||!(u in s.score)) return null;
  s.score[u]+=delta;
  await redis.hset(`session:${id}`,'score',JSON.stringify(s.score));
  import('../socket').then(s=>s.io.to(id).emit('score',{player:u,score:s.score}));
  return s.score;
}
export async function completeSession(id){
  const s=await getSession(id); if(!s||s.status==='completed') return null;
  const key=`session:${id}`;
  await redis.hset(key,'status','completed','endTime',Date.now());
  const winner=Object.entries(s.score).sort((a,b)=>b[1]-a[1])[0][0];
  for(const u of s.players){
    await redis.hincrby(`player:${u}:score`,'total',s.score[u]);
    if(u===winner) await redis.hincrby(`player:${u}:score`,'wins',1);
    await redis.lpush(`player:${u}:history`,id);
    await redis.zadd('leaderboard:global',s.score[u],u);
  }
  await redis.del('leaderboard:cache');
  import('../socket').then(s=>s.io.to(id).emit('complete',{winner,scores:s.score}));
  return {winner,scores:s.score};
}