// Xtream Codes API wrapper
// Docs (reverse engineered): https://xtream-ui.org/api-xtreamui-xtreamcode/

export interface XtreamCreds {
  host: string; // ex: hsnower.shop:8080 or full url
  username: string;
  password: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface LiveStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id?: string;
  tv_archive?: number;
  direct_source?: string;
}

export interface VodStream {
  num?: number;
  name: string;
  stream_id: number;
  stream_icon?: string;
  rating?: string | number;
  rating_5based?: number;
  added?: string;
  category_id?: string;
  container_extension?: string;
  plot?: string;
  cast?: string;
  director?: string;
  releasedate?: string;
  release_date?: string;
  year?: string;
  duration?: string;
}

export interface SeriesItem {
  num?: number;
  name: string;
  series_id: number;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  release_date?: string;
  last_modified?: string;
  rating?: string | number;
  rating_5based?: number;
  category_id?: string;
}

export interface UserInfo {
  username: string;
  password: string;
  status: string;
  exp_date?: string;
  is_trial?: string;
  active_cons?: string;
  max_connections?: string;
  allowed_output_formats?: string[];
}

export interface ServerInfo {
  url: string;
  port: string;
  https_port?: string;
  server_protocol?: string;
  timezone?: string;
  time_now?: string;
}

// CORS proxy — GitHub Pages serves via HTTPS, target servers are HTTP,
// so all requests need to route through an HTTPS CORS proxy.
export const CORS_PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url=",
  "https://api.codetabs.com/v1/proxy/?quest=",
];

export const DEFAULT_CREDS: XtreamCreds = {
  host: "hsnower.shop:8080",
  username: "245117Mrt",
  password: "wecxQ4U9Xe",
};

export function normalizeHost(input: string): string {
  let h = input.trim();
  if (!h) return "";
  // remove trailing slash
  h = h.replace(/\/+$/, "");
  // strip scheme temporarily
  const noScheme = h.replace(/^https?:\/\//i, "");
  const hasScheme = /^https?:\/\//i.test(h);
  return (hasScheme ? h.slice(0, h.length - noScheme.length) + noScheme : "http://" + noScheme);
}

export function apiBase(creds: XtreamCreds): string {
  return `${normalizeHost(creds.host)}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}`;
}

async function fetchViaProxy(url: string): Promise<Response> {
  let lastErr: unknown = null;
  for (const p of CORS_PROXIES) {
    try {
      const proxied = p + encodeURIComponent(url);
      const res = await fetch(proxied, { headers: { Accept: "application/json" } });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} via ${p}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Todos os proxies CORS falharam");
}

export async function apiCall<T = unknown>(creds: XtreamCreds, action?: string, extra: Record<string, string | number> = {}): Promise<T> {
  const params = new URLSearchParams();
  if (action) params.set("action", action);
  for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  const url = apiBase(creds) + (params.toString() ? "&" + params.toString() : "");
  const res = await fetchViaProxy(url);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida do servidor. Verifique DNS/usuário/senha.");
  }
}

export async function authenticate(creds: XtreamCreds): Promise<{ user_info: UserInfo; server_info: ServerInfo }> {
  const data = await apiCall<{ user_info?: UserInfo; server_info?: ServerInfo }>(creds);
  if (!data?.user_info || data.user_info.status !== "Active") {
    throw new Error(
      data?.user_info
        ? `Conta ${data.user_info.status || "inválida"}. Verifique suas credenciais.`
        : "Login falhou. Verifique DNS, usuário e senha."
    );
  }
  return { user_info: data.user_info, server_info: data.server_info! };
}

export const getLiveCategories = (c: XtreamCreds) => apiCall<XtreamCategory[]>(c, "get_live_categories");
export const getVodCategories = (c: XtreamCreds) => apiCall<XtreamCategory[]>(c, "get_vod_categories");
export const getSeriesCategories = (c: XtreamCreds) => apiCall<XtreamCategory[]>(c, "get_series_categories");

export const getLiveStreams = (c: XtreamCreds, category_id?: string) =>
  apiCall<LiveStream[]>(c, "get_live_streams", category_id ? { category_id } : {});
export const getVodStreams = (c: XtreamCreds, category_id?: string) =>
  apiCall<VodStream[]>(c, "get_vod_streams", category_id ? { category_id } : {});
export const getSeries = (c: XtreamCreds, category_id?: string) =>
  apiCall<SeriesItem[]>(c, "get_series", category_id ? { category_id } : {});

export const getVodInfo = (c: XtreamCreds, vod_id: number) =>
  apiCall<{ info: Record<string, unknown>; movie_data: Record<string, unknown> }>(c, "get_vod_info", { vod_id });

export interface SeriesInfo {
  seasons?: Array<{ season_number: number; name?: string; cover?: string; episode_count?: number }>;
  info: Record<string, unknown>;
  episodes: Record<string, Array<{
    id: string;
    episode_num: number;
    title: string;
    container_extension: string;
    info?: { plot?: string; duration?: string; movie_image?: string };
    added?: string;
    season?: number;
  }>>;
}
export const getSeriesInfo = (c: XtreamCreds, series_id: number) =>
  apiCall<SeriesInfo>(c, "get_series_info", { series_id });

// Stream URL builders
export function liveUrl(c: XtreamCreds, id: number, ext: "m3u8" | "ts" = "m3u8"): string {
  const base = normalizeHost(c.host);
  return `${base}/live/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password)}/${id}.${ext}`;
}
export function vodUrl(c: XtreamCreds, id: number, ext: string): string {
  const base = normalizeHost(c.host);
  return `${base}/movie/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password)}/${id}.${ext || "mp4"}`;
}
export function episodeUrl(c: XtreamCreds, id: string | number, ext: string): string {
  const base = normalizeHost(c.host);
  return `${base}/series/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password)}/${id}.${ext || "mp4"}`;
}

// Parse Xtream m3u_plus get.php URL into creds
export function parseM3uUrl(url: string): XtreamCreds | null {
  try {
    const u = new URL(url);
    const username = u.searchParams.get("username");
    const password = u.searchParams.get("password");
    if (!username || !password) return null;
    const host = `${u.hostname}${u.port ? ":" + u.port : ""}`;
    return { host, username, password };
  } catch {
    return null;
  }
}

// Storage
const KEY = "webplayer.xtream.v1";
export function saveCreds(c: XtreamCreds) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* noop */
  }
}
export function loadCreds(): XtreamCreds | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as XtreamCreds) : null;
  } catch {
    return null;
  }
}
export function clearCreds() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function isHttpsPage(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function shouldProxyUrl(url?: string | null): boolean {
  return !!url && /^http:\/\//i.test(url) && isHttpsPage();
}

// Try to reach media through an HTTPS proxy. This is mandatory on GitHub Pages
// when the IPTV provider only exposes HTTP stream URLs.
export function proxied(url: string, proxyIndex = 0): string {
  const proxy = CORS_PROXIES[proxyIndex] ?? CORS_PROXIES[0];
  return proxy + encodeURIComponent(url);
}

export function mediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return shouldProxyUrl(url) ? proxied(url) : url;
}
