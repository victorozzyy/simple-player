/* Parse M3U, categorias e carga (M3U ou Xtream) */
window.IPTV = window.IPTV || {};

IPTV.playlist = {
  detectKindFromGroup(group) {
    const g = (group || '').toLowerCase();
    if (
      /^(filmes?|movies?|vod|cinema)/i.test(g) ||
      g.includes('filme') ||
      g.includes('movie')
    ) {
      return 'movie';
    }
    if (
      /^(s[eé]ries?|series|seriados?)/i.test(g) ||
      g.includes('série') ||
      g.includes('serie')
    ) {
      return 'series';
    }
    return 'live';
  },

  parseM3U(text) {
    const lines = String(text).split(/\r?\n/);
    const channels = [];
    let current = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        current = { name: 'Canal', group: 'Geral', logo: '', url: '', kind: 'live' };
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) current.name = nameMatch[1].trim();

        const groupMatch = line.match(/group-title="([^"]*)"/i);
        if (groupMatch) current.group = groupMatch[1] || 'Geral';

        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        if (logoMatch) current.logo = logoMatch[1];

        current.kind = this.detectKindFromGroup(current.group);
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

  buildCategoriesFromItems(items) {
    const map = new Map();
    items.forEach((c) => {
      const name = c.group || 'Geral';
      if (!map.has(name)) map.set(name, { id: name, name, count: 0 });
      map.get(name).count += 1;
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );
  },

  applyFilter() {
    const q = (IPTV.els.searchInput.value || '').toLowerCase().trim();
    const type = IPTV.state.contentType;
    const cat = IPTV.state.activeCategoryId;

    let list = IPTV.state.channels.filter((c) => (c.kind || 'live') === type);

    if (cat && cat !== '__all__') {
      list = list.filter((c) => (c.group || 'Geral') === cat || c.categoryId === cat);
    }

    if (q) {
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.group || '').toLowerCase().includes(q)
      );
    }

    IPTV.state.filtered = list;
    IPTV.ui.renderChannels();
    IPTV.ui.renderCategories();
  },

  loadFromText(text, sourceLabel) {
    const channels = this.parseM3U(text);
    IPTV.state.channels = channels;
    IPTV.state.xtreamCategories = { live: [], movie: [], series: [] };
    IPTV.state.sourceMode = 'm3u';
    IPTV.state.activeCategoryId = '__all__';

    ['live', 'movie', 'series'].forEach((type) => {
      const items = channels.filter((c) => c.kind === type);
      IPTV.state.xtreamCategories[type] = this.buildCategoriesFromItems(items);
    });

    this.applyFilter();
    const counts = {
      live: channels.filter((c) => c.kind === 'live').length,
      movie: channels.filter((c) => c.kind === 'movie').length,
      series: channels.filter((c) => c.kind === 'series').length
    };
    IPTV.ui.setStatus(
      `${channels.length} itens (L${counts.live}/F${counts.movie}/S${counts.series})`,
      'ok'
    );
    IPTV.ui.log(`Playlist carregada (${sourceLabel}): ${channels.length} itens.`);
    IPTV.ui.updateTypeCounts(counts);
  },

  async loadXtream(pl) {
    IPTV.els.channelList.innerHTML =
      '<div class="hint" style="padding:12px;">Conectando à API Xtream...</div>';
    IPTV.ui.setStatus('Xtream...', 'warn');
    IPTV.ui.log('Xtream DNS: ' + pl.dns);

    try {
      const info = await IPTV.xtream.auth(pl);
      if (info && info.user_info && info.user_info.auth === 0) {
        throw new Error('Autenticação Xtream falhou (user/senha)');
      }
      const status = info?.user_info?.status || 'unknown';
      IPTV.ui.log('Conta Xtream: ' + status);

      IPTV.state.sourceMode = 'xtream';
      IPTV.state.xtreamPlaylist = pl;
      IPTV.state.channels = [];
      IPTV.state.xtreamCategories = { live: [], movie: [], series: [] };

      const [liveCats, movieCats, seriesCats] = await Promise.all([
        IPTV.xtream.getCategories(pl, 'live').catch(() => []),
        IPTV.xtream.getCategories(pl, 'movie').catch(() => []),
        IPTV.xtream.getCategories(pl, 'series').catch(() => [])
      ]);

      IPTV.state.xtreamCategories.live = liveCats;
      IPTV.state.xtreamCategories.movie = movieCats;
      IPTV.state.xtreamCategories.series = seriesCats;

      IPTV.state.activeCategoryId = '__all__';
      IPTV.ui.renderCategories();
      IPTV.ui.updateTypeCounts({
        live: liveCats.length + ' cat.',
        movie: movieCats.length + ' cat.',
        series: seriesCats.length + ' cat.'
      });
      IPTV.ui.setStatus('Xtream conectado', 'ok');
      IPTV.els.channelList.innerHTML =
        '<div class="hint" style="padding:12px;">Escolha uma categoria para carregar os itens.</div>';

      const cats = IPTV.state.xtreamCategories[IPTV.state.contentType] || [];
      if (cats.length) {
        IPTV.state.activeCategoryId = cats[0].id;
        await this.loadXtreamCategory(cats[0].id);
      }
    } catch (err) {
      IPTV.ui.log('Xtream API falhou: ' + err.message);
      if (pl.url) {
        IPTV.ui.log('Tentando fallback M3U...');
        const { text, mode } = await IPTV.proxies.fetchText(pl.url, IPTV.state.proxyMode);
        this.loadFromText(text, 'm3u via ' + mode);
        return;
      }
      throw err;
    }
  },

  async loadXtreamCategory(categoryId) {
    const pl = IPTV.state.xtreamPlaylist || this.getActive();
    if (!pl || pl.type !== 'xtream') return;

    const type = IPTV.state.contentType;
    IPTV.els.channelList.innerHTML =
      '<div class="hint" style="padding:12px;">Carregando categoria...</div>';
    IPTV.ui.setStatus('Carregando...', 'warn');

    try {
      const streams = await IPTV.xtream.getStreams(
        pl,
        type,
        categoryId === '__all__' ? undefined : categoryId
      );

      const catName =
        (IPTV.state.xtreamCategories[type] || []).find((c) => c.id === categoryId)
          ?.name || '';

      const mapped = streams.map((s) => ({
        ...s,
        kind: type === 'series' ? 'series' : type,
        categoryId: categoryId || s.categoryId,
        group: s.group || catName || 'Geral',
        url: type === 'series' ? '' : IPTV.xtream.toPlayableUrl(pl, { ...s, kind: type })
      }));

      IPTV.state.channels = IPTV.state.channels.filter((c) => {
        if ((c.kind || 'live') !== type && c.kind !== 'episode') return true;
        if (type === 'series' && c.kind === 'episode') return true;
        if (categoryId && categoryId !== '__all__') {
          return c.categoryId !== categoryId;
        }
        return (c.kind || 'live') !== type;
      });
      IPTV.state.channels = IPTV.state.channels.concat(mapped);

      IPTV.state.activeCategoryId = categoryId || '__all__';
      this.applyFilter();
      IPTV.ui.setStatus(mapped.length + ' itens', 'ok');
      IPTV.ui.log(`Categoria ${categoryId}: ${mapped.length} itens (${type})`);
    } catch (err) {
      IPTV.ui.setStatus('Erro categoria', 'err');
      IPTV.els.channelList.innerHTML = `<div class="hint" style="padding:12px;color:#fca5a5;">Erro: ${IPTV.ui.escapeHtml(err.message)}</div>`;
      IPTV.ui.log('Erro categoria: ' + err.message);
    }
  },

  async openSeries(item) {
    const pl = IPTV.state.xtreamPlaylist || this.getActive();
    if (!pl || pl.type !== 'xtream') {
      IPTV.ui.log('Séries detalhadas só na API Xtream');
      return;
    }

    IPTV.els.channelList.innerHTML =
      '<div class="hint" style="padding:12px;">Carregando episódios...</div>';
    try {
      const { info, episodes } = await IPTV.xtream.getSeriesInfo(pl, item.id);
      const title = info.name || item.name;
      IPTV.ui.log(`Série ${title}: ${episodes.length} episódios`);

      const mapped = episodes.map((ep) => ({
        ...ep,
        url: IPTV.xtream.toPlayableUrl(pl, ep),
        seriesName: title
      }));

      IPTV.state.filtered = mapped;
      IPTV.ui.renderChannels();
      IPTV.els.nowPlaying.textContent = title;
      IPTV.els.nowMeta.textContent = (info.plot || '').slice(0, 120);
      IPTV.ui.setStatus(episodes.length + ' episódios', 'ok');
    } catch (err) {
      IPTV.ui.log('Erro série: ' + err.message);
      IPTV.ui.setStatus('Erro série', 'err');
    }
  },

  async loadActive() {
    const pl = this.getActive();
    if (!pl) return;

    if (pl.sourceText) {
      this.loadFromText(pl.sourceText, pl.name || 'importada');
      return;
    }

    if (pl.type === 'xtream' && pl.dns && pl.username && pl.password) {
      try {
        await this.loadXtream(pl);
        return;
      } catch (err) {
        IPTV.ui.setStatus('Erro Xtream', 'err');
        IPTV.els.channelList.innerHTML = `<div class="hint" style="padding:12px;color:#fca5a5;">Erro Xtream: ${IPTV.ui.escapeHtml(err.message)}<br><br>Verifique DNS/usuário/senha ou importe o arquivo .m3u.</div>`;
        IPTV.ui.log('Erro ao carregar Xtream: ' + err.message);
        return;
      }
    }

    if (!pl.url) {
      IPTV.els.channelList.innerHTML =
        '<div class="hint" style="padding:12px;">Lista sem URL. Use Arquivo/Colar ou Xtream.</div>';
      IPTV.ui.setStatus('Sem URL', 'warn');
      return;
    }

    IPTV.els.channelList.innerHTML =
      '<div class="hint" style="padding:12px;">Carregando playlist...</div>';
    IPTV.ui.setStatus('Carregando...', 'warn');
    IPTV.ui.log('Carregando lista: ' + pl.name + ' → ' + pl.url);

    try {
      const { text, mode } = await IPTV.proxies.fetchText(pl.url, IPTV.state.proxyMode);
      this.loadFromText(text, 'via ' + mode);
    } catch (err) {
      IPTV.ui.setStatus('Erro ao carregar', 'err');
      IPTV.els.channelList.innerHTML = `
        <div class="hint" style="padding:12px;color:#fca5a5;">
          Erro: ${IPTV.ui.escapeHtml(err.message)}<br><br>
          <strong>Recomendado:</strong> use lista <em>Xtream</em> (DNS + usuário + senha)
          ou importe o arquivo .m3u na aba Arquivo / Colar.
        </div>`;
      IPTV.ui.log('Erro ao carregar playlist: ' + err.message);
    }
  }
};
