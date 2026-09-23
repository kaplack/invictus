import { PrismaClient,Prisma } from '../prisma/client/index.js';
import { readConfig } from './config.js';
import { createApp } from './app.js';
const config=readConfig();const database=new PrismaClient();
await database.$connect();const app=await createApp({database,Prisma,config});
const server=app.listen(config.PORT,()=>console.log(`Invictus API: http://localhost:${config.PORT}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await database.$disconnect();process.exit(0);}));
