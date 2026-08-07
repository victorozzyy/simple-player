/**
 * Proxy CORS local com follow de redirects (CDN Xtream).
 *   node proxy-server.js
 *   http://127.0.0.1:8787/?url=http://...
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8787;
const HOST = '127.0.0.1';
const MAX_REDIRECTS = 8;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
}

function rawRequest(target, reqHeaders) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(target);
    } catch (e) {
      reject(new Error('URL inválida'));
      return;
    }
    const lib = u.protocol === 'https:' ? https : http;
    const headers = {
      'User-Agent':
        reqHeaders['user-agent'] ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: '*/*'
    };
    if (reqHeaders.range) headers.Range = reqHeaders.range;

    const r = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers,
        timeout: 30000
      },
      (upstream) => resolve({ upstream, url: target })
    );
    r.on('error', reject);
    r.on('timeout', () => {
      r.destroy();
      reject(new Error('Timeout upstream'));
    });
    r.end();
  });
}

async function fetchFollow(target, reqHeaders) {
  let current = target;
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const { upstream, url } = await rawRequest(current, reqHeaders);
    const code = upstream.statusCode || 0;
    if ([301, 302, 303, 307, 308].includes(code) && upstream.headers.location) {
      upstream.resume();
      current = new URL(upstream.headers.location, url).href;
      continue;
    }
    return { upstream, finalUrl: current };
  }
  throw new Error('Muitos redirects');
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, usage: '/?url=http://servidor/stream.m3u8' }));
    return;
  }

  try {
    const incoming = new URL(req.url, `http://${HOST}:${PORT}`);
    const target = incoming.searchParams.get('url');
    if (!target) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Use /?url=https://...');
      return;
    }

    const { upstream, finalUrl } = await fetchFollow(target, req.headers);
    const status = upstream.statusCode || 502;
    const headers = {
      'X-Final-Url': finalUrl
    };
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((h) => {
      if (upstream.headers[h]) headers[h] = upstream.headers[h];
    });
    setCors(res);
    res.writeHead(status, headers);
    upstream.pipe(res);
  } catch (err) {
    setCors(res);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`IPTV CORS proxy em http://${HOST}:${PORT}`);
});
