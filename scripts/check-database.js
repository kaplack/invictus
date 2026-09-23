import pg from 'pg';
for(const key of ['DATABASE_URL','TEST_DATABASE_URL']) {
 const u=new URL(process.env[key]);
 if(u.hostname!=='localhost'||(u.port||'5432')!=='5432'||!['/invictus','/invictus_test'].includes(u.pathname)) throw new Error('Destino distinto del confirmado');
 const db=new pg.Client({connectionString:u.href});
 try{await db.connect();const r=await db.query('SELECT current_database() AS database, count(*)::int AS tables FROM information_schema.tables WHERE table_schema=$1',[u.searchParams.get('schema')||'public']);console.log(r.rows[0]);}
 catch(e){console.log({variable:key,code:e.code||'CONNECTION_ERROR'});}finally{await db.end();}
}
