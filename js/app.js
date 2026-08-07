/* Bootstrap e eventos principais */
window.IPTV = window.IPTV || {};

IPTV.state = {
  playlists: [],
  activePlaylistId: 'default',
  channels: [],
  filtered: [],
  currentChannel: null,
  proxyMode: 'auto',
  hls: null,
  _pendingHugeText: null
};

IPTV.els = {};

function cacheEls() {
  const ids = [
    'playlistSelect',
    'channelList',
    'searchInput',
    'video',
    'overlayMsg',
    'nowPlaying',
    'nowMeta',
    'statusBadge',
    'proxySelect',
    'proxyBadge',
    'logBox',
    'modalAdd',
    'btnAddList',
    'btnCancelAdd',
    'btnSaveAdd',
    'btnReload',
    'btnClearCache'
  ];
  ids.forEach((id) => {
    IPTV.els[id] = document.getElementById(id);
  });
}

function restoreFromStorage() {
  const data = IPTV.storage.load();
  if (!data) {
    IPTV.state.playlists = [Object.assign({}, IPTV.DEFAULT_PLAYLIST)];
    return;
  }

  if (Array.isArray(data.playlists) && data.playlists.length) {
    const hasDefault = data.playlists.some((p) => p.id === 'default');
    IPTV.state.playlists = hasDefault
      ? data.playlists
      : [Object.assign({}, IPTV.DEFAULT_PLAYLIST), ...data.playlists];
  } else {
    IPTV.state.playlists = [Object.assign({}, IPTV.DEFAULT_PLAYLIST)];
  }

  if (data.activePlaylistId) IPTV.state.activePlaylistId = data.activePlaylistId;
  if (data.proxyMode) IPTV.state.proxyMode = data.proxyMode;
}

function bindEvents() {
  IPTV.els.playlistSelect.addEventListener('change', () => {
    IPTV.state.activePlaylistId = IPTV.els.playlistSelect.value;
    IPTV.storage.save({
      playlists: IPTV.state.playlists,
      activePlaylistId: IPTV.state.activePlaylistId,
      proxyMode: IPTV.state.proxyMode
    });
    IPTV.playlist.loadActive();
  });

  IPTV.els.searchInput.addEventListener('input', () => IPTV.playlist.applyFilter());

  IPTV.els.proxySelect.addEventListener('change', () => {
    IPTV.state.proxyMode = IPTV.els.proxySelect.value;
    IPTV.ui.setProxyBadge(IPTV.state.proxyMode);
    IPTV.storage.save({
      playlists: IPTV.state.playlists,
      activePlaylistId: IPTV.state.activePlaylistId,
      proxyMode: IPTV.state.proxyMode
    });
    IPTV.ui.log('Modo de proxy alterado para: ' + IPTV.state.proxyMode);
  });

  IPTV.els.btnReload.addEventListener('click', () => IPTV.playlist.loadActive());

  IPTV.els.btnClearCache.addEventListener('click', () => {
    if (
      confirm(
        'Excluir todos os dados em cache (listas salvas, preferências)? A lista padrão será restaurada.'
      )
    ) {
      IPTV.storage.clearAll();
    }
  });

  IPTV.addList.init();
}

document.addEventListener('DOMContentLoaded', () => {
  cacheEls();
  restoreFromStorage();

  IPTV.els.proxySelect.value = IPTV.state.proxyMode || 'auto';
  IPTV.ui.setProxyBadge(IPTV.els.proxySelect.value);
  IPTV.ui.renderPlaylistSelect();
  IPTV.ui.setStatus('Iniciando...', 'warn');
  IPTV.els.overlayMsg.classList.add('show');

  bindEvents();
  IPTV.playlist.loadActive();
});
