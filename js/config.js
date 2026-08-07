/* Configurações globais e lista padrão */
window.IPTV = window.IPTV || {};

IPTV.DEFAULT_PLAYLIST = {
  id: 'default',
  name: 'Lista padrão (cldplay)',
  type: 'xtream',
  dns: 'http://srv.cldplay.in:80',
  username: 'lelezago',
  password: 'lelezago@2021',
  url: 'http://srv.cldplay.in:80/get.php?username=lelezago&password=lelezago@2021&type=m3u_plus'
};

IPTV.STORAGE_KEY = 'iptv_player_v3';

/** Proxy local (node proxy-server.js) — único que costuma funcionar com IPTV */
IPTV.LOCAL_PROXY = 'http://127.0.0.1:8787/?url=';

IPTV.PROXY_BUILDERS = {
  none: (url) => url,
  local: (url) => IPTV.LOCAL_PROXY + encodeURIComponent(url),
  allorigins: (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  corsproxy: (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
  codetabs: (url) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
  corsproxyorg: (url) => 'https://corsproxy.org/?' + encodeURIComponent(url)
};

/** Prioriza proxy local; públicos bloqueiam domínios IPTV */
IPTV.AUTO_ORDER = ['local', 'none', 'allorigins', 'codetabs', 'corsproxyorg', 'corsproxy'];

IPTV.MAX_RENDER = 400;
IPTV.FETCH_TIMEOUT_MS = 25000;
IPTV.STREAM_TIMEOUT_MS = 25000;
