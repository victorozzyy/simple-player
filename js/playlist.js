/* Parse M3U e carregamento de listas */
window.IPTV = window.IPTV || {};

IPTV.playlist = {
  parseM3U(text) {
    const lines = String(text).split(/\r?\n/);
    const channels = [];
    let current = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        current = { name: 'Canal', group: 'Geral', logo: '', url: '' };

        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) current.name = nameMatch[1].trim();

        const groupMatch = line.match(/group-title="([^"]*)"/i);
        if (groupMatch) current.group = groupMatch[1] || 'Geral';

        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        if (logoMatch) current.logo = logoMatch[1];
      } else if (line.startsWith('#')) {
        continue;
      } else if (current) {
        current.url = line;
        channels.push(current);
        current = null;
      }
    }
    return channels;
  },

  getActive() {
    return (
      IPTV.state.playlists.find((p) => p.id === IPTV.state.activePlaylistId) ||
      IPTV.state.playlists[0]
    );
  },

  applyFilter() {
    const q = (IPTV.els.searchInput.value || '').toLowerCase().trim();
    IPTV.state.filtered = !q
      ? IPTV.state.channels
      : IPTV.state.channels.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.group || '').toLowerCase().includes(q)
        );
    IPTV.ui.renderChannels();
  },

  /** Carrega a partir de texto M3U já obtido (arquivo/colar) */
  loadFromText(text, sourceLabel) {
    const channels = this.parseM3U(text);
    IPTV.state.channels = channels;
    this.applyFilter();
    IPTV.ui.setStatus(channels.length + ' canais', 'ok');
    IPTV.ui.log(
      `Playlist carregada (${sourceLabel}): ${channels.length} canais.`
    );
    if (!channels.length) {
      IPTV.els.channelList.innerHTML =
        '<div class="hint" style="padding:12px;">Nenhum canal encontrado na playlist.</div>';
    }
  },

  async loadActive() {
    const pl = this.getActive();
    if (!pl) return;

    // Lista importada só por texto (sem URL)
    if (pl.sourceText) {
      IPTV.els.channelList.innerHTML =
        '<div class="hint" style="padding:12px;">Aplicando playlist importada...</div>';
      this.loadFromText(pl.sourceText, pl.name || 'importada');
      return;
    }

    if (!pl.url) {
      IPTV.els.channelList.innerHTML =
        '<div class="hint" style="padding:12px;">Esta lista não tem URL. Use Importar arquivo/texto.</div>';
      IPTV.ui.setStatus('Sem URL', 'warn');
      return;
    }

    IPTV.els.channelList.innerHTML =
      '<div class="hint" style="padding:12px;">Carregando playlist...</div>';
    IPTV.ui.setStatus('Carregando...', 'warn');
    IPTV.ui.log('Carregando lista: ' + pl.name + ' → ' + pl.url);

    try {
      const { text, mode } = await IPTV.proxies.fetchText(
        pl.url,
        IPTV.state.proxyMode
      );
      this.loadFromText(text, 'via ' + mode);
    } catch (err) {
      IPTV.ui.setStatus('Erro ao carregar', 'err');
      IPTV.els.channelList.innerHTML = `
        <div class="hint" style="padding:12px;color:#fca5a5;">
          Erro: ${IPTV.ui.escapeHtml(err.message)}<br><br>
          <strong>Solução recomendada:</strong><br>
          1. Baixe o arquivo .m3u no PC (navegador ou app)<br>
          2. Clique em <em>Adicionar lista</em> → aba <em>Arquivo / Colar</em><br>
          3. Selecione o arquivo ou cole o conteúdo<br><br>
          Playlists grandes (~60MB+) costumam ser bloqueadas por proxies CORS públicos.
        </div>`;
      IPTV.ui.log('Erro ao carregar playlist: ' + err.message);
    }
  }
};
