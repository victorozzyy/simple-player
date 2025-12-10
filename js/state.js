// state.js - Gerenciamento centralizado de estado (sem localStorage)
// v2.0 - Com suporte a sistema de filtros

const AppState = {
    // Playlist atual
    currentPlaylist: [],
    currentPlaylistName: "",
    currentPlaylistType: "",
    originalPlaylist: null, // 🛡️ Backup da playlist antes dos filtros
    
    // Canal atual
    currentChannel: null,
    currentChannelIndex: -1,
    lastPosition: 0,
    
    // Navegação
    currentView: 'buttons',
    focusIndex: 0,
    currentFocusIndex: -1,
    playlistFocusIndex: -1,
    remoteFocusIndex: -1,
    overlayFocusIndex: 0,
    
    // Cache
    cache: new Map(),
    cacheTimestamps: new Map(),
    
    // 🛡️ Configurações de filtro (em memória durante a sessão)
    filterSettings: null,
    filtersActive: false,
    
    // Arrays de elementos DOM
    channelItems: [],
    playlistItems: [],
    remotePlaylistItems: [],
    overlayChannels: [],
    
    // Flags
    restoringState: false,
    isPlaying: false,
    
    // ==========================================
    // MÉTODOS DE PLAYLIST
    // ==========================================
    
    setPlaylist(urls, name, type) {
        console.log(`📋 Definindo playlist: ${name} (${urls.length} canais)`);
        this.currentPlaylist = urls;
        this.currentPlaylistName = name;
        this.currentPlaylistType = type;
        
        // Limpar backup ao carregar nova playlist
        this.originalPlaylist = null;
        this.filtersActive = false;
    },
    
    setCurrentChannel(channel, index) {
        console.log(`📺 Canal atual: ${channel?.name} (índice: ${index})`);
        this.currentChannel = channel;
        this.currentChannelIndex = index;
    },
    
    resetChannelPosition() {
        this.lastPosition = 0;
    },
    
    // ==========================================
    // MÉTODOS DE CACHE
    // ==========================================
    
    cachePlaylist(key, data) {
        this.cache.set(key, data);
        this.cacheTimestamps.set(key, Date.now());
        
        // Limita cache a 10 entradas
        if (this.cache.size > 10) {
            const oldest = [...this.cacheTimestamps.entries()]
                .sort(([,a], [,b]) => a - b)[0][0];
            this.cache.delete(oldest);
            this.cacheTimestamps.delete(oldest);
        }
        
        console.log(`💾 Playlist cacheada: ${key} (${data.length} canais)`);
    },
    
    getCachedPlaylist(key) {
        if (this.cache.has(key)) {
            this.cacheTimestamps.set(key, Date.now());
            const cached = this.cache.get(key);
            console.log(`📦 Cache recuperado: ${key} (${cached.length} canais)`);
            return cached;
        }
        return null;
    },
    
    clearCache() {
        const cacheSize = this.cache.size;
        this.cache.clear();
        this.cacheTimestamps.clear();
        console.log(`🗑️ Cache limpo (${cacheSize} entradas removidas)`);
    },
    
    // ==========================================
    // MÉTODOS DE FILTROS
    // ==========================================
    
    saveFilterSettings(settings) {
        this.filterSettings = { ...settings };
        console.log('💾 Configurações de filtro salvas:', settings);
    },
    
    getFilterSettings() {
        return this.filterSettings ? { ...this.filterSettings } : null;
    },
    
    hasOriginalPlaylist() {
        return this.originalPlaylist !== null && this.originalPlaylist.length > 0;
    },
    
    backupPlaylist() {
        if (!this.originalPlaylist) {
            this.originalPlaylist = [...this.currentPlaylist];
            console.log(`💾 Backup da playlist criado (${this.originalPlaylist.length} canais)`);
            return true;
        }
        console.warn('⚠️ Backup já existe, não será sobrescrito');
        return false;
    },
    
    restorePlaylist() {
        if (this.originalPlaylist) {
            this.currentPlaylist = [...this.originalPlaylist];
            this.filtersActive = false;
            console.log(`↩️ Playlist restaurada (${this.currentPlaylist.length} canais)`);
            return true;
        }
        console.warn('⚠️ Nenhum backup disponível para restaurar');
        return false;
    },
    
    clearBackup() {
        this.originalPlaylist = null;
        this.filtersActive = false;
        console.log('🗑️ Backup de playlist removido');
    },
    
    applyFilteredPlaylist(filteredPlaylist) {
        if (!this.originalPlaylist) {
            this.backupPlaylist();
        }
        
        this.currentPlaylist = filteredPlaylist;
        this.filtersActive = true;
        console.log(`🛡️ Filtros aplicados (${filteredPlaylist.length} canais visíveis)`);
    },
    
    // ==========================================
    // MÉTODOS DE ESTADO GERAL
    // ==========================================
    
    reset() {
        console.log('🔄 Resetando estado da aplicação...');
        
        this.currentPlaylist = [];
        this.currentPlaylistName = "";
        this.currentPlaylistType = "";
        this.originalPlaylist = null;
        
        this.currentChannel = null;
        this.currentChannelIndex = -1;
        this.lastPosition = 0;
        
        this.currentView = 'buttons';
        this.focusIndex = 0;
        this.currentFocusIndex = -1;
        this.playlistFocusIndex = -1;
        this.remoteFocusIndex = -1;
        this.overlayFocusIndex = 0;
        
        this.channelItems = [];
        this.playlistItems = [];
        this.remotePlaylistItems = [];
        this.overlayChannels = [];
        
        this.restoringState = false;
        this.isPlaying = false;
        this.filtersActive = false;
        
        console.log('✅ Estado resetado com sucesso');
    },
    
    // ==========================================
    // MÉTODOS DE DIAGNÓSTICO
    // ==========================================
    
    getStatus() {
        return {
            playlist: {
                name: this.currentPlaylistName,
                type: this.currentPlaylistType,
                channels: this.currentPlaylist.length,
                hasBackup: this.hasOriginalPlaylist(),
                filtersActive: this.filtersActive
            },
            channel: {
                current: this.currentChannel?.name || 'Nenhum',
                index: this.currentChannelIndex,
                position: this.lastPosition,
                playing: this.isPlaying
            },
            navigation: {
                view: this.currentView,
                focusIndex: this.focusIndex
            },
            cache: {
                entries: this.cache.size,
                keys: Array.from(this.cache.keys())
            },
            filters: {
                configured: this.filterSettings !== null,
                active: this.filtersActive,
                settings: this.filterSettings
            }
        };
    },
    
    printStatus() {
        const status = this.getStatus();
        console.log('═══════════════════════════════════════');
        console.log('📊 STATUS DA APLICAÇÃO');
        console.log('═══════════════════════════════════════');
        console.log('📋 Playlist:', status.playlist);
        console.log('📺 Canal:', status.channel);
        console.log('🧭 Navegação:', status.navigation);
        console.log('💾 Cache:', status.cache);
        console.log('🛡️ Filtros:', status.filters);
        console.log('═══════════════════════════════════════');
    },
    
    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    
    isPlaylistLoaded() {
        return this.currentPlaylist.length > 0;
    },
    
    getChannelCount() {
        return this.currentPlaylist.length;
    },
    
    getOriginalChannelCount() {
        return this.originalPlaylist ? this.originalPlaylist.length : this.currentPlaylist.length;
    },
    
    getBlockedChannelCount() {
        if (!this.filtersActive || !this.originalPlaylist) {
            return 0;
        }
        return this.originalPlaylist.length - this.currentPlaylist.length;
    }
};

// Atalho global para debug (útil no console do navegador)
if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.debugState = () => AppState.printStatus();
}

// Export para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
}

console.log('✅ AppState carregado (v2.0 - Com suporte a filtros)');
console.log('💡 Digite "debugState()" no console para ver status completo');