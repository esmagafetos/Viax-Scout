/**
 * SSE upload helper.
 *
 * The web app POSTs FormData to /api/process/upload (and /api/condominium/process)
 * and receives a stream of `event: <name>\ndata: {json}\n\n` chunks. React Native's
 * fetch does not expose a streaming body (`response.body` is null), so we use
 * XMLHttpRequest directly and parse `responseText` progressively as new bytes arrive.
 */
import { getBaseUrl, getSessionCookieSync, loadSession } from './api';

export interface SseFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

export interface SseUploadOptions {
  path: string;
  fieldName: string;
  file: SseFile;
  extraFields?: Record<string, string>;
  onEvent: (event: string, data: any) => void;
  onError?: (message: string) => void;
  onComplete?: () => void;
}

export async function sseUpload(opts: SseUploadOptions): Promise<XMLHttpRequest> {
  const cookie = getSessionCookieSync() ?? (await loadSession());
  const xhr = new XMLHttpRequest();
  const url = getBaseUrl().replace(/\/+$/, '') + opts.path;
  xhr.open('POST', url);
  xhr.setRequestHeader('Accept', 'text/event-stream');
  if (cookie) xhr.setRequestHeader('Cookie', cookie);

  let lastIndex = 0;
  let buffer = '';

  const flushBuffer = (finalChunk: boolean) => {
    if (xhr.readyState >= 3 && xhr.responseText && xhr.responseText.length > lastIndex) {
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += newText;
    }
    const parts = buffer.split('\n\n');
    buffer = finalChunk ? '' : (parts.pop() ?? '');
    for (const part of parts) {
      const lines = part.split('\n');
      let eventType = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataStr += line.slice(6).trim();
      }
      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        opts.onEvent(eventType, parsed);
      } catch {
        // ignore non-JSON
      }
    }
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3) flushBuffer(false);
    if (xhr.readyState === 4) {
      flushBuffer(true);
      if (xhr.status >= 400 && opts.onError) {
        opts.onError(`Erro ${xhr.status}: ${xhr.statusText || 'Falha no upload.'}`);
      }
      opts.onComplete?.();
    }
  };
  xhr.onerror = () => {
    opts.onError?.('Erro de conexão durante o upload.');
    opts.onComplete?.();
  };

  const fd = new FormData();
  fd.append(opts.fieldName, {
    uri: opts.file.uri,
    name: opts.file.name,
    type: opts.file.mimeType || 'application/octet-stream',
  } as any);
  if (opts.extraFields) {
    for (const [k, v] of Object.entries(opts.extraFields)) fd.append(k, v);
  }
  xhr.send(fd as any);
  return xhr;
}
