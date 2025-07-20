import { Queue, Worker } from 'bullmq';
import { redis } from './redis';
export const matchQueue = new Queue('matchmaking', { connection: redis });

new Worker('matchmaking', async job => {
  if (job.name === 'match-task') await import('./matchmaker').then(m => m.findAndMatchPlayers());
  if (job.name === 'auto-complete-session') {
    const { sessionId } = job.data;
    const { getSession, completeSession } = await import('./sessionManager');
    const s = await getSession(sessionId);
    if (s?.status === 'ongoing') await completeSession(sessionId);
  }
}, { connection: redis });