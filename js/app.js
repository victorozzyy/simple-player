// app.js - Versão com retorno aprimorado

// 🛡️ Helper para adicionar event listeners com segurança
function safeAddEventListener(elementId, event, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(event, callback);
        return true;
    }
    console.warn(`⚠️ Elemento "${elementId}" não encontrado`);
    return false;
}

// 🛡️ Helper para querySelector com segurança
function safeQuerySelector(selector, callback) {
    const element = document.querySelector(selector);
    if (element && callback) {
        callback(element);
        return element;
    }
    return element;
}

// 🔑 FUNÇÃO PARA VERIFICAR RETORNO DO PLAYER
function checkReturnFromPlayer() {
    try {
        console.log('═══════════════════════════════════════');
        console.log('🔍 VERIFICANDO RETORNO DO PLAYER');
        console.log('═══════════════════════════════════════');
        
        // Verificar se StateManager está disponível
        if (typeof StateManager === 'undefined') {
            console.error('❌ StateManager não disponível!');
            
            // Fallback: verificar sessionStorage
            const returning = sessionStorage.getItem('returningFromPlayer');
            if (returning === 'true') {
                console.log('📌 Flag de retorno encontrada (fallback)');
                sessionStorage.removeItem('returningFromPlayer');
                
                // Tentar restaurar dados básicos
                try {
                    const savedData = localStorage.getItem('currentChannel');
                    if (savedData) {
                        const data = JSON.parse(savedData);
                        console.log('✅ Dados básicos restaurados:', data.name);
                        
                        if (data.playlist && data.playlist.length > 0) {
                            AppState.currentPlaylist = data.playlist;
                            AppState.currentChannelIndex = data.channelIndex || 0;
                            AppState.currentPlaylistName = data.name;
                            
                            if (typeof ChannelModule !== 'undefined' && ChannelModule.updateChannelList) {
                                ChannelModule.updateChannelList();
                            }
                            
                            return true;
                        }
                    }
                } catch (e) {
                    console.error('❌ Erro no fallback:', e);
                }
            }
            
            console.log('═══════════════════════════════════════');
            return false;
        }
        
        // Verificar flag de retorno
        const isReturning = StateManager.isReturningFromPlayer();
        
        if (!isReturning) {
            console.log('ℹ️ Não está retornando do player');
            console.log('═══════════════════════════════════════');
            return false;
        }
        
        console.log('🔙 DETECTADO RETORNO DO PLAYER!');
        console.log('═══════════════════════════════════════');
        
        // Restaurar estado no AppState
        const state = StateManager.restoreToAppState(AppState);
        
        if (!state) {
            console.warn('⚠️ Falha ao restaurar estado');
            console.log('═══════════════════════════════════════');
            return false;
        }
        
        console.log('✅ Estado restaurado com sucesso:');
        console.log('   - Canal:', state.name);
        console.log('   - Índice:', state.channelIndex);
        console.log('   - Playlist:', state.playlist?.length || 0, 'canais');
        
        // Verificar se temos playlist
        if (!state.playlist || state.playlist.length === 0) {
            console.warn('⚠️ Playlist vazia após restauração');
            if (typeof ChannelModule !== 'undefined' && ChannelModule.showMessage) {
                ChannelModule.showMessage('⚠️ Playlist não disponível', 'warning');
            }
        }
        
        // Atualizar lista de canais
        if (typeof ChannelModule !== 'undefined' && ChannelModule.updateChannelList) {
            console.log('🔄 Atualizando lista de canais...');
            ChannelModule.updateChannelList();
            console.log('✅ Lista de canais atualizada');
        } else {
            console.warn('⚠️ ChannelModule.updateChannelList não disponível');
        }
        
        // Esconder seletores
        const selectorsToHide = ['playlistSelector', 'remotePlaylistSelector', 'minhasListasSelector'];
        selectorsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                console.log('✅ Escondido:', id);
            }
        });
        
        // Mostrar lista de canais
        const channelList = document.getElementById('channelList');
        if (channelList && channelList.parentElement) {
            channelList.parentElement.style.display = 'block';
            console.log('✅ Lista de canais visível');
        }
        
        // Mostrar mensagem de sucesso
        if (typeof ChannelModule !== 'undefined' && ChannelModule.showMessage) {
            ChannelModule.showMessage(`✅ Retornou de: ${state.name}`, 'success');
        }
        
        // Focar no canal correto (após DOM renderizar)
        setTimeout(() => {
            if (typeof ChannelModule !== 'undefined' && ChannelModule.focusChannel) {
                ChannelModule.focusChannel(state.channelIndex);
                console.log('✅ Foco restaurado no canal:', state.channelIndex);
            } else {
                // Fallback: focar no primeiro canal
                const firstChannel = document.querySelector('.channel-item');
                if (firstChannel) {
                    firstChannel.focus();
                    console.log('✅ Foco no primeiro canal (fallback)');
                }
            }
        }, 300);
        
        console.log('═══════════════════════════════════════');
        console.log('✅ RETORNO PROCESSADO COM SUCESSO');
        console.log('═══════════════════════════════════════');
        
        return true;
        
    } catch (error) {
        console.error('═══════════════════════════════════════');
        console.error('❌ ERRO AO VERIFICAR RETORNO:', error);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════');
        return false;
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 M3U8 PLAYER INICIALIZADO');
    console.log('Versão: Modular com StateManager + Autoplay');
    console.log('═══════════════════════════════════════');
    
    // Verificar módulos carregados
    const requiredModules = {
        'AppState': typeof AppState !== 'undefined',
        'StateManager': typeof StateManager !== 'undefined',
        'ChannelModule': typeof ChannelModule !== 'undefined',
        'PlaylistModule': typeof PlaylistModule !== 'undefined',
        'NavigationModule': typeof NavigationModule !== 'undefined',
        'PlayerModule': typeof PlayerModule !== 'undefined'
    };
    
    console.log('📦 Módulos carregados:');
    let criticalModulesMissing = [];
    
    Object.entries(requiredModules).forEach(([name, loaded]) => {
        const status = loaded ? '✅' : '❌';
        console.log(`   ${status} ${name}`);
        
        // Módulos críticos (não podem faltar)
        const criticalModules = ['AppState', 'ChannelModule', 'PlaylistModule', 'NavigationModule', 'PlayerModule'];
        
        if (!loaded && criticalModules.includes(name)) {
            criticalModulesMissing.push(name);
        }
    });
    
    if (criticalModulesMissing.length > 0) {
        console.error('═══════════════════════════════════════');
        console.error('❌ MÓDULOS CRÍTICOS NÃO CARREGADOS:');
        criticalModulesMissing.forEach(name => {
            console.error(`   ❌ ${name}`);
        });
        console.error('═══════════════════════════════════════');
        console.error('🔍 VERIFIQUE:');
        console.error('   1. Se o arquivo js/' + criticalModulesMissing[0].toLowerCase() + '.js existe');
        console.error('   2. Se está sendo carregado no index.html');
        console.error('   3. Se não há erros de sintaxe no arquivo');
        console.error('═══════════════════════════════════════');
        
        alert('❌ Erro crítico!\n\nMódulos não carregados:\n' + criticalModulesMissing.join(', ') + '\n\nAbra o Console (F12) para mais detalhes.');
        return;
    }
    
    console.log('✅ Todos os módulos carregados');
    console.log('═══════════════════════════════════════');
    
    // Inicializar módulos
    try {
        if (typeof ChannelModule !== 'undefined' && ChannelModule.init) {
            ChannelModule.init();
            console.log('✅ ChannelModule inicializado');
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar ChannelModule:', error);
    }
    
    try {
        if (typeof PlaylistModule !== 'undefined' && PlaylistModule.init) {
            PlaylistModule.init();
            console.log('✅ PlaylistModule inicializado');
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar PlaylistModule:', error);
    }
    
    // Configurar event listeners dos botões principais
    console.log('🔧 Configurando botões...');
    setupMainButtons();
    
    // Configurar navegação por teclado
    try {
        if (typeof NavigationModule !== 'undefined' && NavigationModule.setupKeyboardControls) {
            NavigationModule.setupKeyboardControls();
            console.log('✅ NavigationModule inicializado');
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar NavigationModule:', error);
    }
    
    console.log('═══════════════════════════════════════');
    
    // 🔑 VERIFICAR SE ESTÁ VOLTANDO DO PLAYER
    const isReturningFromPlayer = checkReturnFromPlayer();
    
    if (!isReturningFromPlayer) {
        // ✅ INICIALIZAÇÃO NORMAL
        console.log('═══════════════════════════════════════');
        console.log('📋 INICIALIZAÇÃO NORMAL');
        console.log('═══════════════════════════════════════');
        
        // Resetar estado
        if (typeof AppState !== 'undefined' && AppState.reset) {
            AppState.reset();
            console.log('✅ AppState resetado');
        }
        
        // Atualizar lista de canais (vazia inicialmente)
        if (typeof ChannelModule !== 'undefined' && ChannelModule.updateChannelList) {
            ChannelModule.updateChannelList();
        }
        
        // Foco inicial nos botões
        const buttons = document.querySelectorAll('.navigable');
        if (buttons.length > 0) {
            buttons[0].focus();
            console.log('✅ Foco no primeiro botão');
        }
        
        // Mensagem de boas-vindas
        if (typeof ChannelModule !== 'undefined' && ChannelModule.showMessage) {
            ChannelModule.showMessage('💡 Selecione uma opção acima para começar', 'success');
        }
        
        console.log('═══════════════════════════════════════');
        console.log('✅ INICIALIZAÇÃO CONCLUÍDA');
        console.log('═══════════════════════════════════════');
        
    } else {
        // ✅ RETORNO DO PLAYER
        console.log('═══════════════════════════════════════');
        console.log('🔄 MODO RETORNO DO PLAYER');
        console.log('Estado mantido, não resetar AppState');
        console.log('═══════════════════════════════════════');
    }
});

// ==========================================
// CONFIGURAR BOTÕES PRINCIPAIS
// ==========================================
function setupMainButtons() {
    const buttonConfig = [
        { id: 'btnMinhasListas', handler: () => PlaylistModule.showMinhasListasSelector() },
        { id: 'btnLoadPlaylist', handler: () => PlaylistModule.showRemotePlaylistSelector() },
        { id: 'btnLocal', handler: () => PlaylistModule.showPlaylistSelector() },
        { id: 'btnUrl', handler: () => PlaylistModule.loadFromUrl() },
        { id: 'btnSingle', handler: () => PlaylistModule.loadSingleChannel() },
        { id: 'btnUpload', handler: () => PlaylistModule.handleFileUpload() },
        { id: 'btnBackFromRemote', handler: () => NavigationModule.backToButtons() },
        { id: 'btnBackFromLocal', handler: () => NavigationModule.backToButtons() }
    ];
    
    buttonConfig.forEach(({ id, handler }) => {
        const success = safeAddEventListener(id, 'click', handler);
        if (success) {
            console.log(`✅ Botão configurado: ${id}`);
        }
    });
}

// ==========================================
// UTILITÁRIO DE DEBOUNCE
// ==========================================
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ==========================================
// DIAGNÓSTICO (OPCIONAL - TECLA D)
// ==========================================
document.addEventListener('keydown', (e) => {
    if ((e.key === 'D' || e.key === 'd') && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        console.log('═══════════════════════════════════════');
        console.log('🔍 DIAGNÓSTICO DO SISTEMA');
        console.log('═══════════════════════════════════════');
        
        // Estado do AppState
        if (typeof AppState !== 'undefined') {
            console.log('📊 AppState:');
            console.log('   - Playlist:', AppState.currentPlaylist?.length || 0, 'canais');
            console.log('   - Nome:', AppState.currentPlaylistName || 'N/A');
            console.log('   - Índice atual:', AppState.currentChannelIndex);
            console.log('   - View atual:', AppState.currentView);
        }
        
        // Estado do localStorage
        if (typeof StateManager !== 'undefined') {
            console.log('💾 Storage:');
            StateManager.checkStorageSpace();
            
            const state = StateManager.loadPlayerState();
            if (state) {
                console.log('📦 Estado salvo:');
                console.log('   - Canal:', state.name);
                console.log('   - Índice:', state.channelIndex);
                console.log('   - Playlist:', state.playlist?.length || 0);
            } else {
                console.log('⚠️ Nenhum estado salvo');
            }
        }
        
        // Verificar flags de sessão
        console.log('🏁 Flags de sessão:');
        console.log('   - userInteracted:', sessionStorage.getItem('userInteracted'));
        console.log('   - returningFromPlayer:', sessionStorage.getItem('returningFromPlayer'));
        console.log('   - playerOriginUrl:', sessionStorage.getItem('playerOriginUrl'));
        
        console.log('═══════════════════════════════════════');
    }
});

console.log('✅ app.js carregado completamente');
