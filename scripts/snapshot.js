import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
async function scan(dir) { const files = []; for (const item of await readdir(dir, { withFileTypes:true })) { const path = `${dir}/${item.name}`; if (item.isDirectory()) files.push(...await scan(path)); else files.push({path, sha256:createHash('sha256').update(await readFile(path)).digest('hex')}); } return files; }
await writeFile('vendor/provenance.json', JSON.stringify({source:'BaseReutilizable',snapshot:'2026-09-23',notes:'Selected package sources and manifests, unchanged. No demos, installed clients or development environments copied.',files:(await scan('vendor')).filter(f=>!f.path.endsWith('provenance.json'))},null,2));
