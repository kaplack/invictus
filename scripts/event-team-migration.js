import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '../prisma/client/index.js';
import { eventTeamReport, mapEventTeams } from '../server/teams/event-migration.js';

const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const apply = args.includes('--apply');
const url = new URL(process.env.DATABASE_URL);
const destination = `${url.hostname}:${url.port || '5432'}/${url.pathname.slice(1)}`;
if (apply && process.env.CONFIRM_DATABASE !== destination) throw new Error(`Confirma el destino con CONFIRM_DATABASE=${destination}`);
if (apply && !value('--mapping')) throw new Error('--apply requiere --mapping con la asignación revisada');
const db = new PrismaClient();
try {
  if (value('--mapping')) {
    const mapping = JSON.parse(await readFile(resolve(value('--mapping')), 'utf8'));
    console.log(JSON.stringify({ destination, apply, results: await mapEventTeams(db, mapping, { apply }) }, null, 2));
  } else {
    const report = await eventTeamReport(db);
    const path = resolve(value('--report') || '.local/event-team-report.json');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ destination, ...report }, null, 2) + '\n');
    console.log(JSON.stringify({ destination, unassigned: report.unassigned, report: path }));
  }
} finally { await db.$disconnect(); }
