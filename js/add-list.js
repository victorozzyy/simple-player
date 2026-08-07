/* Modal: adicionar lista M3U, Xtream ou Arquivo/Colar */
window.IPTV = window.IPTV || {};

IPTV.addList = {
  open() {
    IPTV.els.modalAdd.classList.add('show');
  },

  close() {
    IPTV.els.modalAdd.classList.remove('show');
  },

  setTab(which) {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === which);
    });
    document.getElementById('tabM3u').classList.toggle('hidden', which !== 'm3u');
    document.getElementById('tabXtream').classList.toggle('hidden', which !== 'xtream');
    document.getElementById('tabFile').classList.toggle('hidden', which !== 'file');
  },

  clearFields() {
    [
      'm3uName',
      'm3uUrl',
      'xtName',
      'xtDns',
      'xtUser',
      'xtPass',
      'fileName',
      'fileText'
    ].forEach((id) => {
      const n = document.getElementById(id);
      if (n) n.value = '';
    });
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  },

  buildXtreamUrl(dns, user, pass) {
    let host = (dns || '').trim().replace(/\/$/, '');
    if (!host) return '';
    if (!/^https?:\/\//i.test(host)) host = 'http://' + host;
    return (
      host +
      '/get.php?username=' +
      encodeURIComponent(user) +
      '&password=' +
      encodeURIComponent(pass) +
      '&type=m3u_plus'
    );
  },

  async save() {
    const activeTab =
      document.querySelector('.tab.active')?.dataset.tab || 'm3u';
    let name;
    let url = '';
    let sourceText = null;
    let type = activeTab;

    if (activeTab === 'xtream') {
      name = (document.getElementById('xtName').value || 'Xtream').trim();
      const dns = document.getElementById('xtDns').value;
      const user = (document.getElementById('xtUser').value || '').trim();
      const pass = (document.getElementById('xtPass').value || '').trim();
      if (!dns || !user || !pass) {
        alert('Preencha DNS, usuário e senha.');
        return;
      }
      url = this.buildXtreamUrl(dns, user, pass);
    } else if (activeTab === 'file') {
      name = (document.getElementById('fileName').value || 'Lista importada').trim();
      const text = (document.getElementById('fileText').value || '').trim();
      if (!text || !/#EXT/i.test(text)) {
        alert('Cole um conteúdo M3U válido ou selecione um arquivo .m3u');
        return;
      }
      sourceText = text;
      type = 'file';
    } else {
      name = (document.getElementById('m3uName').value || 'Lista M3U').trim();
      url = (document.getElementById('m3uUrl').value || '').trim();
      if (!url) {
        alert('Informe a URL da playlist.');
        return;
      }
    }

    const id = 'pl_' + Date.now();
    const entry = { id, name, type, url };
    if (sourceText) entry.sourceText = sourceText;

    // Evita guardar texto enorme no localStorage se for gigante
    if (sourceText && sourceText.length > 2_000_000) {
      delete entry.sourceText;
      IPTV.state._pendingHugeText = sourceText;
      IPTV.ui.log(
        'Playlist muito grande para localStorage; mantida só nesta sessão.'
      );
    }

    IPTV.state.playlists.push(entry);
    IPTV.state.activePlaylistId = id;
    IPTV.storage.save({
      playlists: IPTV.state.playlists.map((p) => {
        // não persistir sourceText gigante
        if (p.sourceText && p.sourceText.length > 500_000) {
          const copy = Object.assign({}, p);
          delete copy.sourceText;
          return copy;
        }
        return p;
      }),
      activePlaylistId: id,
      proxyMode: IPTV.state.proxyMode
    });

    IPTV.ui.renderPlaylistSelect();
    this.close();
    this.clearFields();

    if (IPTV.state._pendingHugeText) {
      IPTV.playlist.loadFromText(IPTV.state._pendingHugeText, name);
      IPTV.state._pendingHugeText = null;
    } else {
      await IPTV.playlist.loadActive();
    }
  },

  bindFileInput() {
    const input = document.getElementById('fileInput');
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      IPTV.ui.log('Lendo arquivo: ' + file.name + ' (' + file.size + ' bytes)');
      try {
        const text = await file.text();
        document.getElementById('fileText').value = text;
        if (!document.getElementById('fileName').value) {
          document.getElementById('fileName').value = file.name.replace(
            /\.(m3u8?|txt)$/i,
            ''
          );
        }
      } catch (e) {
        alert('Não foi possível ler o arquivo: ' + e.message);
      }
    });
  },

  init() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => this.setTab(tab.dataset.tab));
    });

    IPTV.els.btnAddList.addEventListener('click', () => this.open());
    IPTV.els.btnCancelAdd.addEventListener('click', () => this.close());
    IPTV.els.modalAdd.addEventListener('click', (e) => {
      if (e.target === IPTV.els.modalAdd) this.close();
    });
    IPTV.els.btnSaveAdd.addEventListener('click', () => this.save());
    this.bindFileInput();
  }
};
