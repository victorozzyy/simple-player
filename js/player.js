/* Reprodução HLS com hls.js */
window.IPTV = window.IPTV || {};

IPTV.player = {
  stop() {
    if (IPTV.state.hls) {
      try {
        IPTV.state.hls.destroy();
      } catch (_) { /* ignore */ }
      IPTV.state.hls = null;
    }
    const video = IPTV.els.video;
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (_) { /* ignore */ }
  },

  tryPlayUrl(url, mode) {
    const video = IPTV.els.video;

    return new Promise((resolve, reject) => {
      // Safari / nativo
      if (
        video.canPlayType('application/vnd.apple.mpegurl') &&
        mode === 'none'
      ) {
        video.src = url;
        const onErr = () => {
          cleanup();
          reject(new Error('Erro nativo de mídia'));
        };
        const onOk = () => {
          cleanup();
          video.play().then(resolve).catch(reject);
        };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onOk);
          video.removeEventListener('error', onErr);
        };
        video.addEventListener('loadedmetadata', onOk);
        video.addEventListener('error', onErr);
        return;
      }

      if (!window.Hls || !Hls.isSupported()) {
        video.src = url;
        video.play().then(resolve).catch(reject);
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup(xhr) {
          try {
            xhr.withCredentials = false;
          } catch (_) { /* ignore */ }
        }
      });
      IPTV.state.hls = hls;

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            hls.destroy();
          } catch (_) { /* ignore */ }
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
          try {
            hls.destroy();
          } catch (_) { /* ignore */ }
          reject(new Error(data.type + ': ' + (data.details || 'fatal')));
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);
    });
  },

  async playChannel(channel) {
    IPTV.state.currentChannel = channel;
    IPTV.ui.renderChannels();
    IPTV.els.nowPlaying.textContent = channel.name;
    IPTV.els.nowMeta.textContent =
      (channel.group || 'Geral') + ' · ' + channel.url.slice(0, 80);
    IPTV.els.overlayMsg.classList.remove('show');
    IPTV.ui.setStatus('Conectando...', 'warn');
    IPTV.ui.log('Reproduzindo: ' + channel.name);

    this.stop();

    const candidates = IPTV.proxies.streamCandidates(
      channel.url,
      IPTV.state.proxyMode
    );
    let played = false;
    let lastErr = null;

    for (const cand of candidates) {
      try {
        await this.tryPlayUrl(cand.url, cand.mode);
        played = true;
        IPTV.ui.setProxyBadge(cand.mode);
        IPTV.ui.setStatus('Reproduzindo', 'ok');
        IPTV.ui.log('Stream OK via ' + cand.mode);
        break;
      } catch (err) {
        lastErr = err;
        IPTV.ui.log('Falha stream (' + cand.mode + '): ' + err.message);
      }
    }

    if (!played) {
      IPTV.ui.setStatus('Falha no stream', 'err');
      IPTV.els.overlayMsg.textContent =
        'Não foi possível reproduzir este canal.\n' +
        (lastErr ? lastErr.message : '');
      IPTV.els.overlayMsg.classList.add('show');
    }
  }
};
