// player.js - Módulo simplificado que abre player em nova aba

const PlayerModule = {
    
    // Abre canal em nova aba (como seu código funcional)
    open(url, name, channelIndex) {
        try {
            console.log(`🎯 Abrindo canal: ${name}`, { url, channelIndex });

            // Salvar estado atual para eventual retorno
            AppState.setCurrentChannel({ url, name }, channelIndex);
            
            // Construir URL do player
            const playerUrl = `player.html?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}&index=${channelIndex}`;
            
            // Abrir em nova aba
            const playerWindow = window.open(playerUrl, '_blank');
            
            if (!playerWindow) {
                alert('❌ Pop-up bloqueado!\n\nPermita pop-ups para este site nas configurações do navegador.');
            } else {
                console.log('✅ Player aberto em nova aba');
            }
            
        } catch (error) {
            console.error('Erro ao abrir canal:', error);
            alert(`❌ Erro ao abrir canal: ${error.message}`);
        }
    },
    
    // Métodos de compatibilidade (não usados nesta versão)
    close() {
        console.log('Player em nova aba - fechar manualmente');
    },
    
    togglePlayPause() {
        console.log('Player em nova aba - controles na própria aba');
    },
    
    switchChannel(offset) {
        console.log('Player em nova aba - troca de canal na própria aba');
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerModule;
}
