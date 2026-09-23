import { spawnSync } from 'node:child_process';
const test=process.argv.includes('--test');
const raw=test?process.env.TEST_DATABASE_URL:process.env.DATABASE_URL;
const u=new URL(raw); const target=`${u.hostname}:${u.port||5432}/${u.pathname.slice(1)}`;
if(process.env.CONFIRM_DATABASE!==target) throw new Error(`Confirma el destino con CONFIRM_DATABASE=${target}`);
if(test&&(!['localhost','127.0.0.1'].includes(u.hostname)||u.pathname!=='/invictus_test')) throw new Error('Pruebas permitidas únicamente en invictus_test local');
console.log('Aplicando migraciones versionadas a '+target);
const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit',env:{...process.env,DATABASE_URL:raw}});process.exit(result.status??1);
