# IPTV Player (M3U8 / Xtream) — GitHub Pages

Player web de IPTV compatível com **GitHub Pages** (HTTPS), com:

- Lista padrão pré-configurada
- Adicionar lista **M3U/M3U8** por URL
- Adicionar lista **Xtream Codes** (DNS + usuário + senha)
- Player HLS (hls.js) no navegador
- Proxies CORS para contornar bloqueios HTTP/CORS em Pages
- Botão **Excluir dados em cache** (localStorage + Cache API)

## Lista padrão

```
http://srv.cldplay.in:80/get.php?username=lelezago&password=lelezago@2021&type=m3u_plus
```

## Como publicar no GitHub Pages

1. Crie um repositório (ex: `iptv-player`)
2. Envie o arquivo `index.html` (e este README se quiser)
3. Em **Settings → Pages → Source**: branch `main` / pasta `/ (root)`
4. Acesse `https://SEU_USUARIO.github.io/iptv-player/`

## CORS / erros comuns

Erros como:

- `Access to fetch ... has been blocked by CORS policy`
- `Failed to load resource: 404` em proxies (`api.allorigins.win`, etc.)
- `net::ERR_FAILED` em hosts HTTP mistos

São esperados em alguns servidores IPTV. Use o seletor **Proxy CORS**:

| Opção | Uso |
|--------|-----|
| Automático | Tenta direto → allorigins → corsproxy → codetabs |
| Sem proxy | Requisição direta (melhor quando o servidor libera CORS) |
| allorigins / corsproxy / codetabs | Força proxy público |

Se um proxy retornar 404, o modo **Automático** tenta o próximo.

## Observações

- Credenciais e listas ficam apenas no **localStorage** do seu navegador.
- Use apenas listas e streams que você tem direito de acessar.
- Proxies públicos são terceiros; disponibilidade pode variar.
