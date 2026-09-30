import { pipeline } from 'node:stream/promises';

// Observe the origin of the close before pipeline tears down both streams.
export async function sendFileStream(source, response) {
  let clientClosed = false;
  let sourceFailed = false;
  const sourceError = () => { if (!clientClosed) sourceFailed = true; };
  const sourceClose = () => { if (!clientClosed && !source.readableEnded) sourceFailed = true; };
  const responseClose = () => {
    if (!response.writableFinished && !sourceFailed && !source.errored) clientClosed = true;
  };
  source.on('error', sourceError);
  source.on('close', sourceClose);
  response.on('close', responseClose);
  try {
    await pipeline(source, response);
  } catch (error) {
    if (clientClosed && ['ERR_STREAM_PREMATURE_CLOSE', 'ECONNRESET'].includes(error.code)) return;
    throw error;
  } finally {
    source.off('error', sourceError);
    source.off('close', sourceClose);
    response.off('close', responseClose);
  }
}
