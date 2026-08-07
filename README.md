# IPTV Player (M3U8 / Xtream) — GitHub Pages

Player web modular, compatível com **GitHub Pages** (HTTPS).

## Estrutura de arquivos

```
iptv-player/
├── index.html              # HTML principal
├── css/
│   └── style.css           # Estilos
├── js/
│   ├── config.js           # Lista padrão, proxies, constantes
│   ├── storage.js          # Salvar / carregar / excluir cache
│   ├── proxies.js          # Fetch com proxies CORS
│   ├── playlist.js         # Parse M3U e carga de listas
│   ├── player.js           # Reprodução HLS (hls.js)
│   ├── ui.js               # Log, status, render de canais
│   ├── add-list.js         # Modal: M3U, Xtream, Arquivo/Colar
│   └── app.js              # Bootstrap e eventos
└── README.md
```

Cada função importante fica em um arquivo. Ex.: erro de proxy → edite só `js/proxies.js`; limpar cache → `js/storage.js`.

## Lista padrão

```
http://srv.cldplay.in:80/get.php?username=lelezago&password=lelezago@2021&type=m3u_plus
```

Essa lista tem **dezenas de MB**. Proxies CORS públicos (allorigins, corsproxy, codetabs…) costumam:

- retornar **403**
- falhar com **Failed to fetch**
- cortar a resposta

Por isso o player inclui a aba **Arquivo / Colar**.

## Como usar no GitHub Pages

1. Envie a pasta inteira para o repositório
2. **Settings → Pages → Source**: branch `main`, pasta `/ (root)`
3. Abra `https://SEU_USUARIO.github.io/NOME_DO_REPO/`

### Fluxo recomendado (quando o proxy falha)

1. No PC, baixe a playlist (navegador ou curl/VLC)
2. No player: **Adicionar lista → Arquivo / Colar**
3. Selecione o `.m3u` ou cole o texto
4. **Salvar e carregar**

## Funções

| Recurso | Arquivo |
|---------|---------|
| Lista padrão | `js/config.js` |
| Proxies CORS | `js/proxies.js` |
| Excluir cache | `js/storage.js` |
| Adicionar M3U / Xtream / arquivo | `js/add-list.js` |
| Player de vídeo | `js/player.js` |

## Observações

- Dados ficam no `localStorage` do navegador (textos muito grandes não são persistidos).
- Use apenas streams que você tem direito de acessar.
- Proxies públicos são terceiros e instáveis para arquivos grandes.
