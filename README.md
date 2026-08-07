# IPTV Player (M3U8 / Xtream)

Player web com API **Xtream** (Ao vivo / Filmes / Séries), categorias e proxy local para HLS.

## Por que o ao vivo falhava

1. O servidor **não envia CORS** → o navegador bloqueia.
2. Proxies públicos (**corsproxy.io**, etc.) **bloqueiam domínios IPTV** (403).
3. O manifest HLS traz segmentos em `/hls/TOKEN` (path no host). Sem reescrita, o player quebra.

## Solução: proxy local

Na pasta do projeto:

```bash
node proxy-server.js
```

Sobe em `http://127.0.0.1:8787`.

No player, escolha **Proxy: Local (127.0.0.1:8787)** (ou Automático).

Funciona com:
- página aberta em `http://localhost...`
- ou GitHub Pages (o proxy local ainda roda na sua máquina)

## Estrutura

```
index.html
proxy-server.js          ← proxy CORS local (Node)
css/style.css
js/
  config.js              lista padrão + proxies
  xtream.js              API Xtream
  playlist.js            categorias / carga
  player.js              HLS + reescrita de manifest
  proxies.js
  storage.js             limpar cache
  add-list.js
  ui.js
  app.js
```

## Lista padrão (Xtream)

- DNS: `http://srv.cldplay.in:80`
- Usuário / senha conforme `js/config.js`

## Abas

- **Ao vivo** → categorias live da API
- **Filmes** → VOD
- **Séries** → lista → episódios

## GitHub Pages

Envie a pasta (exceto `node_modules` se houver). O HTML/JS/CSS rodam no Pages; o **proxy local** continua necessário na sua máquina para streams ao vivo.
