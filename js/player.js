/* Reprodução HLS / MP4 com hls.js + loader proxyado */
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

  createProxiedLoader(mode) {
    const BaseLoader = Hls.DefaultConfig.loader;
    const build = (url) => IPTV.proxies.build(url, mode);

    return class ProxiedLoader extends BaseLoader {
      load(context, config, callbacks) {
        if (context && context.url) {
          const u = context.url;
          const already =
            u.includes('allorigins.win') ||
            u.includes('corsproxy.io') ||
            u.includes('codetabs.com') ||
            u.includes('corsproxy.org');
          if (!already && mode !== 'none') {
            context.url = build(u);
          }
        }
        super.load(context, config, callbacks);
      }
    };
  },

  tryPlayUrl(originalUrl, mode) {
    const video = IPTV.els.video;
    const playUrl = mode === 'none' ? originalUrl : IPTV.proxies.build(originalUrl, mode);

    return new Promise((resolve, reject) => {
      if (!this.isHlsUrl(originalUrl)) {
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

      if (video.canPlayType('application/vnd.apple.mpegurl') && mode === 'none') {
        video.src = originalUrl;
        const onErr = () => { cleanup(); reject(new Error('Erro nativo de mídia')); };
        const onOk = () => { cleanup(); video.play().then(resolve).catch(reject); };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onOk);
          video.removeEventListener('error', onErr);
        };
        video.addEventListener('loadedmetadata', onOk);
        video.addEventListener('error', onErr);
        return;
      }

      if (!window.Hls || !Hls.isSupported()) {
        video.src = playUrl;
        video.play().then(resolve).catch(reject);
        return;
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

      hls.loadSource(mode === 'none' ? originalUrl : IPTV.proxies.build(originalUrl, mode));
      hls.attachMedia(video);
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

    const modes = IPTV.proxies.modesFor(IPTV.state.proxyMode);
    let played = false;
    let lastErr = null;

    for (const mode of modes) {
      try {
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
        '\n\nDica: troque o Proxy CORS ou teste outro título.';
      IPTV.els.overlayMsg.classList.add('show');
    }
  }
};
