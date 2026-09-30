import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { createServer, get } from 'node:http';
import { once } from 'node:events';
import { sendFileStream } from '../vendor/archivos-imagenes/src/send-stream.js';

test('Transferencia completa conserva el contenido', async () => {
  let content = '';
  await sendFileStream(Readable.from(['imagen']), new Writable({write(chunk, encoding, done) { content += chunk; done(); }}));
  assert.equal(content, 'imagen');
});

test('Cancelación HTTP del cliente cierra el origen sin propagar error', {timeout:5000}, async () => {
  let source;
  let finish;
  const completed = new Promise(resolve => { finish = resolve; });
  const server = createServer((req, res) => {
    source = new Readable({read() {}});
    sendFileStream(source, res).then(() => finish(null), finish);
    source.push(Buffer.alloc(1024));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await new Promise((resolve, reject) => {
      const request = get({host:'127.0.0.1',port:server.address().port}, response => {
        response.once('data', () => { response.destroy(); resolve(); });
      });
      request.on('error', reject);
    });
    assert.equal(await completed, null);
    assert.equal(source.destroyed, true);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('Errores de lectura y cierre prematuro del origen siguen propagándose', async () => {
  for (const code of ['EIO', 'ECONNRESET', 'ERR_STREAM_PREMATURE_CLOSE', null]) {
    const failure = code ? Object.assign(new Error('Fallo de origen'), {code}) : undefined;
    const source = new Readable({read() { this.destroy(failure); }});
    const response = new Writable({write(chunk, encoding, done) { done(); }});
    await assert.rejects(sendFileStream(source, response), {code:code || 'ERR_STREAM_PREMATURE_CLOSE'});
  }
});
