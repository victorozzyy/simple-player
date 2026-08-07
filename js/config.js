/* Configurações globais e lista padrão */
window.IPTV = window.IPTV || {};

IPTV.DEFAULT_PLAYLIST = {
  id: 'default',
  name: 'Lista padrão (cldplay)',
  type: 'm3u',
  url: 'http://srv.cldplay.in:80/get.php?username=lelezago&password=lelezago@2021&type=m3u_plus'
};

IPTV.STORAGE_KEY = 'iptv_player_v2';

/**
 * Construtores de URL de proxy CORS.
 * Proxies públicos costumam falhar com playlists muito grandes (~dezenas de MB).
 */
IPTV.PROXY_BUILDERS = {
  none: (url) => url,
  allorigins: (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  corsproxy: (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
  codetabs: (url) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
  corsproxyorg: (url) => 'https://corsproxy.org/?' + encodeURIComponent(url)
};

/** Ordem de tentativa no modo automático */
IPTV.AUTO_ORDER = ['none', 'allorigins', 'corsproxy', 'codetabs', 'corsproxyorg'];

IPTV.MAX_RENDER = 500;
IPTV.FETCH_TIMEOUT_MS = 25000;
IPTV.STREAM_TIMEOUT_MS = 18000;
