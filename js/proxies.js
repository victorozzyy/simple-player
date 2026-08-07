/* Fetch com proxies CORS (HTTP/HTTPS) */
window.IPTV = window.IPTV || {};

IPTV.proxies = {
  build(url, mode) {
    const builder = IPTV.PROXY_BUILDERS[mode] || IPTV.PROXY_BUILDERS.none;
    return builder(url);
  },

  modesFor(preferred) {
    return preferred === 'auto' ? IPTV.AUTO_ORDER.slice() : [preferred];
  },

  async fetchText(url, preferredMode) {
    const modes = this.modesFor(preferredMode);
    let lastError = null;
    for (const mode of modes) {
      try {
        const result = await this.fetchTextOnce(url, mode);
        IPTV.ui.setProxyBadge(mode);
        return result;
      } catch (err) {
        lastError = err;
        IPTV.ui.log(`Falha em ${mode}: ${err.message}`);
      }
    }
    throw lastError || new Error('Falha ao baixar recurso');
  },

  /**
   * @returns {{ text: string, mode: string, finalUrl: string }}
   */
  async fetchTextOnce(url, mode) {
    const finalUrlReq = this.build(url, mode);
    IPTV.ui.log(`Tentando fetch (${mode}): ${finalUrlReq.slice(0, 140)}...`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IPTV.FETCH_TIMEOUT_MS);

    const res = await fetch(finalUrlReq, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow'
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    let text = await res.text();
    if (!text || text.length < 2) throw new Error('Resposta vazia');

    if (!/#EXT/i.test(text) && !/^\s*[\[{]/.test(text)) {
      try {
        const j = JSON.parse(text);
        if (j.contents) text = j.contents;
        else if (j.data) text = typeof j.data === 'string' ? j.data : JSON.stringify(j.data);
      } catch (_) { /* ignore */ }
    }

    if (/<!DOCTYPE html|<html[\s>]/i.test(text) && !/#EXTM3U/i.test(text) && !/^\s*[\[{]/.test(text)) {
      throw new Error('Proxy retornou HTML, não dados');
    }

    // URL final após redirects (essencial para /hls/... no host CDN)
    // Proxy local envia X-Final-Url com o host real (CDN/token)
    const headerFinal = res.headers.get('X-Final-Url') || res.headers.get('x-final-url');
    const responseUrl = headerFinal || res.url || url;

    return { text, mode, finalUrl: responseUrl };
  },

  async fetchJson(url, preferredMode) {
    const { text, mode, finalUrl } = await this.fetchText(url, preferredMode);
    try {
      return { data: JSON.parse(text), mode, finalUrl };
    } catch (e) {
      throw new Error('Resposta não é JSON válido');
    }
  },

  resolveUrl(base, relative) {
    try {
      return new URL(relative, base).href;
    } catch (_) {
      return relative;
    }
  }
};
