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

IPTV.PROXY_BUILDERS = {
  none: (url) => url,
  allorigins: (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  corsproxy: (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
  codetabs: (url) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
  corsproxyorg: (url) => 'https://corsproxy.org/?' + encodeURIComponent(url)
};

IPTV.AUTO_ORDER = ['none', 'corsproxy', 'allorigins', 'codetabs', 'corsproxyorg'];

IPTV.MAX_RENDER = 400;
IPTV.FETCH_TIMEOUT_MS = 25000;
IPTV.STREAM_TIMEOUT_MS = 20000;

IPTV.CONTENT_TYPES = [
  { id: 'live', label: 'Ao vivo' },
  { id: 'movie', label: 'Filmes' },
  { id: 'series', label: 'Séries' }
];
