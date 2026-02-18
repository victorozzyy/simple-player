// xtream-client.js - Adicione/substitua o método request
/**
 * XtreamClient v1.1
 * - Compatível com GitHub Pages (HTTPS)
 * - Proxy automático para servidores HTTP
 * - Fallback inteligente
 */

const XtreamClient = {

    // ═══════════════════════════════════════════════════════════
    // CONFIGURAÇÃO
    // ═══════════════════════════════════════════════════════════

    host: '',
    username: '',
    password: '',
    userInfo: null,
    serverInfo: null,

    // Proxies para contornar Mixed Content (HTTPS → HTTP)
    PROXIES: [
        '',                                          // direto
        'https://corsproxy.io/?',                    // proxy 1
        'https://api.allorigins.win/raw?url=',       // proxy 2
        'https://api.codetabs.com/v1/proxy?quest=',  // proxy 3
    ],

    // Cache do proxy que funcionou (evita tentar todos de novo)
    _workingProxyIndex: -1,

    // ═══════════════════════════════════════════════════════════
    // CONFIGURAR
    // ═══════════════════════════════════════════════════════════

    configure(host, username, password) {
        // Remove trailing slash
        this.host = host.replace(/\/+$/, '');
        this.username = username;
        this.password = password;
        this._workingProxyIndex = -1;  // Reset proxy cache ao mudar de servidor
        console.log('🔧 XtreamClient configurado:', this.host);
    },

    // ═══════════════════════════════════════════════════════════
    // REQUEST COM PROXY AUTOMÁTICO
    // ═══════════════════════════════════════════════════════════

    /**
     * Faz requisição com fallback automático de proxy
     * @param {string} endpoint - Caminho relativo (ex: /player_api.php?...)
     * @returns {Promise<Object>} JSON response
     */
    async request(endpoint) {
        const fullUrl = `${this.host}${endpoint}`;
        const pageIsHTTPS = window.location.protocol === 'https:';
        const urlIsHTTP = fullUrl.startsWith('http://');
        const needsProxy = pageIsHTTPS && urlIsHTTP;

        // Se não precisa de proxy, tenta direto
        if (!needsProxy) {
            try {
                const response = await fetch(fullUrl, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: AbortSignal.timeout(15000)
                });
                if (response.ok) return await response.json();
            } catch (e) {
                console.warn('⚠️ Requisição direta falhou:', e.message);
            }
        }

        // Se já sabemos qual proxy funciona, tenta ele primeiro
        if (this._workingProxyIndex >= 0) {
            try {
                const proxy = this.PROXIES[this._workingProxyIndex];
                const target = proxy + encodeURIComponent(fullUrl);
                const response = await fetch(target, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: AbortSignal.timeout(15000)
                });
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            } catch (e) {
                console.warn(`⚠️ Proxy cached (${this._workingProxyIndex}) falhou, tentando outros...`);
                this._workingProxyIndex = -1;
            }
        }

        // Tenta todos os proxies em sequência
        const startIndex = needsProxy ? 1 : 0;  // Pula direto se precisa proxy
        for (let i = startIndex; i < this.PROXIES.length; i++) {
            try {
                const proxy = this.PROXIES[i];
                const target = proxy ? proxy + encodeURIComponent(fullUrl) : fullUrl;

                console.log(`🔄 Proxy ${i}/${this.PROXIES.length - 1}...`);

                const response = await fetch(target, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: AbortSignal.timeout(20000)
                });

                if (response.ok) {
                    const text = await response.text();

                    // Verifica se é JSON válido
                    try {
                        const data = JSON.parse(text);
                        console.log(`✅ Sucesso com proxy ${i}`);
                        this._workingProxyIndex = i;  // Cacheia proxy funcional
                        return data;
                    } catch (parseErr) {
                        console.warn(`⚠️ Proxy ${i} retornou não-JSON:`, text.substring(0, 100));
                        continue;
                    }
                }
            } catch (e) {
                console.warn(`⚠️ Proxy ${i} falhou:`, e.message);
                continue;
            }
        }

        throw new Error(`Falha ao conectar: ${fullUrl} (todos os proxies falharam)`);
    },

    // ═══════════════════════════════════════════════════════════
    // AUTENTICAÇÃO
    // ═══════════════════════════════════════════════════════════

    async authenticate() {
        try {
            const data = await this.request(
                `/player_api.php?username=${this.username}&password=${this.password}`
            );

            if (data.user_info) {
                this.userInfo = data.user_info;
                this.serverInfo = data.server_info;
                console.log('✅ Autenticado:', this.userInfo.username);
                return { success: true, userInfo: this.userInfo };
            }

            return { success: false, error: 'Credenciais inválidas' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // CATEGORIAS
    // ═══════════════════════════════════════════════════════════

    async getLiveCategories() {
        return await this.request(
            `/player_api.php?username=${this.username}&password=${this.password}&action=get_live_categories`
        );
    },

    async getVodCategories() {
        return await this.request(
            `/player_api.php?username=${this.username}&password=${this.password}&action=get_vod_categories`
        );
    },

    async getSeriesCategories() {
        return await this.request(
            `/player_api.php?username=${this.username}&password=${this.password}&action=get_series_categories`
        );
    },

    // ═══════════════════════════════════════════════════════════
    // STREAMS
    // ═══════════════════════════════════════════════════════════

    async getLiveStreams(categoryId) {
        let endpoint = `/player_api.php?username=${this.username}&password=${this.password}&action=get_live_streams`;
        if (categoryId) endpoint += `&category_id=${categoryId}`;
        return await this.request(endpoint);
    },

    async getVodStreams(categoryId) {
        let endpoint = `/player_api.php?username=${this.username}&password=${this.password}&action=get_vod_streams`;
        if (categoryId) endpoint += `&category_id=${categoryId}`;
        return await this.request(endpoint);
    },

    async getSeriesForCategory(categoryId) {
        let endpoint = `/player_api.php?username=${this.username}&password=${this.password}&action=get_series`;
        if (categoryId) endpoint += `&category_id=${categoryId}`;
        return await this.request(endpoint);
    },

    async getSeriesInfo(seriesId) {
        return await this.request(
            `/player_api.php?username=${this.username}&password=${this.password}&action=get_series_info&series_id=${seriesId}`
        );
    },

    // ═══════════════════════════════════════════════════════════
    // CONVERSORES — Streams API → formato M3U interno
    // ═══════════════════════════════════════════════════════════

    /**
     * Gera URL base do stream baseado no host configurado
     * IMPORTANTE: mantém o protocolo original do host
     */
    getStreamBaseUrl() {
        return this.host;
    },

    convertLiveToM3UFormat(streams, categories) {
        if (!streams || !Array.isArray(streams)) return [];

        const catMap = {};
        if (categories) {
            categories.forEach(c => { catMap[c.category_id] = c.category_name; });
        }

        return streams.map(stream => ({
            name: stream.name || 'Sem nome',
            logo: stream.stream_icon || '',
            group: catMap[stream.category_id] || 'Sem categoria',
            url: `${this.getStreamBaseUrl()}/live/${this.username}/${this.password}/${stream.stream_id}.m3u8`,
            streamId: stream.stream_id,
            type: 'live'
        }));
    },

    convertVodToM3UFormat(streams, categories) {
        if (!streams || !Array.isArray(streams)) return [];

        const catMap = {};
        if (categories) {
            categories.forEach(c => { catMap[c.category_id] = c.category_name; });
        }

        return streams.map(stream => {
            const ext = stream.container_extension || 'mp4';
            return {
                name: stream.name || 'Sem nome',
                logo: stream.stream_icon || stream.cover || '',
                group: catMap[stream.category_id] || 'Sem categoria',
                url: `${this.getStreamBaseUrl()}/movie/${this.username}/${this.password}/${stream.stream_id}.${ext}`,
                streamId: stream.stream_id,
                type: 'vod'
            };
        });
    },

    convertSeriesToM3UFormat(seriesInfo) {
        if (!seriesInfo || !seriesInfo.episodes) return [];

        const episodes = [];
        const seasons = seriesInfo.episodes;

        Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b)).forEach(seasonNum => {
            const seasonEps = seasons[seasonNum];
            if (!Array.isArray(seasonEps)) return;

            seasonEps.forEach(ep => {
                const ext = ep.container_extension || 'mp4';
                episodes.push({
                    name: `S${seasonNum.padStart(2, '0')}E${String(ep.episode_num).padStart(2, '0')} - ${ep.title || 'Sem título'}`,
                    logo: ep.info?.movie_image || seriesInfo.info?.cover || '',
                    group: `Temporada ${seasonNum}`,
                    url: `${this.getStreamBaseUrl()}/series/${this.username}/${this.password}/${ep.id}.${ext}`,
                    streamId: ep.id,
                    type: 'series'
                });
            });
        });

        return episodes;
    }
};

window.XtreamClient = XtreamClient;
console.log('✅ XtreamClient v1.1 carregado');
