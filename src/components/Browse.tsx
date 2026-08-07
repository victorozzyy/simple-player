import { useEffect, useMemo, useState } from "react";
import {
  clearCreds,
  episodeUrl,
  getLiveCategories,
  getLiveStreams,
  getSeries,
  getSeriesCategories,
  getSeriesInfo,
  getVodCategories,
  getVodStreams,
  liveUrl,
  mediaUrl,
  vodUrl,
  type LiveStream,
  type SeriesInfo,
  type SeriesItem,
  type UserInfo,
  type VodStream,
  type XtreamCategory,
  type XtreamCreds,
} from "../lib/xtream";
import Player from "./Player";

type Tab = "live" | "movies" | "series";

interface Props {
  creds: XtreamCreds;
  user: UserInfo | null;
  onLogout: () => void;
}

export default function Browse({ creds, user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("live");
  const [query, setQuery] = useState("");
  const [showAccount, setShowAccount] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <Header
        tab={tab}
        onTab={(t) => {
          setTab(t);
          setQuery("");
        }}
        query={query}
        onQuery={setQuery}
        onAccount={() => setShowAccount(true)}
      />

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 sm:px-6">
        {tab === "live" && <LiveSection creds={creds} query={query} />}
        {tab === "movies" && <MoviesSection creds={creds} query={query} />}
        {tab === "series" && <SeriesSection creds={creds} query={query} />}
      </main>

      {showAccount && (
        <AccountModal
          creds={creds}
          user={user}
          onClose={() => setShowAccount(false)}
          onLogout={() => {
            clearCreds();
            onLogout();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Header ---------------- */

function Header({
  tab,
  onTab,
  query,
  onQuery,
  onAccount,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  query: string;
  onQuery: (q: string) => void;
  onAccount: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const s = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", s);
    return () => window.removeEventListener("scroll", s);
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "live", label: "TV ao Vivo", icon: "📺" },
    { id: "movies", label: "Filmes", icon: "🎬" },
    { id: "series", label: "Séries", icon: "🎞️" },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-[#0b0b0f]/95 shadow-xl backdrop-blur" : "bg-gradient-to-b from-black/85 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <p className="shrink-0 text-2xl font-black tracking-tighter">
          <span className="text-[#e50914]">WEB</span>PLAYER
        </p>

        <nav className="ml-4 flex items-center gap-1 sm:ml-8 sm:gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
                tab === t.id ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-48 rounded-full border border-white/15 bg-black/50 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:w-64 focus:border-white/50"
            />
          </div>
          <button
            onClick={onAccount}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white hover:bg-white/20"
            title="Conta"
          >
            👤
          </button>
        </div>
      </div>

      {/* mobile search */}
      <div className="border-t border-white/5 px-4 pb-2 pt-1 sm:hidden">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded-md border border-white/15 bg-black/50 px-3 py-1.5 text-sm outline-none focus:border-white/50"
        />
      </div>
    </header>
  );
}

/* ---------------- Account Modal ---------------- */

function AccountModal({
  creds,
  user,
  onClose,
  onLogout,
}: {
  creds: XtreamCreds;
  user: UserInfo | null;
  onClose: () => void;
  onLogout: () => void;
}) {
  const exp = user?.exp_date ? new Date(Number(user.exp_date) * 1000).toLocaleString() : "—";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141419] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">Minha Conta</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <dl className="space-y-3 text-sm">
          <Row2 k="DNS" v={creds.host} />
          <Row2 k="Usuário" v={creds.username} />
          <Row2 k="Status" v={user?.status || "—"} highlight={user?.status === "Active"} />
          <Row2 k="Expira em" v={exp} />
          <Row2 k="Conexões" v={`${user?.active_cons ?? "?"} / ${user?.max_connections ?? "?"}`} />
          <Row2 k="Trial" v={user?.is_trial === "1" ? "Sim" : "Não"} />
        </dl>
        <button
          onClick={onLogout}
          className="mt-6 w-full rounded-md bg-[#e50914] py-2.5 font-semibold text-white hover:bg-[#f6121d]"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function Row2({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-white/50">{k}</dt>
      <dd className={`truncate text-right font-medium ${highlight ? "text-green-400" : "text-white"}`}>{v}</dd>
    </div>
  );
}

/* ---------------- shared loaders ---------------- */

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { data, loading, error, reload: () => setN((v) => v + 1) };
}

function LoadingBlock({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-white/60">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#e50914]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function ErrorBlock({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="max-w-md text-white/70">{msg}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/* ---------------- Sidebar categories ---------------- */

function CategorySidebar({
  categories,
  selected,
  onSelect,
  totalLabel = "Todas",
}: {
  categories: XtreamCategory[];
  selected: string | "all";
  onSelect: (id: string | "all") => void;
  totalLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside className="md:col-span-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mb-2 flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold md:hidden"
      >
        <span>Categorias</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      <div className={`space-y-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-2 md:block md:max-h-[75vh] md:overflow-y-auto ${expanded ? "block" : "hidden"}`}>
        <button
          onClick={() => onSelect("all")}
          className={`block w-full truncate rounded-md px-3 py-1.5 text-left text-sm transition ${
            selected === "all" ? "bg-[#e50914] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {totalLabel}
        </button>
        {categories.map((c) => (
          <button
            key={c.category_id}
            onClick={() => onSelect(c.category_id)}
            className={`block w-full truncate rounded-md px-3 py-1.5 text-left text-sm transition ${
              selected === c.category_id
                ? "bg-[#e50914] text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {c.category_name}
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ---------------- LIVE ---------------- */

function LiveSection({ creds, query }: { creds: XtreamCreds; query: string }) {
  const cats = useAsync(() => getLiveCategories(creds), [creds]);
  const [cat, setCat] = useState<string | "all">("all");
  const streams = useAsync(
    () => getLiveStreams(creds, cat === "all" ? undefined : cat),
    [creds, cat]
  );
  const [playing, setPlaying] = useState<LiveStream | null>(null);

  const filtered = useMemo(() => {
    const list = streams.data ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  }, [streams.data, query]);

  if (cats.loading) return <LoadingBlock label="Carregando categorias..." />;
  if (cats.error) return <ErrorBlock msg={cats.error} onRetry={cats.reload} />;

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <CategorySidebar
        categories={cats.data ?? []}
        selected={cat}
        onSelect={setCat}
        totalLabel="Todos os canais"
      />
      <div>
        {streams.loading ? (
          <LoadingBlock label="Carregando canais..." />
        ) : streams.error ? (
          <ErrorBlock msg={streams.error} onRetry={streams.reload} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-white/50">Nenhum canal encontrado.</div>
        ) : (
          <>
            <p className="mb-3 text-sm text-white/50">
              {filtered.length} canal(is)
              {query && ` para "${query}"`}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.slice(0, 300).map((s) => (
                <ChannelCard key={s.stream_id} s={s} onPlay={() => setPlaying(s)} />
              ))}
            </div>
            {filtered.length > 300 && (
              <p className="mt-4 text-center text-xs text-white/40">
                Exibindo 300 de {filtered.length}. Refine a busca para ver mais.
              </p>
            )}
          </>
        )}
      </div>

      {playing && (
        <Player
          url={liveUrl(creds, playing.stream_id, "m3u8")}
          title={playing.name}
          subtitle="AO VIVO"
          poster={playing.stream_icon}
          isLive
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}

function ChannelCard({ s, onPlay }: { s: LiveStream; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/30 hover:bg-white/[0.08]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black">
        {s.stream_icon ? (
          <img
            src={mediaUrl(s.stream_icon)}
            alt=""
            loading="lazy"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-lg">📡</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white group-hover:text-white">{s.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          AO VIVO
        </p>
      </div>
    </button>
  );
}

/* ---------------- MOVIES ---------------- */

function MoviesSection({ creds, query }: { creds: XtreamCreds; query: string }) {
  const cats = useAsync(() => getVodCategories(creds), [creds]);
  const [cat, setCat] = useState<string | "all">("all");
  const streams = useAsync(
    () => getVodStreams(creds, cat === "all" ? undefined : cat),
    [creds, cat]
  );
  const [selected, setSelected] = useState<VodStream | null>(null);
  const [playing, setPlaying] = useState<VodStream | null>(null);

  const filtered = useMemo(() => {
    const list = streams.data ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  }, [streams.data, query]);

  if (cats.loading) return <LoadingBlock label="Carregando categorias..." />;
  if (cats.error) return <ErrorBlock msg={cats.error} onRetry={cats.reload} />;

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <CategorySidebar
        categories={cats.data ?? []}
        selected={cat}
        onSelect={setCat}
        totalLabel="Todos os filmes"
      />
      <div>
        {streams.loading ? (
          <LoadingBlock label="Carregando filmes..." />
        ) : streams.error ? (
          <ErrorBlock msg={streams.error} onRetry={streams.reload} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-white/50">Nenhum filme encontrado.</div>
        ) : (
          <>
            <p className="mb-3 text-sm text-white/50">
              {filtered.length} título(s)
              {query && ` para "${query}"`}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.slice(0, 400).map((m) => (
                <PosterCard
                  key={m.stream_id}
                  name={m.name}
                  icon={m.stream_icon}
                  rating={typeof m.rating_5based === "number" ? m.rating_5based : undefined}
                  onClick={() => setSelected(m)}
                />
              ))}
            </div>
            {filtered.length > 400 && (
              <p className="mt-4 text-center text-xs text-white/40">
                Exibindo 400 de {filtered.length}. Refine a busca.
              </p>
            )}
          </>
        )}
      </div>

      {selected && !playing && (
        <MovieModal
          movie={selected}
          onClose={() => setSelected(null)}
          onPlay={() => {
            setPlaying(selected);
          }}
        />
      )}

      {playing && (
        <Player
          url={vodUrl(creds, playing.stream_id, playing.container_extension || "mp4")}
          title={playing.name}
          subtitle="Filme"
          poster={playing.stream_icon}
          onClose={() => {
            setPlaying(null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function PosterCard({
  name,
  icon,
  rating,
  onClick,
}: {
  name: string;
  icon?: string;
  rating?: number;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const safeIcon = mediaUrl(icon);
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-md bg-[#1a1a20] text-left transition hover:z-10 hover:scale-[1.05] hover:ring-2 hover:ring-white/70"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-indigo-900 to-fuchsia-900">
        {safeIcon && !failed ? (
          <img
            src={safeIcon}
            alt={name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center">
            <span className="line-clamp-4 text-sm font-bold text-white/80">{name}</span>
          </div>
        )}
        {typeof rating === "number" && rating > 0 && (
          <div className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">
            ★ {rating.toFixed(1)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-semibold text-white/90">{name}</p>
      </div>
    </button>
  );
}

function MovieModal({
  movie,
  onClose,
  onPlay,
}: {
  movie: VodStream;
  onClose: () => void;
  onPlay: () => void;
}) {
  const icon = mediaUrl(movie.stream_icon);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#141419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {icon && (
            <div className="relative h-56 w-full overflow-hidden">
              <img src={icon} alt="" className="h-full w-full object-cover blur-sm opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141419] to-transparent" />
              <img
                src={icon}
                alt=""
                className="absolute bottom-4 left-4 h-40 w-28 rounded-md object-cover shadow-xl"
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          <h2 className="text-2xl font-bold">{movie.name}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/60">
            {movie.year && <span>{movie.year}</span>}
            {movie.duration && <span>{movie.duration}</span>}
            {movie.rating && <span className="text-yellow-400">★ {movie.rating}</span>}
            {movie.container_extension && (
              <span className="rounded bg-white/10 px-1.5">{movie.container_extension.toUpperCase()}</span>
            )}
          </div>
          {movie.plot && <p className="mt-4 text-sm text-white/80">{movie.plot}</p>}
          {movie.cast && (
            <p className="mt-3 text-xs text-white/60">
              <span className="text-white/40">Elenco: </span>
              {movie.cast}
            </p>
          )}
          {movie.director && (
            <p className="mt-1 text-xs text-white/60">
              <span className="text-white/40">Direção: </span>
              {movie.director}
            </p>
          )}
          <button
            onClick={onPlay}
            className="mt-5 flex items-center gap-2 rounded-md bg-white px-6 py-2.5 font-bold text-black hover:bg-white/85"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Assistir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SERIES ---------------- */

function SeriesSection({ creds, query }: { creds: XtreamCreds; query: string }) {
  const cats = useAsync(() => getSeriesCategories(creds), [creds]);
  const [cat, setCat] = useState<string | "all">("all");
  const list = useAsync(
    () => getSeries(creds, cat === "all" ? undefined : cat),
    [creds, cat]
  );
  const [selected, setSelected] = useState<SeriesItem | null>(null);

  const filtered = useMemo(() => {
    const l = list.data ?? [];
    const q = query.trim().toLowerCase();
    return q ? l.filter((s) => s.name.toLowerCase().includes(q)) : l;
  }, [list.data, query]);

  if (cats.loading) return <LoadingBlock label="Carregando categorias..." />;
  if (cats.error) return <ErrorBlock msg={cats.error} onRetry={cats.reload} />;

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <CategorySidebar
        categories={cats.data ?? []}
        selected={cat}
        onSelect={setCat}
        totalLabel="Todas as séries"
      />
      <div>
        {list.loading ? (
          <LoadingBlock label="Carregando séries..." />
        ) : list.error ? (
          <ErrorBlock msg={list.error} onRetry={list.reload} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-white/50">Nenhuma série encontrada.</div>
        ) : (
          <>
            <p className="mb-3 text-sm text-white/50">
              {filtered.length} série(s)
              {query && ` para "${query}"`}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.slice(0, 400).map((s) => (
                <PosterCard
                  key={s.series_id}
                  name={s.name}
                  icon={s.cover}
                  rating={typeof s.rating_5based === "number" ? s.rating_5based : undefined}
                  onClick={() => setSelected(s)}
                />
              ))}
            </div>
            {filtered.length > 400 && (
              <p className="mt-4 text-center text-xs text-white/40">
                Exibindo 400 de {filtered.length}. Refine a busca.
              </p>
            )}
          </>
        )}
      </div>

      {selected && (
        <SeriesModal creds={creds} series={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function SeriesModal({
  creds,
  series,
  onClose,
}: {
  creds: XtreamCreds;
  series: SeriesItem;
  onClose: () => void;
}) {
  const info = useAsync(() => getSeriesInfo(creds, series.series_id), [creds, series.series_id]);
  const [season, setSeason] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ url: string; title: string; poster?: string } | null>(null);
  const cover = mediaUrl(series.cover);

  const seasonKeys = useMemo(() => {
    const eps = (info.data as SeriesInfo | null)?.episodes;
    if (!eps) return [];
    return Object.keys(eps).sort((a, b) => Number(a) - Number(b));
  }, [info.data]);

  useEffect(() => {
    if (!season && seasonKeys.length) setSeason(seasonKeys[0]);
  }, [seasonKeys, season]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4" onClick={onClose}>
      <div
        className="mx-auto my-6 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#141419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {cover && (
            <div className="relative h-56 w-full overflow-hidden">
              <img src={cover} alt="" className="h-full w-full object-cover blur-sm opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141419] to-transparent" />
              <img
                src={cover}
                alt=""
                className="absolute bottom-4 left-4 h-40 w-28 rounded-md object-cover shadow-xl"
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <h2 className="text-2xl font-bold">{series.name}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/60">
            {series.genre && <span>{series.genre}</span>}
            {(series.releaseDate || series.release_date) && <span>{series.releaseDate || series.release_date}</span>}
            {series.rating && <span className="text-yellow-400">★ {series.rating}</span>}
          </div>
          {series.plot && <p className="mt-4 text-sm text-white/80">{series.plot}</p>}
          {series.cast && (
            <p className="mt-3 text-xs text-white/60">
              <span className="text-white/40">Elenco: </span>
              {series.cast}
            </p>
          )}

          {info.loading && <div className="mt-6"><LoadingBlock label="Carregando episódios..." /></div>}
          {info.error && <div className="mt-6"><ErrorBlock msg={info.error} onRetry={info.reload} /></div>}

          {info.data && seasonKeys.length > 0 && (
            <>
              <div className="mt-6 flex items-center gap-2">
                <label className="text-sm text-white/60">Temporada:</label>
                <select
                  value={season ?? ""}
                  onChange={(e) => setSeason(e.target.value)}
                  className="rounded-md border border-white/15 bg-black/60 px-3 py-1.5 text-sm outline-none"
                >
                  {seasonKeys.map((k) => (
                    <option key={k} value={k}>
                      Temporada {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 space-y-2">
                {(info.data as SeriesInfo).episodes[season ?? seasonKeys[0]]?.map((ep) => {
                  const epImage = mediaUrl(ep.info?.movie_image);
                  return (
                    <button
                      key={ep.id}
                      onClick={() =>
                        setPlaying({
                          url: episodeUrl(creds, ep.id, ep.container_extension || "mp4"),
                          title: `${series.name} · T${season}E${ep.episode_num}`,
                          poster: ep.info?.movie_image || series.cover,
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/30 hover:bg-white/[0.08]"
                    >
                      <span className="w-8 shrink-0 text-center text-lg font-bold text-white/40">
                        {ep.episode_num}
                      </span>
                      {epImage ? (
                        <img
                          src={epImage}
                          alt=""
                          loading="lazy"
                          className="h-14 w-24 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-white/10 text-xl">▶</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{ep.title}</p>
                        {ep.info?.plot && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{ep.info.plot}</p>
                        )}
                      </div>
                      <span className="hidden text-xs text-white/40 sm:block">{ep.info?.duration || ""}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {playing && (
        <Player
          url={playing.url}
          title={playing.title}
          subtitle="Episódio"
          poster={playing.poster}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
