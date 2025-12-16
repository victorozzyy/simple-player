// channels.js - Gerenciamento de canais COM NAVEGAÇÃO EM 3 NÍVEIS
// Versão 5.2 - Foco correto ao voltar do player

const ChannelModule = {
    channelList: null,
    messageArea: null,
    messageTimeout: null,

    MAX_PER_SUBCATEGORY: 1000,

    init() {
        this.channelList = document.getElementById('channelList');
        
        // 🔔 Retorno do player
        window.addEventListener("player-closed", () => {
            this.handleReturnFromPlayer();
        });

        this.messageArea = document.getElementById('messageArea');

        if (typeof SearchModule !== 'undefined') {
            SearchModule.init();
        }

        console.log('✅ ChannelModule inicializado (v5.2 - Foco correto ao voltar do player)');
    },
    
    showMessage(text, duration = 3000) {
        if (!this.messageArea) {
            this.messageArea = document.getElementById('messageArea');
        }

        if (!this.messageArea) {
            console.warn('messageArea não encontrada');
            return;
        }

        this.messageArea.textContent = text;
        this.messageArea.style.display = 'block';

        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            this.messageArea.style.display = 'none';
        }, duration);
    },

    // ========================================
    // 📺 ATUALIZAR LISTA DE CANAIS (NÍVEL 1: CATEGORIAS)
    // ========================================
    updateChannelList() {
        const playlist = AppState.currentPlaylist || [];

        if (!playlist.length) {
            this.channelList.innerHTML = '<li class="no-channels">Nenhuma playlist carregada</li>';
            if (SearchModule) SearchModule.hide();
            return;
        }

        const grouped = this.groupWithSubcategories(playlist);
        const fragment = document.createDocumentFragment();

        // Header com nome da playlist
        if (AppState.currentPlaylistName) {
            const header = document.createElement('li');
            header.textContent = `📂 Playlist: ${AppState.currentPlaylistName}`;
            header.style.cssText = 'color:#00e676;padding:15px;font-weight:bold;list-style:none;';
            fragment.appendChild(header);
        }

        // Criar headers de categorias
        Object.keys(grouped).sort().forEach(category => {
            const total = grouped[category].reduce((a, b) => a + b.channels.length, 0);
            const header = this.createCategoryHeader(category, total, grouped[category]);
            fragment.appendChild(header);
        });

        this.channelList.innerHTML = '';
        this.channelList.appendChild(fragment);

        AppState.currentView = 'channels';
        AppState.channelItems = Array.from(document.querySelectorAll('.category-header'));

        if (SearchModule) SearchModule.show();
        
        if (AppState.channelItems.length > 0) {
            NavigationModule.setFocusElement(AppState.channelItems[0]);
        }
    },

    // ========================================
    // 📋 CRIAR HEADER DE CATEGORIA (NÍVEL 1)
    // ========================================
    createCategoryHeader(name, count, subcategories) {
        const li = document.createElement('li');
        li.className = 'category-header';
        li.tabIndex = 0;
        li.dataset.group = name;

        const emoji = name === 'Todos os Canais' ? '📺' : '📁';
        
        li.innerHTML = `<strong>${emoji} ${name} (${count} canais)</strong>`;
        
        li.style.cssText = `
            color: #6bff6b;
            padding: 15px 10px;
            border-bottom: 2px solid #333;
            cursor: pointer;
            background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
            border-radius: 5px;
            margin-bottom: 5px;
            list-style: none;
        `;

        // Ao clicar, abre overlay com SUBCATEGORIAS
        li.onclick = () => {
            this.showSubcategoryOverlay(name, subcategories);
        };

        li.onkeydown = e => {
            if (e.key === 'Enter') li.click();
        };

        return li;
    },

    // ========================================
    // 🧠 AGRUPAMENTO COM SUBCATEGORIAS
    // ========================================
    groupWithSubcategories(channels) {
        const categories = {};

        channels.forEach(ch => {
            const cat = ch.group || 'Outros';
            if (!categories[cat]) categories[cat] = {};
            const series = this.extractSeriesName(ch.name) || 'OUTROS';

            if (!categories[cat][series]) categories[cat][series] = [];
            categories[cat][series].push(ch);
        });

        const result = {};

        Object.keys(categories).forEach(cat => {
            result[cat] = [];

            Object.keys(categories[cat]).forEach(series => {
                const list = categories[cat][series];

                // Se tem muitos canais, dividir em partes
                if (list.length > this.MAX_PER_SUBCATEGORY) {
                    let part = 1;
                    for (let i = 0; i < list.length; i += this.MAX_PER_SUBCATEGORY) {
                        result[cat].push({
                            name: `${series} - Parte ${part}`,
                            channels: list.slice(i, i + this.MAX_PER_SUBCATEGORY)
                        });
                        part++;
                    }
                } else {
                    result[cat].push({
                        name: series,
                        channels: list
                    });
                }
            });
        });

        return result;
    },

    // Extrai nome da série (sem episódio)
    extractSeriesName(name) {
        if (!name) return null;

        let clean = name
            .replace(/\s*[\(\[]?(S\d+E\d+|\d+x\d+|EP\s*\d+|EPISÓDIO\s*\d+)[\)\]]?/gi, '')
            .replace(/\s*[-—_]\s*\d+$/g, '')
            .replace(/\s*\d+$/g, '')
            .trim();

        // Evita falsos positivos
        if (clean.length < 4 || clean === name.trim()) {
            return null;
        }

        return clean;
    },

    // ========================================
    // 📂 OVERLAY DE SUBCATEGORIAS (NÍVEL 2)
    // ========================================
    showSubcategoryOverlay(categoryName, subcategories) {
        const overlay = this.createOverlayElement();
        const title = document.getElementById('overlayTitle');
        const grid = document.getElementById('overlayChannelGrid');
        const breadcrumb = document.getElementById('overlayBreadcrumb');

        // Breadcrumb
        breadcrumb.innerHTML = `
            <span style="color: #aaa;">📁 ${categoryName}</span>
        `;

        title.textContent = `📂 ${categoryName} - Selecione uma subcategoria`;
        grid.innerHTML = '';
        AppState.overlayChannels = [];
        AppState.currentCategory = categoryName;
        AppState.currentSubcategories = subcategories;

        // Criar cards de subcategorias
        subcategories.forEach((sub, index) => {
            const card = this.createSubcategoryCard(sub, index);
            grid.appendChild(card);
            AppState.overlayChannels.push(card);
        });

        overlay.style.display = 'block';
        AppState.currentView = 'overlay-subcategory';
        this.setOverlayFocus(0);

        this.showMessage(`📂 ${subcategories.length} subcategorias em "${categoryName}"`, 2000);
    },

    // ========================================
    // 🎴 CRIAR CARD DE SUBCATEGORIA
    // ========================================
    createSubcategoryCard(subcategory, index) {
        const div = document.createElement('div');
        div.className = 'overlay-channel-item subcategory-card';
        div.tabIndex = 0;
        div.dataset.subIndex = index;

        div.style.cssText = `
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
            border: 2px solid #444;
            border-radius: 10px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 120px;
        `;

        div.innerHTML = `
            <div style="font-size: 2em; margin-bottom: 10px;">📂</div>
            <div style="font-weight: bold; font-size: 1.1em; color: #6bff6b; text-align: center; margin-bottom: 8px;">
                ${subcategory.name}
            </div>
            <div style="font-size: 0.9em; color: #aaa;">
                ${subcategory.channels.length} ${subcategory.channels.length === 1 ? 'canal' : 'canais'}
            </div>
        `;

        // Ao clicar, abre os CANAIS desta subcategoria
        div.onclick = () => {
            this.showChannelsOverlay(subcategory, index);
        };

        div.onkeydown = e => {
            if (e.key === 'Enter') this.showChannelsOverlay(subcategory, index);
        };

        // Hover effects
        div.onmouseenter = () => {
            div.style.borderColor = '#6bff6b';
            div.style.background = 'linear-gradient(135deg, #333 0%, #2a2a2a 100%)';
            div.style.transform = 'scale(1.05)';
        };

        div.onmouseleave = () => {
            if (!div.classList.contains('focused')) {
                div.style.borderColor = '#444';
                div.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)';
                div.style.transform = 'scale(1)';
            }
        };

        return div;
    },

    // ========================================
    // 📺 OVERLAY DE CANAIS (NÍVEL 3)
    // ========================================
    showChannelsOverlay(subcategory, subIndex) {
        const grid = document.getElementById('overlayChannelGrid');
        const title = document.getElementById('overlayTitle');
        const breadcrumb = document.getElementById('overlayBreadcrumb');
        const backBtn = document.getElementById('overlayBackBtn');

        // Breadcrumb navegável
        breadcrumb.innerHTML = `
            <span style="color: #aaa; cursor: pointer;" id="breadcrumbCategory">
                📁 ${AppState.currentCategory}
            </span>
            <span style="color: #666; margin: 0 8px;">›</span>
            <span style="color: #6bff6b;">📂 ${subcategory.name}</span>
        `;

        // Voltar para subcategorias ao clicar na categoria do breadcrumb
        document.getElementById('breadcrumbCategory').onclick = () => {
            this.showSubcategoryOverlay(AppState.currentCategory, AppState.currentSubcategories);
        };

        // Mostrar botão voltar
        backBtn.style.display = 'inline-block';
        backBtn.onclick = () => {
            this.showSubcategoryOverlay(AppState.currentCategory, AppState.currentSubcategories);
        };

        title.textContent = `📺 ${subcategory.name}`;
        grid.innerHTML = '';
        AppState.overlayChannels = [];
        AppState.currentSubCategoryIndex = subIndex;

        // Criar cards de canais
        subcategory.channels.forEach((channel, chIndex) => {
            const el = this.createChannelItem(channel, subIndex, chIndex);
            grid.appendChild(el);
            AppState.overlayChannels.push(el);
        });

        AppState.currentView = 'overlay-channels';
        this.setOverlayFocus(0);

        this.showMessage(`📺 ${subcategory.channels.length} canais em "${subcategory.name}"`, 2000);
    },

    // ========================================
    // 🎬 ITEM DE CANAL
    // ========================================
    createChannelItem(channel, subIndex, chIndex) {
        const div = document.createElement('div');
        div.className = 'overlay-channel-item channel-card';
        div.tabIndex = 0;

        div.dataset.sub = subIndex;
        div.dataset.pos = chIndex;
        div.dataset.url = channel.url;

        const isMP4 = channel.url && channel.url.toLowerCase().endsWith('.mp4');
        const mp4Badge = isMP4 ? '<span style="background: #ffeb3b; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 0.7em; margin-left: 8px;">MP4</span>' : '';

        div.style.cssText = `
            background: #2a2a2a;
            border: 2px solid #444;
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            color: white;
        `;

        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: #6bff6b; display: flex; align-items: center;">
                ▶️ ${channel.name} ${mp4Badge}
            </div>
            <div style="font-size: 0.8em; color: #aaa;">
                ${channel.group || 'Sem categoria'}
            </div>
        `;

        div.onclick = () => this.openChannel(channel);
        div.onkeydown = e => {
            if (e.key === 'Enter') this.openChannel(channel);
        };

        // Hover effects
        div.onmouseenter = () => {
            div.style.borderColor = '#6bff6b';
            div.style.background = '#333';
        };

        div.onmouseleave = () => {
            if (!div.classList.contains('focused')) {
                div.style.borderColor = '#444';
                div.style.background = '#2a2a2a';
            }
        };

        return div;
    },

    // ========================================
    // ▶️ ABRIR CANAL NO PLAYER
    // ========================================
    openChannel(channel) {
        const index = AppState.currentPlaylist.findIndex(c => c.url === channel.url);
        AppState.setCurrentChannel(channel, index);

        // 💾 SALVAR POSIÇÃO ATUAL DO OVERLAY ANTES DE ABRIR O PLAYER
        AppState.lastOverlayFocusIndex = AppState.overlayFocusIndex;
        console.log('💾 Salvando posição do overlay:', AppState.lastOverlayFocusIndex);

        // ⭐ MOVER OVERLAY PARA TRÁS DO PLAYER
        const overlay = document.getElementById('channelOverlay');
        if (overlay) {
            overlay.style.zIndex = '5000'; // Player fica em 10000
        }

        AppState.currentView = 'player';

        if (typeof PlayerModule !== 'undefined') {
            PlayerModule.open(channel.url, channel.name, index);
        } else {
            this.showMessage('❌ Erro: PlayerModule não disponível', 3000);
        }
    },

    // ========================================
    // 🔙 RESTAURAR OVERLAY APÓS FECHAR PLAYER
    // ========================================
    restoreOverlayAfterPlayer() {
        console.log('🔙 restoreOverlayAfterPlayer chamado');
        
        const overlay = document.getElementById('channelOverlay');
        if (overlay && overlay.style.display !== 'none') {
            console.log('✅ Overlay ainda está aberto, restaurando...');
            
            // Restaurar z-index do overlay
            overlay.style.zIndex = '9999';
            
            // Restaurar view
            AppState.currentView = 'overlay-channels';
            
            // 🎯 RESTAURAR FOCO NO CANAL QUE ESTAVA SELECIONADO
            const focusIndex = AppState.lastOverlayFocusIndex >= 0 
                ? AppState.lastOverlayFocusIndex 
                : AppState.overlayFocusIndex;
                
            console.log('🎯 Restaurando foco no índice:', focusIndex);
            
            if (focusIndex >= 0 && AppState.overlayChannels.length > 0) {
                // Usar setTimeout para garantir que o DOM está pronto
                setTimeout(() => {
                    this.setOverlayFocus(focusIndex);

                    // 🔥 Garantir que o overlay reassuma o foco real
                    const overlayEl = document.getElementById('channelOverlay');
                    if (overlayEl && overlayEl.focus) {
                        overlayEl.focus();
                    }

                    // 🔐 Reativar contexto de navegação
                    AppState.currentView = 'overlay-channels';

                    console.log('✅ Foco e navegação restaurados');
                }, 100);
            }
        } else {
            console.log('⚠️ Overlay não está visível, voltando para lista de categorias');
            AppState.currentView = 'channels';
        }
    },

    // ========================================
    // 🎯 FOCO NO OVERLAY
    // ========================================
    setOverlayFocus(index) {
        if (!AppState.overlayChannels.length) return;
        
        // Garantir que o índice está dentro dos limites
        index = Math.max(0, Math.min(index, AppState.overlayChannels.length - 1));
        
        AppState.overlayChannels.forEach(el => {
            el.classList.remove('focused');
            el.style.borderColor = '#444';
            
            if (el.classList.contains('subcategory-card')) {
                el.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)';
                el.style.transform = 'scale(1)';
            } else {
                el.style.background = '#2a2a2a';
            }
        });
        
        const el = AppState.overlayChannels[index];
        el.classList.add('focused');
        el.style.borderColor = '#6bff6b';
        
        if (el.classList.contains('subcategory-card')) {
            el.style.background = 'linear-gradient(135deg, #333 0%, #2a2a2a 100%)';
            el.style.transform = 'scale(1.05)';
        } else {
            el.style.background = '#333';
        }
        
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        AppState.overlayFocusIndex = index;
    },

    moveOverlayFocus(delta) {
        const len = AppState.overlayChannels.length;
        if (len === 0) return;
        
        const next = (AppState.overlayFocusIndex + delta + len) % len;
        this.setOverlayFocus(next);
    },

    // ========================================
    // 🖼️ CRIAR OVERLAY
    // ========================================
    createOverlayElement() {
        let o = document.getElementById('channelOverlay');
        if (o) return o;

        o = document.createElement('div');
        o.id = 'channelOverlay';
        o.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            overflow-y: auto;
            padding: 20px;
            box-sizing: border-box;
        `;

        o.innerHTML = `
            <div style="
                max-width: 1200px;
                margin: 0 auto;
                background: #1a1a1a;
                border-radius: 12px;
                padding: 25px;
                border: 2px solid #333;
            ">
                <!-- Breadcrumb -->
                <div id="overlayBreadcrumb" style="
                    font-size: 0.9em;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #333;
                "></div>

                <!-- Header -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #333;
                ">
                    <h2 id="overlayTitle" style="
                        color: #6bff6b;
                        margin: 0;
                        font-size: 1.5em;
                    "></h2>
                    <div style="display: flex; gap: 10px;">
                        <button id="overlayBackBtn" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            display: none;
                        ">⬅️ Voltar</button>
                        <button id="overlayCloseBtn" tabindex="0" style="
                            background: #ff4444;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">✕ Fechar</button>
                    </div>
                </div>

                <!-- Grid de conteúdo -->
                <div id="overlayChannelGrid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 15px;
                    max-height: 65vh;
                    overflow-y: auto;
                    padding: 10px;
                "></div>
            </div>
        `;

        document.body.appendChild(o);
        
        // Botão fechar
        document.getElementById('overlayCloseBtn').onclick = () => this.hideOverlay();
        
        return o;
    },

    // ========================================
    // 🚪 FECHAR OVERLAY
    // ========================================
    hideOverlay() {
        const overlay = document.getElementById('channelOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.zIndex = '9999'; // Resetar z-index
        }
        
        AppState.currentView = 'channels';
        AppState.overlayChannels = [];
        AppState.overlayFocusIndex = 0;
        AppState.lastOverlayFocusIndex = -1;
        
        setTimeout(() => {
            const firstHeader = document.querySelector('.category-header');
            if (firstHeader) {
                NavigationModule.setFocusElement(firstHeader);
            }
        }, 100);
    },

    // ========================================
    // ⬅️ VOLTAR NO OVERLAY
    // ========================================
    handleOverlayBack() {
        if (AppState.currentView === 'overlay-channels') {
            // Está nos canais, volta para subcategorias
            this.showSubcategoryOverlay(AppState.currentCategory, AppState.currentSubcategories);
        } else if (AppState.currentView === 'overlay-subcategory') {
            // Está nas subcategorias, fecha o overlay
            this.hideOverlay();
        }
    },

    // ========================================
    // 🔙 RETORNO DO PLAYER (ORQUESTRADOR)
    // ========================================
    handleReturnFromPlayer() {
        console.log('🔙 handleReturnFromPlayer');

        const overlay = document.getElementById('channelOverlay');

        // Overlay tem prioridade absoluta
        if (
            overlay &&
            overlay.style.display !== 'none' &&
            AppState.lastOverlayFocusIndex >= 0
        ) {
            AppState.currentView = 'overlay-channels';
            this.restoreOverlayAfterPlayer();
            return;
        }

        // Fallback seguro
        this.updateChannelList();
    },

};

// ========================================
// 🎮 NAVEGAÇÃO POR TECLADO
// ========================================
document.addEventListener('keydown', e => {
    if (!AppState.currentView || !AppState.currentView.startsWith('overlay')) return;

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            ChannelModule.moveOverlayFocus(-3);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            ChannelModule.moveOverlayFocus(-1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            ChannelModule.moveOverlayFocus(3);
            break;
        case 'ArrowRight':
            e.preventDefault();
            ChannelModule.moveOverlayFocus(1);
            break;
        case 'Backspace':
        case 'Escape':
            e.preventDefault();
            ChannelModule.handleOverlayBack();
            break;
        case 'Enter':
            // já tratado pelo elemento focado
            break;
    }
});

console.log('✅ ChannelModule v5.2 carregado - Foco correto ao voltar do player');
