/* Interface: log, status, lista de canais */
window.IPTV = window.IPTV || {};

IPTV.ui = {
  log(msg) {
    const t = new Date().toLocaleTimeString();
    const box = IPTV.els.logBox;
    box.textContent = `[${t}] ${msg}\n` + box.textContent.slice(0, 4000);
  },

  setStatus(text, type) {
    IPTV.els.statusBadge.textContent = text;
    IPTV.els.statusBadge.className = 'status' + (type ? ' ' + type : '');
  },

  setProxyBadge(mode) {
    IPTV.els.proxyBadge.textContent = 'Proxy: ' + mode;
  },

  escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  renderPlaylistSelect() {
    const sel = IPTV.els.playlistSelect;
    sel.innerHTML = '';
    IPTV.state.playlists.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + (p.id === 'default' ? ' ★' : '');
      if (p.id === IPTV.state.activePlaylistId) opt.selected = true;
      sel.appendChild(opt);
    });
  },

  renderChannels() {
    const list = IPTV.state.filtered;
    const container = IPTV.els.channelList;

    if (!list.length) {
      container.innerHTML =
        '<div class="hint" style="padding:12px;">Nenhum canal corresponde à busca.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    const max = Math.min(list.length, IPTV.MAX_RENDER);

    for (let i = 0; i < max; i++) {
      const c = list[i];
      const div = document.createElement('div');
      const active =
        IPTV.state.currentChannel && IPTV.state.currentChannel.url === c.url;
      div.className = 'channel' + (active ? ' active' : '');
      div.innerHTML = `
        <img src="${c.logo || ''}" alt="" onerror="this.style.visibility='hidden'" />
        <div class="meta">
          <div class="name">${this.escapeHtml(c.name)}</div>
          <div class="group">${this.escapeHtml(c.group || 'Geral')}</div>
        </div>`;
      div.addEventListener('click', () => IPTV.player.playChannel(c));
      frag.appendChild(div);
    }

    if (list.length > max) {
      const more = document.createElement('div');
      more.className = 'hint';
      more.style.padding = '10px';
      more.textContent = `Mostrando ${max} de ${list.length}. Use a busca para filtrar.`;
      frag.appendChild(more);
    }

    container.innerHTML = '';
    container.appendChild(frag);
  },

  resetAfterClearCache() {
    IPTV.els.proxySelect.value = 'auto';
    this.setProxyBadge('auto');
    this.renderPlaylistSelect();
    IPTV.els.channelList.innerHTML =
      '<div class="hint" style="padding:12px;">Cache limpo. Recarregando lista padrão...</div>';
    IPTV.els.nowPlaying.textContent = 'Nenhum canal';
    IPTV.els.nowMeta.textContent = 'Cache excluído';
    this.setStatus('Cache limpo', 'warn');
  }
};
