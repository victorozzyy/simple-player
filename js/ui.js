/* Interface: log, status, categorias, canais */
window.IPTV = window.IPTV || {};

IPTV.ui = {
  log(msg) {
    const t = new Date().toLocaleTimeString();
    const box = IPTV.els.logBox;
    box.textContent = `[${t}] ${msg}\n` + box.textContent.slice(0, 5000);
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
      const tag = p.type === 'xtream' ? ' [Xtream]' : p.type === 'file' ? ' [Arquivo]' : '';
      opt.textContent = p.name + (p.id === 'default' ? ' ★' : '') + tag;
      if (p.id === IPTV.state.activePlaylistId) opt.selected = true;
      sel.appendChild(opt);
    });
  },

  updateTypeCounts(counts) {
    document.querySelectorAll('.type-tab').forEach((tab) => {
      const id = tab.dataset.type;
      const el = tab.querySelector('.count');
      if (el && counts && counts[id] != null) {
        el.textContent = String(counts[id]);
      }
    });
  },

  setContentType(type) {
    IPTV.state.contentType = type;
    document.querySelectorAll('.type-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });
    IPTV.state.activeCategoryId = '__all__';

    if (IPTV.state.sourceMode === 'xtream') {
      const cats = IPTV.state.xtreamCategories[type] || [];
      IPTV.ui.renderCategories();
      if (cats.length) {
        IPTV.state.activeCategoryId = cats[0].id;
        IPTV.playlist.loadXtreamCategory(cats[0].id);
      } else {
        IPTV.els.channelList.innerHTML =
          '<div class="hint" style="padding:12px;">Nenhuma categoria neste tipo.</div>';
      }
    } else {
      IPTV.playlist.applyFilter();
    }
  },

  renderCategories() {
    const box = IPTV.els.categoryList;
    if (!box) return;

    const type = IPTV.state.contentType;
    let cats = [];

    if (IPTV.state.sourceMode === 'xtream') {
      cats = IPTV.state.xtreamCategories[type] || [];
    } else {
      const items = IPTV.state.channels.filter((c) => (c.kind || 'live') === type);
      cats = IPTV.playlist.buildCategoriesFromItems(items);
    }

    const frag = document.createDocumentFragment();

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'cat-btn' + (IPTV.state.activeCategoryId === '__all__' ? ' active' : '');
    all.textContent = 'Todas';
    all.addEventListener('click', () => {
      IPTV.state.activeCategoryId = '__all__';
      if (IPTV.state.sourceMode === 'xtream') {
        IPTV.playlist.loadXtreamCategory('__all__');
      } else {
        IPTV.playlist.applyFilter();
      }
      this.renderCategories();
    });
    frag.appendChild(all);

    cats.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-btn' + (IPTV.state.activeCategoryId === c.id ? ' active' : '');
      btn.textContent = c.name + (c.count != null ? ` (${c.count})` : '');
      btn.title = c.name;
      btn.addEventListener('click', () => {
        IPTV.state.activeCategoryId = c.id;
        if (IPTV.state.sourceMode === 'xtream') {
          IPTV.playlist.loadXtreamCategory(c.id);
        } else {
          IPTV.playlist.applyFilter();
        }
        this.renderCategories();
      });
      frag.appendChild(btn);
    });

    box.innerHTML = '';
    box.appendChild(frag);
  },

  renderChannels() {
    const list = IPTV.state.filtered;
    const container = IPTV.els.channelList;

    if (!list.length) {
      container.innerHTML =
        '<div class="hint" style="padding:12px;">Nenhum item. Escolha outra categoria ou busque.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    const max = Math.min(list.length, IPTV.MAX_RENDER);

    for (let i = 0; i < max; i++) {
      const c = list[i];
      const active =
        IPTV.state.currentChannel &&
        ((IPTV.state.currentChannel.url && IPTV.state.currentChannel.url === c.url) ||
          (IPTV.state.currentChannel.id && IPTV.state.currentChannel.id === c.id));
      const div = document.createElement('div');
      div.className = 'channel' + (active ? ' active' : '');
      const badge =
        c.kind === 'series'
          ? '<span class="tag">Série</span>'
          : c.kind === 'movie'
            ? '<span class="tag">Filme</span>'
            : c.kind === 'episode'
              ? '<span class="tag">Ep</span>'
              : '';
      div.innerHTML = `
        <img src="${c.logo || ''}" alt="" onerror="this.style.visibility='hidden'" />
        <div class="meta">
          <div class="name">${this.escapeHtml(c.name)} ${badge}</div>
          <div class="group">${this.escapeHtml(c.group || 'Geral')}</div>
        </div>`;
      div.addEventListener('click', () => IPTV.player.playChannel(c));
      frag.appendChild(div);
    }

    if (list.length > max) {
      const more = document.createElement('div');
      more.className = 'hint';
      more.style.padding = '10px';
      more.textContent = `Mostrando ${max} de ${list.length}. Use busca ou categorias.`;
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
      '<div class="hint" style="padding:12px;">Cache limpo. Recarregando...</div>';
    IPTV.els.nowPlaying.textContent = 'Nenhum canal';
    IPTV.els.nowMeta.textContent = 'Cache excluído';
    this.setStatus('Cache limpo', 'warn');
    if (IPTV.els.categoryList) IPTV.els.categoryList.innerHTML = '';
  }
};
