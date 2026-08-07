/**
 * Cliente Xtream Codes (player_api.php)
 */
window.IPTV = window.IPTV || {};

IPTV.xtream = {
  normalizeDns(dns) {
    let host = (dns || '').trim().replace(/\/$/, '');
    if (!host) return '';
    if (!/^https?:\/\//i.test(host)) host = 'http://' + host;
    return host;
  },

  /** Path segment: mantém @ e : comuns em senhas Xtream */
  pathSeg(value) {
    return encodeURIComponent(String(value)).replace(/%40/gi, '@').replace(/%3A/gi, ':');
  },

  apiUrl(pl, action, extra) {
    const dns = this.normalizeDns(pl.dns);
    let u =
      dns +
      '/player_api.php?username=' +
      encodeURIComponent(pl.username) +
      '&password=' +
      encodeURIComponent(pl.password);
    if (action) u += '&action=' + encodeURIComponent(action);
    if (extra) {
      Object.keys(extra).forEach((k) => {
        if (extra[k] !== undefined && extra[k] !== null && extra[k] !== '') {
          u += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(extra[k]);
        }
      });
    }
    return u;
  },

  streamUrl(pl, kind, streamId, extension) {
    const dns = this.normalizeDns(pl.dns);
    const user = this.pathSeg(pl.username);
    const pass = this.pathSeg(pl.password);
    const id = encodeURIComponent(String(streamId));
    const ext = (extension || 'm3u8').replace(/^\./, '');

    if (kind === 'live') {
      // Preferir m3u8; alguns painéis também servem .ts contínuo
      return `${dns}/live/${user}/${pass}/${id}.m3u8`;
    }
    if (kind === 'movie') {
      return `${dns}/movie/${user}/${pass}/${id}.${ext}`;
    }
    return `${dns}/series/${user}/${pass}/${id}.${ext}`;
  },

  async request(pl, action, extra) {
    const url = this.apiUrl(pl, action, extra);
    const { data, mode } = await IPTV.proxies.fetchJson(url, IPTV.state.proxyMode);
    IPTV.ui.log(`Xtream OK (${mode}): ${action || 'auth'}`);
    return data;
  },

  async auth(pl) {
    return this.request(pl, null);
  },

  async getCategories(pl, type) {
    const action =
      type === 'movie'
        ? 'get_vod_categories'
        : type === 'series'
          ? 'get_series_categories'
          : 'get_live_categories';
    const data = await this.request(pl, action);
    return (Array.isArray(data) ? data : []).map((c) => ({
      id: String(c.category_id),
      name: c.category_name || 'Sem nome',
      parentId: c.parent_id != null ? String(c.parent_id) : null
    }));
  },

  async getStreams(pl, type, categoryId) {
    if (type === 'movie') {
      const data = await this.request(pl, 'get_vod_streams', {
        category_id: categoryId || undefined
      });
      return (Array.isArray(data) ? data : []).map((s) => ({
        id: String(s.stream_id),
        name: s.name || 'Filme',
        logo: s.stream_icon || '',
        group: s.category_name || '',
        container: (s.container_extension || 'mp4').replace(/^\./, ''),
        kind: 'movie'
      }));
    }

    if (type === 'series') {
      const data = await this.request(pl, 'get_series', {
        category_id: categoryId || undefined
      });
      return (Array.isArray(data) ? data : []).map((s) => ({
        id: String(s.series_id),
        name: s.name || 'Série',
        logo: s.cover || s.stream_icon || '',
        group: s.category_name || '',
        kind: 'series'
      }));
    }

    const data = await this.request(pl, 'get_live_streams', {
      category_id: categoryId || undefined
    });
    return (Array.isArray(data) ? data : []).map((s) => ({
      id: String(s.stream_id),
      name: s.name || 'Canal',
      logo: s.stream_icon || '',
      group: s.category_name || '',
      kind: 'live'
    }));
  },

  async getSeriesInfo(pl, seriesId) {
    const data = await this.request(pl, 'get_series_info', { series_id: seriesId });
    const episodes = [];
    const episodesMap = data.episodes || {};
    Object.keys(episodesMap)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((season) => {
        (episodesMap[season] || []).forEach((ep) => {
          episodes.push({
            id: String(ep.id),
            name:
              `S${season}E${ep.episode_num || ''} — ` +
              (ep.title || 'Episódio'),
            logo: (data.info && data.info.cover) || '',
            group: `Temporada ${season}`,
            kind: 'episode',
            seriesId: String(seriesId),
            container: (ep.container_extension || 'mp4').replace(/^\./, ''),
            season: String(season)
          });
        });
      });
    return { info: data.info || {}, episodes };
  },

  toPlayableUrl(pl, item) {
    if (item.kind === 'live') return this.streamUrl(pl, 'live', item.id, 'm3u8');
    if (item.kind === 'movie') return this.streamUrl(pl, 'movie', item.id, item.container || 'mp4');
    if (item.kind === 'episode') return this.streamUrl(pl, 'series', item.id, item.container || 'mp4');
    return item.url || '';
  }
};
