/**
 * HLS: segue redirects, reescreve /hls/... com base no host FINAL (CDN).
 */
window.IPTV = window.IPTV || {};

IPTV.player = {
  stop() {
    if (IPTV.state.hls) {
      try { IPTV.state.hls.destroy(); } catch (_) {}
      IPTV.state.hls = null;
    }
    if (IPTV.state.blobUrl) {
      try { URL.revokeObjectURL(IPTV.state.blobUrl); } catch (_) {}
      IPTV.state.blobUrl = null;
    }
    const video = IPTV.els.video;
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (_) {}
  },

  isHlsUrl(url) {
    return /\.m3u8(\?|$)/i.test(url) || /type=m3u8/i.test(url);
  },

  /**
   * baseUrl deve ser a URL FINAL após redirects (CDN/token).
   */
  rewriteManifest(text, baseUrl) {
    let originBase;
    try {
      originBase = new URL(baseUrl).origin;
    } catch (_) {
      return text;
    }

    return text
      .split(/\r?\n/)
      .map((line) => {
        const t = line.trim();
        if (!t) return line;

        if (t.startsWith('#')) {
          return line.replace(/URI="([^"]+)"/gi, (_, uri) => {
            try {
              return `URI="${new URL(uri, originBase + '/').href}"`;
            } catch (_) {
              return `URI="${uri}"`;
            }
          });
        }

        try {
          return new URL(t, originBase + '/').href;
        } catch (_) {
          return line;
        }
      })
      .join('\n');
  },

  createProxiedLoader(mode) {
    const BaseLoader = Hls.DefaultConfig.loader;
    const build = (url) => IPTV.proxies.build(url, mode);

    return class ProxiedLoader extends BaseLoader {
      load(context, config, callbacks) {
        if (context && context.url && mode !== 'none') {
          const u = context.url;
          if (
            !u.startsWith('blob:') &&
            !u.includes('127.0.0.1:8787') &&
            !u.includes('allorigins.win') &&
            !u.includes('corsproxy.io') &&
            !u.includes('codetabs.com') &&
            !u.includes('corsproxy.org')
          ) {
            context.url = build(u);
          }
        }
        super.load(context, config, callbacks);
      }
    };
  },

  async prepareHlsSource(originalUrl, mode) {
    const result = await IPTV.proxies.fetchTextOnce(originalUrl, mode);
    const text = result.text;
    // Quando mode=none, res.url é o host final (CDN).
    // Com proxy local, res.url é o proxy — usar originalUrl só se final for proxy.
    let baseForRewrite = result.finalUrl || originalUrl;
    if (
      baseForRewrite.includes('127.0.0.1:8787') ||
      baseForRewrite.includes('allorigins') ||
      baseForRewrite.includes('corsproxy') ||
      baseForRewrite.includes('codetabs')
    ) {
      // Tenta extrair url= do proxy; senão usa original
      try {
        const u = new URL(baseForRewrite);
        const inner = u.searchParams.get('url');
        baseForRewrite = inner || originalUrl;
      } catch (_) {
        baseForRewrite = originalUrl;
      }
    }

    // Se o proxy não seguiu redirect até o CDN, precisamos descobrir o host real.
    // Heurística: se o texto tem só /hls/ e a base ainda é o painel Xtream, buscar Location via...
    // Com fetch follow no browser, mode=none já entrega finalUrl do CDN.

    if (!/#EXT/i.test(text)) {
      throw new Error('Resposta não é m3u8');
    }

    IPTV.ui.log('Base do manifest: ' + baseForRewrite.slice(0, 100));
    const rewritten = this.rewriteManifest(text, baseForRewrite);
    const blob = new Blob([rewritten], {
      type: 'application/vnd.apple.mpegurl'
    });
    if (IPTV.state.blobUrl) {
      try { URL.revokeObjectURL(IPTV.state.blobUrl); } catch (_) {}
    }
    IPTV.state.blobUrl = URL.createObjectURL(blob);
    return { blobUrl: IPTV.state.blobUrl, baseForRewrite, sample: rewritten.split('\n').filter((l) => l && !l.startsWith('#')).slice(0, 1)[0] };
  },

  tryPlayUrl(originalUrl, mode) {
    const video = IPTV.els.video;

    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isHlsUrl(originalUrl)) {
          const playUrl =
            mode === 'none' ? originalUrl : IPTV.proxies.build(originalUrl, mode);
          video.src = playUrl;
          const onErr = () => { cleanup(); reject(new Error('Erro ao carregar mídia')); };
          const onOk = () => { cleanup(); video.play().then(resolve).catch(reject); };
          const cleanup = () => {
            video.removeEventListener('loadeddata', onOk);
            video.removeEventListener('error', onErr);
          };
          video.addEventListener('loadeddata', onOk);
          video.addEventListener('error', onErr);
          return;
        }

        if (!window.Hls || !Hls.isSupported()) {
          reject(new Error('Hls.js não suportado'));
          return;
        }

        IPTV.ui.log(`Preparando manifest (${mode})...`);
        const prepared = await this.prepareHlsSource(originalUrl, mode);
        if (prepared.sample) {
          IPTV.ui.log('Segmento exemplo: ' + prepared.sample.slice(0, 100));
        }

        const config = {
          enableWorker: true,
          lowLatencyMode: false,
          enableSoftwareAES: true,
          xhrSetup(xhr) {
            try { xhr.withCredentials = false; } catch (_) {}
          }
        };

        if (mode !== 'none') {
          config.loader = this.createProxiedLoader(mode);
        }

        const hls = new Hls(config);
        IPTV.state.hls = hls;

        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try { hls.destroy(); } catch (_) {}
            reject(new Error('Timeout ao carregar stream'));
          }
        }, IPTV.STREAM_TIMEOUT_MS);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          video.play().then(resolve).catch(reject);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal && !settled) {
            settled = true;
            clearTimeout(timer);
            try { hls.destroy(); } catch (_) {}
            reject(new Error(data.type + ': ' + (data.details || 'fatal')));
          }
        });

        hls.loadSource(prepared.blobUrl);
        hls.attachMedia(video);
      } catch (err) {
        reject(err);
      }
    });
  },

  async playChannel(channel) {
    if (channel.kind === 'series' && !channel.url) {
      await IPTV.playlist.openSeries(channel);
      return;
    }

    const url = channel.url;
    if (!url) {
      IPTV.ui.log('Item sem URL de stream');
      return;
    }

    IPTV.state.currentChannel = channel;
    IPTV.ui.renderChannels();
    IPTV.els.nowPlaying.textContent = channel.name;
    IPTV.els.nowMeta.textContent =
      (channel.group || channel.seriesName || 'Geral') + ' · ' + url.slice(0, 90);
    IPTV.els.overlayMsg.classList.remove('show');
    IPTV.ui.setStatus('Conectando...', 'warn');
    IPTV.ui.log('Reproduzindo: ' + channel.name);
    IPTV.ui.log('URL: ' + url);

    this.stop();

    // Este painel envia Access-Control-Allow-Origin: * após redirect —
    // tentar "none" primeiro ajuda em testes locais HTTP.
    let modes = IPTV.proxies.modesFor(IPTV.state.proxyMode);
    if (IPTV.state.proxyMode === 'auto') {
      modes = ['none', 'local', 'allorigins', 'codetabs', 'corsproxyorg', 'corsproxy'];
    }

    let played = false;
    let lastErr = null;

    for (const mode of modes) {
      try {
        if (mode === 'local') {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 1500);
            await fetch('http://127.0.0.1:8787/health', { signal: ctrl.signal });
            clearTimeout(t);
          } catch (_) {
            IPTV.ui.log('Proxy local offline. Pulando...');
            continue;
          }
        }

        await this.tryPlayUrl(url, mode);
        played = true;
        IPTV.ui.setProxyBadge(mode);
        IPTV.ui.setStatus('Reproduzindo', 'ok');
        IPTV.ui.log('Stream OK via ' + mode);
        break;
      } catch (err) {
        lastErr = err;
        IPTV.ui.log('Falha stream (' + mode + '): ' + err.message);
        this.stop();
      }
    }

    if (!played) {
      IPTV.ui.setStatus('Falha no stream', 'err');
      IPTV.els.overlayMsg.textContent =
        'Não foi possível reproduzir este canal.\n' +
        (lastErr ? lastErr.message : '') +
        '\n\n1) Teste em http://localhost (não file://)\n' +
        '2) Ou rode: node proxy-server.js e use Proxy Local';
      IPTV.els.overlayMsg.classList.add('show');
    }
  }
};
