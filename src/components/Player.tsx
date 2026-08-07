import { useEffect, useRef, useState } from "react";
import Hls, { XhrLoader } from "hls.js";
import type {
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderStats,
} from "hls.js";
import { CORS_PROXIES, mediaUrl, proxied, shouldProxyUrl } from "../lib/xtream";

interface PlayerProps {
  url: string;
  title: string;
  subtitle?: string;
  poster?: string;
  isLive?: boolean;
  onClose: () => void;
}

function isAbsoluteHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isAlreadyProxied(url: string): boolean {
  return CORS_PROXIES.some((proxy) => url.startsWith(proxy));
}

function makeProxyLoader(forceProxy: boolean, proxyIndex: number) {
  return class ProxyLoader implements Loader<LoaderContext> {
    private loader: XhrLoader;
    public context: LoaderContext | null = null;
    public stats: LoaderStats;

    constructor(config: HlsConfig) {
      this.loader = new XhrLoader(config);
      this.stats = this.loader.stats;
    }

    destroy() {
      this.loader.destroy();
      this.context = null;
    }

    abort() {
      this.loader.abort();
    }

    getCacheAge() {
      return this.loader.getCacheAge?.() ?? null;
    }

    getResponseHeader(name: string) {
      return this.loader.getResponseHeader?.(name) ?? null;
    }

    load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>
    ) {
      this.context = context;

      const needsProxy =
        isAbsoluteHttp(context.url) && !isAlreadyProxied(context.url) && (forceProxy || shouldProxyUrl(context.url));
      const networkContext: LoaderContext = {
        ...context,
        url: needsProxy ? proxied(context.url, proxyIndex) : context.url,
      };

      const wrappedCallbacks: LoaderCallbacks<LoaderContext> = {
        onSuccess: (response, stats, _context, networkDetails) => {
          // Keep the original URL so hls.js resolves relative segment paths correctly.
          callbacks.onSuccess({ ...response, url: context.url }, stats, context, networkDetails);
        },
        onError: (error, _context, networkDetails, stats) => {
          callbacks.onError(error, context, networkDetails, stats);
        },
        onTimeout: (stats, _context, networkDetails) => {
          callbacks.onTimeout(stats, context, networkDetails);
        },
        onAbort: callbacks.onAbort
          ? (stats, _context, networkDetails) => callbacks.onAbort?.(stats, context, networkDetails)
          : undefined,
        onProgress: callbacks.onProgress
          ? (stats, _context, data, networkDetails) => callbacks.onProgress?.(stats, context, data, networkDetails)
          : undefined,
      };

      this.loader.load(networkContext, config, wrappedCallbacks);
      this.stats = this.loader.stats;
    }
  };
}

export default function Player({ url, title, subtitle, poster, isLive, onClose }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(() => shouldProxyUrl(url));
  const [proxyIndex, setProxyIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    setUseProxy(shouldProxyUrl(url));
    setProxyIndex(0);
  }, [url]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    setStatus("loading");
    setError(null);
    const mustProxy = useProxy || shouldProxyUrl(url);
    const src = mustProxy ? proxied(url, proxyIndex) : url;
    const isHls = /\.m3u8(\?|$)/i.test(url) || isLive;

    // cleanup prior hls
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hlsConfig: Partial<HlsConfig> = {
        enableWorker: true,
        lowLatencyMode: !!isLive,
        maxBufferLength: isLive ? 6 : 30,
      };
      if (mustProxy) {
        hlsConfig.loader = makeProxyLoader(useProxy, proxyIndex);
      }
      const hls = new Hls({
        ...hlsConfig,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        v.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (mustProxy && proxyIndex < CORS_PROXIES.length - 1) {
            setProxyIndex((index) => index + 1);
            return;
          }
          setStatus("error");
          setError(
            `Falha ao carregar (${data.type}). O servidor bloqueou o stream ou o proxy HTTPS não conseguiu repassar o HLS.`
          );
        }
      });
    } else {
      // native (Safari, MP4, etc.)
      v.src = src;
      v.load();
      v.play().catch(() => {});
    }

    const onPlay = () => setStatus("playing");
    const onError = () => {
      if ((useProxy || shouldProxyUrl(url)) && proxyIndex < CORS_PROXIES.length - 1) {
        setProxyIndex((index) => index + 1);
        return;
      }
      setStatus("error");
      setError("Não foi possível reproduzir. Tente o proxy CORS ou verifique o link.");
    };
    v.addEventListener("playing", onPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("playing", onPlay);
      v.removeEventListener("error", onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [url, useProxy, isLive, proxyIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        v.paused ? v.play() : v.pause();
      }
      if (e.key === "m") setMuted((m) => !m);
      if (e.key === "f") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  function toggleFs() {
    const v = videoRef.current?.parentElement;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen?.().catch(() => {});
  }

  function bumpControls() {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2600);
  }

  const proxyRequired = shouldProxyUrl(url);
  const proxyActive = useProxy || proxyRequired;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
    >
      <div className="relative flex-1">
        <video
          ref={videoRef}
          poster={mediaUrl(poster)}
          controls
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full bg-black"
        />

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#e50914]" />
            <p className="mt-4 text-sm text-white/70">Carregando stream...</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center text-white">
            <div className="text-4xl">⚠️</div>
            <p className="max-w-md text-white/80">{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  if (proxyRequired) return;
                  setProxyIndex(0);
                  setUseProxy((u) => !u);
                }}
                disabled={proxyRequired}
                className="rounded-md bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {proxyRequired
                  ? "Proxy HTTPS obrigatório"
                  : proxyActive
                    ? "Desativar proxy"
                    : "Tentar via proxy CORS"}
              </button>
              {proxyActive && (
                <button
                  onClick={() => {
                    setStatus("loading");
                    setError(null);
                    setProxyIndex((index) => (index + 1) % CORS_PROXIES.length);
                  }}
                  className="rounded-md bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
                >
                  Trocar proxy {proxyIndex + 1}/{CORS_PROXIES.length}
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-md bg-[#e50914] px-4 py-2 text-sm font-semibold hover:bg-[#f6121d]"
              >
                Voltar
              </button>
            </div>
            <p className="max-w-md text-xs text-white/40">
              Streams HTTP podem ser bloqueados quando a página é servida via HTTPS
              (mixed content). O proxy converte para HTTPS, mas fica mais lento.
            </p>
          </div>
        )}

        {/* top overlay */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="pointer-events-auto flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white hover:bg-black/80"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
            <div className="min-w-0 text-right">
              <p className="truncate text-lg font-bold text-white">{title}</p>
              {subtitle && <p className="truncate text-xs text-white/60">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
