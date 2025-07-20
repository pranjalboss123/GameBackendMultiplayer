import { redis } from './redis';
const STATUS = 'player_status';
export const setStatus = (u,s)=>redis.hset(STATUS,u,s);
export const getStatus = u=>redis.hget(STATUS,u);
export const removeStatus = u=>redis.hdel(STATUS,u);