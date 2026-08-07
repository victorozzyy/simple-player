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

  /**
   * Baixa texto (playlist) tentando vários proxies.
   * @returns {{ text: string, mode: string }}
   */
  async fetchText(url, preferredMode) {
    const modes = this.modesFor(preferredMode);
    let lastError = null;

    for (const mode of modes) {
      const finalUrl = this.build(url, mode);
      try {
        IPTV.ui.log(`Tentando fetch (${mode}): ${finalUrl.slice(0, 140)}...`);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), IPTV.FETCH_TIMEOUT_MS);

        const res = await fetch(finalUrl, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
          mode: 'cors',
          credentials: 'omit'
        });
        clearTimeout(timer);

        if (!res.ok) throw new Error('HTTP ' + res.status);

        let text = await res.text();
        if (!text || text.length < 10) throw new Error('Resposta vazia');

        // Alguns proxies devolvem JSON { contents: "..." }
        if (!/#EXT/i.test(text)) {
          try {
            const j = JSON.parse(text);
            if (j.contents) text = j.contents;
            else if (j.data) text = j.data;
          } catch (_) { /* não é JSON */ }
        }

        // Página HTML de erro disfarçada
        if (/<!DOCTYPE html|<html[\s>]/i.test(text) && !/#EXTM3U/i.test(text)) {
          throw new Error('Proxy retornou HTML, não playlist');
        }

        IPTV.ui.setProxyBadge(mode);
        return { text, mode };
      } catch (err) {
        lastError = err;
        IPTV.ui.log(`Falha em ${mode}: ${err.message}`);
      }
    }

    throw lastError || new Error('Falha ao baixar playlist');
  },

  /** Candidatos de URL para reprodução de stream */
  streamCandidates(url, preferredMode) {
    const modes = this.modesFor(preferredMode);
    return modes.map((mode) => ({ mode, url: this.build(url, mode) }));
  }
};
