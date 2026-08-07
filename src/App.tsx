import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Check, CircleHelp, Clapperboard, Globe2, Heart,
  LoaderCircle, Menu, MonitorPlay, Play, Plus, Radio, Search,
  Settings, Star, Tv, UserRound, X, Zap,
} from "lucide-react";

type Channel = { id: string; name: string; group: string; logo?: string; url: string };
type Connection = { dns: string; username: string; password: string; label?: string };

const DEFAULT_CONNECTION: Connection = {
  dns: "http://sp.kiwi:80", username: "jJNtWr", password: "vbhnqH", label: "Lista principal",
};

const PUBLIC_FALLBACK: Channel[] = [
  { id: "news24", name: "News 24", group: "Notícias", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/News_24_%28Albania%29.svg/320px-News_24_%28Albania%29.svg.png", url: "https://tv.balkanweb.com/news24/livestream/playlist.m3u8" },
  { id: "tropoja", name: "Tropoja TV", group: "Internacional", logo: "https://i.imgur.com/D3hNOVS.png", url: "https://live.prostream.al/al/smil:tropojatv.smil/playlist.m3u8" },
  { id: "canale", name: "Canal E", group: "Entretenimento", logo: "https://i.ibb.co/y4pkxH3/Qtc8-M2-PG-400x400.jpg", url: "https://unlimited1-us.dps.live/perfiltv/perfiltv.smil/perfiltv/livestream2/chunks.m3u8" },
  { id: "nettv", name: "Net TV", group: "Entretenimento", logo: "https://i.imgur.com/EWmshtx.png", url: "https://unlimited1-us.dps.live/nettv/nettv.smil/playlist.m3u8" },
  { id: "w24", name: "W24", group: "Notícias", logo: "https://i.imgur.com/PGb4wYw.png", url: "https://ms01.w24.at/W24/smil:liveevent.smil/playlist.m3u8" },
  { id: "r9", name: "R9", group: "Internacional", logo: "https://i.imgur.com/2fxVYsL.jpg", url: "https://ms01.w24.at/R9/smil:liveeventR9.smil/playlist.m3u8" },
];

const navItems = [
  { label: "Início", icon: Tv }, { label: "Ao vivo", icon: Radio },
  { label: "Filmes", icon: Clapperboard }, { label: "Favoritos", icon: Heart },
];

function buildM3uUrl(connection: Connection) {
  const dns = normalizeDns(connection.dns);
  return `${dns}/get.php?username=${encodeURIComponent(connection.username.trim())}&password=${encodeURIComponent(connection.password)}&type=m3u_plus&output=m3u8`;
}

function normalizeDns(dns: string) {
  const withProtocol = /^https?:\/\//i.test(dns.trim()) ? dns.trim() : `https://${dns.trim()}`;
  return withProtocol.replace(/\/$/, "");
}

function forceHttps(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") return url;
    parsed.protocol = "https:";
    if (parsed.port === "80") parsed.port = "";
    return parsed.toString();
  } catch {
    return url.replace(/^http:\/\//i, "https://");
  }
}

function buildFetchCandidates(connection: Connection) {
  const original = buildM3uUrl(connection);
  const isSecurePage = typeof window !== "undefined" && window.location.protocol === "https:";
  const upgraded = forceHttps(original);
  const candidates = isSecurePage && original.startsWith("http://") ? [upgraded] : [original];

  if (!candidates.includes(original) && !isSecurePage) candidates.push(original);
  if (upgraded !== original && !candidates.includes(upgraded)) candidates.push(upgraded);

  // On static HTTPS hosts, this public proxy can read an HTTP playlist without triggering mixed content.
  if (original.startsWith("http://")) {
    candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(original)}`);
  }

  return candidates;
}

function getPlayableUrl(url: string) {
  const isSecurePage = typeof window !== "undefined" && window.location.protocol === "https:";
  return isSecurePage && url.startsWith("http://") ? forceHttps(url) : url;
}

function parseM3u(content: string): Channel[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const parsed: Channel[] = [];
  let metadata: { name: string; group: string; logo?: string } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF")) {
      metadata = {
        name: line.split(",").slice(1).join(",").trim() || "Canal sem nome",
        logo: line.match(/tvg-logo=["']([^"']*)["']/i)?.[1],
        group: line.match(/group-title=["']([^"']*)["']/i)?.[1] || "Outros",
      };
    } else if (metadata && line && !line.startsWith("#")) {
      parsed.push({ id: `${parsed.length}-${metadata.name}`, ...metadata, url: line });
      metadata = null;
    }
  }
  return parsed;
}

function Logo({ channel, large = false }: { channel: Channel; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${large ? "h-16 w-16" : "h-12 w-12"} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5`}>
      {channel.logo && !failed ? <img src={channel.logo} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain p-1.5" /> : <Tv className="h-1/2 w-1/2 text-slate-500" />}
    </div>
  );
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialLoad = useRef(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("iptv-favorites") || "[]"); } catch { return []; }
  });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectionName, setConnectionName] = useState("Lista principal");
  const [form, setForm] = useState<Connection>({ dns: "", username: "", password: "", label: "" });

  const loadConnection = async (connection: Connection) => {
    setLoading(true); setNotice(""); setSelected(null);
    try {
      let response: Response | null = null;
      let lastError = "falha desconhecida";
      for (const url of buildFetchCandidates(connection)) {
        try {
          response = await fetch(url);
          if (response.ok) break;
          lastError = `servidor respondeu ${response.status}`;
          response = null;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "falha de rede";
        }
      }
      if (!response) throw new Error(lastError);
      if (!response.ok) throw new Error(`servidor respondeu ${response.status}`);
      const list = parseM3u(await response.text());
      if (!list.length) throw new Error("nenhum canal foi encontrado");
      setChannels(list);
      setConnectionName(connection.label?.trim() || connection.username);
      setModalOpen(false);
    } catch (error) {
      setChannels(PUBLIC_FALLBACK);
      setConnectionName(connection.label?.trim() || "Lista principal");
      const detail = error instanceof Error ? error.message : "falha desconhecida";
      setNotice(`A lista Xtream não pôde ser lida (${detail}). Tente um DNS com HTTPS. Se o servidor aceitar apenas HTTP, o GitHub Pages e outros hosts HTTPS precisam de um proxy próprio para evitar bloqueio de mixed content e CORS.`);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    loadConnection(DEFAULT_CONNECTION);
  }, []);

  useEffect(() => { localStorage.setItem("iptv-favorites", JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selected) return;
    let hls: Hls | null = null;
    video.pause();
    const playbackUrl = getPlayableUrl(selected.url);
    if (playbackUrl !== selected.url) {
      setNotice("Este canal veio como HTTP. O player tentou abrir a versão HTTPS para evitar bloqueio de mixed content.");
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl; video.play().catch(() => undefined);
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(playbackUrl); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => undefined));
    } else { video.src = playbackUrl; }
    return () => hls?.destroy();
  }, [selected]);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(channels.map((channel) => channel.group))).sort((a, b) => a.localeCompare(b, "pt-BR"))], [channels]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return channels.filter((channel) => (!term || `${channel.name} ${channel.group}`.toLocaleLowerCase("pt-BR").includes(term)) && (category === "Todos" || channel.group === category) && (!favoritesOnly || favorites.includes(channel.url)));
  }, [channels, category, favorites, favoritesOnly, query]);
  const toggleFavorite = (url: string) => setFavorites((current) => current.includes(url) ? current.filter((item) => item !== url) : [...current, url]);
  const submitConnection = (event: FormEvent) => { event.preventDefault(); loadConnection(form); };
  const selectChannel = (channel: Channel) => { setSelected(channel); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080b12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center gap-4 px-4 lg:px-8">
          <button className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button>
          <a href="#" className="flex items-center gap-2.5 text-xl font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-950"><Play className="h-4 w-4 fill-white" /></span><span>M3U8<span className="font-normal text-violet-400"> Player</span></span></a>
          <nav className="ml-10 hidden items-center gap-7 lg:flex">{navItems.slice(0, 3).map((item, index) => <button key={item.label} className={`text-sm font-medium transition ${index === 0 ? "text-white" : "text-slate-500 hover:text-white"}`}>{item.label}</button>)}</nav>
          <div className="ml-auto hidden max-w-sm flex-1 items-center md:flex"><Search className="pointer-events-none ml-3.5 h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar canais..." className="-ml-8 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500/60" /></div>
          <button onClick={() => setModalOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-3.5 text-sm font-semibold shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar lista</span></button>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400" aria-label="Perfil"><UserRound className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1480px]">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-60 shrink-0 border-r border-white/[0.07] px-4 py-7 lg:block">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Navegação</p>
          <div className="space-y-1">{navItems.map((item, index) => { const Icon = item.icon; const active = index === 0 && !favoritesOnly; return <button key={item.label} onClick={() => item.label === "Favoritos" && setFavoritesOnly(!favoritesOnly)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active || (item.label === "Favoritos" && favoritesOnly) ? "bg-violet-500/12 text-violet-300" : "text-slate-500 hover:bg-white/5 hover:text-white"}`}><Icon className="h-[18px] w-[18px]" />{item.label}</button>; })}</div>
          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Minha lista</p>
          <button onClick={() => setCategory("Todos")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-white/5"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /><span className="min-w-0 flex-1 truncate">{connectionName}</span></button>
          <div className="absolute bottom-6 left-4 right-4 space-y-1 border-t border-white/[0.07] pt-5"><button className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-white"><CircleHelp className="h-[18px] w-[18px]" />Ajuda</button><button className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-white"><Settings className="h-[18px] w-[18px]" />Configurações</button></div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-7 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.section key="player" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-10">
                <div className="relative aspect-video max-h-[68vh] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40"><video ref={videoRef} controls playsInline className="h-full w-full" /><button onClick={() => setSelected(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur" aria-label="Fechar player"><X className="h-4 w-4" /></button></div>
                <div className="mt-5 flex items-center gap-4"><Logo channel={selected} large /><div className="min-w-0"><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Ao vivo</p><h1 className="truncate text-xl font-bold sm:text-2xl">{selected.name}</h1><p className="text-sm text-slate-500">{selected.group}</p></div><button onClick={() => toggleFavorite(selected.url)} className="ml-auto grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5"><Heart className={`h-5 w-5 ${favorites.includes(selected.url) ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} /></button></div>
              </motion.section>
            ) : (
              <motion.section key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mb-10 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101522] px-6 py-8 sm:px-10 sm:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,.22),transparent_36%),radial-gradient(circle_at_60%_120%,rgba(236,72,153,.12),transparent_40%)]" /><div className="relative max-w-2xl"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-400"><Zap className="h-4 w-4 fill-violet-400" />Sua TV em qualquer lugar</p><h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Todos os seus canais.<br /><span className="text-slate-500">Uma experiência simples.</span></h1><p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">Escolha um canal abaixo para começar. Sua lista principal é carregada automaticamente ao abrir.</p><button onClick={() => document.getElementById("channels")?.scrollIntoView({ behavior: "smooth" })} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-violet-100"><Play className="h-4 w-4 fill-current" />Explorar canais</button></div>
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-8 right-8 hidden h-44 w-44 place-items-center rounded-full border border-violet-400/20 bg-violet-500/10 lg:grid"><MonitorPlay className="h-20 w-20 text-violet-400/70" /></motion.div>
              </motion.section>
            )}
          </AnimatePresence>

          {notice && <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3 text-sm leading-5 text-amber-200/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><span>{notice}</span><button onClick={() => setNotice("")} className="ml-auto"><X className="h-4 w-4" /></button></div>}
          <section id="channels">
            <div className="mb-5 flex flex-wrap items-end gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-violet-400">{connectionName}</p><h2 className="text-2xl font-bold tracking-tight">Canais ao vivo</h2></div><p className="text-sm text-slate-600">{filtered.length} de {channels.length} canais</p><div className="ml-auto flex w-full items-center md:hidden"><Search className="pointer-events-none ml-3 h-4 w-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar canais..." className="-ml-7 h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 text-sm outline-none" /></div></div>
            <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${category === item ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-white"}`}>{item}</button>)}</div>
            {loading ? <div className="grid min-h-64 place-items-center text-center"><div><LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin text-violet-500" /><p className="text-sm text-slate-500">Conectando à lista principal...</p></div></div> : filtered.length ? (
              <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.slice(0, 120).map((channel, index) => <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.35) }} key={channel.id + channel.url} className="group relative flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-violet-500/[0.06]"><button onClick={() => selectChannel(channel)} className="absolute inset-0 rounded-xl" aria-label={`Assistir ${channel.name}`} /><Logo channel={channel} /><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-slate-200">{channel.name}</h3><p className="mt-1 truncate text-xs text-slate-600">{channel.group}</p></div><button onClick={(event) => { event.stopPropagation(); toggleFavorite(channel.url); }} className="relative z-10 grid h-8 w-8 place-items-center rounded-lg opacity-60 transition hover:bg-white/10 group-hover:opacity-100" aria-label="Favoritar"><Star className={`h-4 w-4 ${favorites.includes(channel.url) ? "fill-amber-400 text-amber-400" : "text-slate-500"}`} /></button><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-950 transition group-hover:scale-105"><Play className="h-3.5 w-3.5 fill-current" /></span></motion.article>)}</motion.div>
            ) : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-center"><div><Search className="mx-auto mb-3 h-7 w-7 text-slate-700" /><h3 className="font-semibold">Nenhum canal encontrado</h3><p className="mt-1 text-sm text-slate-600">Tente outra busca ou categoria.</p></div></div>}
          </section>
        </main>
      </div>

      <AnimatePresence>
        {(modalOpen || sidebarOpen) && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setModalOpen(false); setSidebarOpen(false); }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" aria-label="Fechar" />}
        {sidebarOpen && <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed inset-y-0 left-0 z-[60] w-72 bg-[#0d111b] p-6 shadow-2xl lg:hidden"><div className="mb-8 flex items-center justify-between"><span className="text-lg font-bold">M3U8 Player</span><button onClick={() => setSidebarOpen(false)}><X /></button></div>{navItems.map((item) => { const Icon = item.icon; return <button key={item.label} onClick={() => { if (item.label === "Favoritos") setFavoritesOnly(!favoritesOnly); setSidebarOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/5"><Icon className="h-5 w-5" />{item.label}</button>; })}</motion.aside>}
        {modalOpen && <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#111621] shadow-2xl shadow-black/60">
          <div className="flex items-start justify-between border-b border-white/[0.07] p-6"><div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">Nova conexão</p><h2 className="text-xl font-bold">Adicionar lista Xtream</h2><p className="mt-1 text-sm text-slate-500">Informe os dados fornecidos pelo seu serviço.</p></div><button onClick={() => setModalOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button></div>
          <form onSubmit={submitConnection} className="space-y-4 p-6"><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Nome da lista</span><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: TV da sala" className="field" /></label><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">DNS / servidor</span><div className="relative"><Globe2 className="field-icon" /><input required value={form.dns} onChange={(e) => setForm({ ...form, dns: e.target.value })} placeholder="http://servidor.com:porta" className="field pl-10" /></div></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Usuário</span><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" placeholder="Seu usuário" className="field" /></label><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Senha</span><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" placeholder="Sua senha" className="field" /></label></div><div className="flex gap-3 rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-slate-500"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Os dados são usados diretamente no seu navegador e não são enviados para este site.</div><button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold transition hover:bg-violet-500 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />Conectar lista</>}</button></form>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}