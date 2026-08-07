/* Persistência e exclusão de cache */
window.IPTV = window.IPTV || {};

IPTV.storage = {
  load() {
    try {
      const raw = localStorage.getItem(IPTV.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      IPTV.ui?.log('Falha ao ler cache: ' + e.message);
      return null;
    }
  },

  save(partial) {
    const current = this.load() || {};
    const playlists = (partial.playlists ?? current.playlists ?? [IPTV.DEFAULT_PLAYLIST]).map((p) => {
      if (p.sourceText && p.sourceText.length > 200000) {
        const copy = Object.assign({}, p);
        delete copy.sourceText;
        return copy;
      }
      return p;
    });

    const data = {
      playlists,
      activePlaylistId: partial.activePlaylistId ?? current.activePlaylistId ?? 'default',
      proxyMode: partial.proxyMode ?? current.proxyMode ?? 'auto',
      contentType: partial.contentType ?? current.contentType ?? 'live'
    };
    localStorage.setItem(IPTV.STORAGE_KEY, JSON.stringify(data));
  },

  async clearAll() {
    localStorage.removeItem(IPTV.STORAGE_KEY);
    try {
      localStorage.removeItem('iptv_player_v2');
      localStorage.removeItem('iptv_player_v1');
    } catch (_) {}

    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {}
    }

    IPTV.state.playlists = [Object.assign({}, IPTV.DEFAULT_PLAYLIST)];
    IPTV.state.activePlaylistId = 'default';
    IPTV.state.proxyMode = 'auto';
    IPTV.state.contentType = 'live';
    IPTV.state.channels = [];
    IPTV.state.filtered = [];
    IPTV.state.currentChannel = null;
    IPTV.state.sourceMode = null;
    IPTV.state.xtreamCategories = { live: [], movie: [], series: [] };
    IPTV.state.xtreamPlaylist = null;

    IPTV.player.stop();
    IPTV.ui.resetAfterClearCache();
    IPTV.ui.log('Dados em cache excluídos (localStorage + Cache API).');
    await IPTV.playlist.loadActive();
  }
};
