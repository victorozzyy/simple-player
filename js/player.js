// player.js - Versão Web Browser
// COM SALVAMENTO DE CONTEXTO DE PLAYLIST

const PlayerModule = {
    
    // Abre player na mesma aba
    open(url, name, channelIndex) {
        console.log('╔═══════════════════════════════════════╗');
        console.log('📺 ABRINDO PLAYER');
        console.log('╚═══════════════════════════════════════╝');
        console.log('Canal:', name);
        console.log('URL:', url);
        console.log('Índice:', channelIndex);
        console.log('═══════════════════════════════════════');
        
        // Valida URL
        if (!url || !url.trim()) {
            console.error('❌ URL inválida ou vazia');
            if (typeof ChannelModule !== 'undefined') {
                ChannelModule.showMessage('❌ URL do canal inválida', 'error');
            }
            return;
        }
        
        // Log da URL completa para debug
        console.log('🔗 URL completa:', url);
        console.log('📏 Tamanho da URL:', url.length, 'caracteres');
        
        // 🔒 RECUPERA PLAYLIST DO APPSTATE
        let playlist = [];
        
        if (typeof AppState !== 'undefined' && AppState.currentPlaylist && AppState.currentPlaylist.length > 0) {
            playlist = AppState.currentPlaylist;
            console.log('✅ Playlist do AppState:', playlist.length, 'canais');
            
            // Log dos primeiros 3 canais para debug
            console.log('📋 Primeiros canais da playlist:');
            playlist.slice(0, 3).forEach((ch, i) => {
                console.log(`  ${i + 1}. ${ch.name} - ${ch.url?.substring(0, 50)}...`);
            });
        } else {
            console.warn('⚠️ AppState.currentPlaylist vazio');
            console.warn('⚠️ Playlist não estará disponível para navegação entre canais');
        }
        
        // 🔑 SALVAR CONTEXTO DA PLAYLIST
        if (typeof StateManager !== 'undefined' && typeof AppState !== 'undefined') {
            console.log('═══════════════════════════════════════');
            console.log('💾 SALVANDO CONTEXTO DA PLAYLIST');
            console.log('═══════════════════════════════════════');
            
            const playlistName = AppState.currentPlaylistName || 'Playlist';
            const playlistType = AppState.currentPlaylistType || 'unknown';
            const categoryName = AppState.currentCategory || null;
            
            console.log('📂 Playlist:', playlistName);
            console.log('📌 Tipo:', playlistType);
            console.log('📁 Categoria:', categoryName);
            
            StateManager.savePlaylistContext(playlistName, playlistType, categoryName);
            console.log('═══════════════════════════════════════');
        }
        
        // 💾 SALVAR ESTADO USANDO STATEMANAGER
        if (typeof StateManager !== 'undefined') {
            console.log('💾 Salvando estado com StateManager...');
            
            const saved = StateManager.savePlayerState(url, name, channelIndex, playlist);
            
            if (!saved) {
                console.error('❌ Falha ao salvar estado');
                if (typeof ChannelModule !== 'undefined') {
                    ChannelModule.showMessage('⚠️ Erro ao salvar estado', 'warning');
                }
            } else {
                console.log('✅ Estado salvo com sucesso');
            }
        } else {
            console.error('❌ StateManager não disponível!');
            console.warn('⚠️ Usando fallback básico');
            
            // Fallback básico (sem StateManager)
            try {
                const minimalData = {
                    url,
                    name,
                    channelIndex: channelIndex >= 0 ? channelIndex : 0,
                    playlist: playlist.length > 0 ? playlist : [],
                    timestamp: Date.now()
                };
                localStorage.setItem('currentChannel', JSON.stringify(minimalData));
                sessionStorage.setItem('playerOriginUrl', window.location.href);
                console.log('💾 Fallback: dados salvos no localStorage');
            } catch (e) {
                console.error('❌ Erro no fallback:', e);
            }
        }
        
        // Monta URL do player
        const playerUrl = `player.html?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}&index=${channelIndex}`;
        
        console.log('╔═══════════════════════════════════════╗');
        console.log('🔗 REDIRECIONAMENTO');
        console.log('╚═══════════════════════════════════════╝');
        console.log('URL do player:', playerUrl);
        console.log('Tamanho total:', playerUrl.length, 'caracteres');
        console.log('═══════════════════════════════════════');
        console.log('✅ Redirecionando em 100ms...');
        
        // Abrir em nova aba para permitir autoplay
        console.log('🚀 ABRINDO PLAYER EM NOVA ABA');
        
        // Usar window.open diretamente na interação do usuário
        const newWindow = window.open(playerUrl, '_blank');
        
        if (!newWindow) {
            console.warn('⚠️ Popup bloqueado, tentando na mesma aba');
            if (confirm('O navegador bloqueou a abertura em nova aba. Abrir na mesma aba?')) {
                window.location.href = playerUrl;
            }
        } else {
            console.log('✅ Player aberto em nova aba');
        }
    }
};

// Export para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerModule;
}

// Log de carregamento
console.log('✅ PlayerModule carregado (v3.0 - Web Browser)');
