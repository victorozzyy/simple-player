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
    const data = {
      playlists: partial.playlists ?? current.playlists ?? [IPTV.DEFAULT_PLAYLIST],
      activePlaylistId: partial.activePlaylistId ?? current.activePlaylistId ?? 'default',
      proxyMode: partial.proxyMode ?? current.proxyMode ?? 'auto'
    };
    localStorage.setItem(IPTV.STORAGE_KEY, JSON.stringify(data));
  },

  /**
   * Exclui dados em cache (localStorage + Cache API).
   * Restaura lista padrão.
   */
  async clearAll() {
    localStorage.removeItem(IPTV.STORAGE_KEY);

    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) { /* ignore */ }
    }

    IPTV.state.playlists = [Object.assign({}, IPTV.DEFAULT_PLAYLIST)];
    IPTV.state.activePlaylistId = 'default';
    IPTV.state.proxyMode = 'auto';
    IPTV.state.channels = [];
    IPTV.state.filtered = [];
    IPTV.state.currentChannel = null;

    IPTV.player.stop();
    IPTV.ui.resetAfterClearCache();
    IPTV.ui.log('Dados em cache excluídos (localStorage + Cache API).');

    await IPTV.playlist.loadActive();
  }
};
