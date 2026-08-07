import { useState } from "react";
import { authenticate, DEFAULT_CREDS, parseM3uUrl, type XtreamCreds } from "../lib/xtream";

type Mode = "xtream" | "m3u";

export default function Login({
  onSuccess,
}: {
  onSuccess: (c: XtreamCreds) => void;
}) {
  const [mode, setMode] = useState<Mode>("xtream");
  const [host, setHost] = useState(DEFAULT_CREDS.host);
  const [username, setUsername] = useState(DEFAULT_CREDS.username);
  const [password, setPassword] = useState(DEFAULT_CREDS.password);
  const [m3u, setM3u] = useState(
    `http://${DEFAULT_CREDS.host}/get.php?username=${DEFAULT_CREDS.username}&password=${DEFAULT_CREDS.password}&type=m3u_plus`
  );
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tryLogin(creds: XtreamCreds) {
    setLoading(true);
    setError(null);
    try {
      await authenticate(creds);
      onSuccess({ ...creds, host: creds.host.replace(/^https?:\/\//, "") });
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Erro desconhecido") +
          "\nDica: em GitHub Pages usamos proxy CORS. Se a lista estiver offline, tente novamente."
      );
    } finally {
      setLoading(false);
    }
    void remember; // credentials always saved by parent
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "xtream") {
      if (!host || !username || !password) {
        setError("Preencha DNS, usuário e senha.");
        return;
      }
      tryLogin({ host, username, password });
    } else {
      const parsed = parseM3uUrl(m3u);
      if (!parsed) {
        setError("URL M3U inválida. Use o formato .../get.php?username=...&password=...");
        return;
      }
      tryLogin(parsed);
    }
  }

  function loadDefault() {
    setHost(DEFAULT_CREDS.host);
    setUsername(DEFAULT_CREDS.username);
    setPassword(DEFAULT_CREDS.password);
    setMode("xtream");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-[#e50914]/40 blur-[120px]" />
        <div className="absolute -right-40 bottom-10 h-[500px] w-[500px] rounded-full bg-indigo-600/40 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-3xl font-black tracking-tighter">
            <span className="text-[#e50914]">WEB</span>
            <span className="text-white">PLAYER</span>
          </p>
          <p className="mt-2 text-sm text-white/50">Entre com sua conta Xtream ou URL M3U</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-2xl">
          {/* tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-black/40 p-1">
            <button
              onClick={() => setMode("xtream")}
              className={`rounded-md py-2 text-sm font-semibold transition ${
                mode === "xtream" ? "bg-[#e50914] text-white shadow" : "text-white/60 hover:text-white"
              }`}
            >
              Xtream Codes
            </button>
            <button
              onClick={() => setMode("m3u")}
              className={`rounded-md py-2 text-sm font-semibold transition ${
                mode === "m3u" ? "bg-[#e50914] text-white shadow" : "text-white/60 hover:text-white"
              }`}
            >
              URL M3U
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "xtream" ? (
              <>
                <Field label="DNS / Servidor" hint="Ex: seuservidor.com:8080">
                  <input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="hsnower.shop:8080"
                    className="input"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Usuário">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                    autoComplete="username"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Senha">
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <Field label="URL da lista M3U" hint="Cole o link get.php?username=...&password=...&type=m3u_plus">
                <textarea
                  value={m3u}
                  onChange={(e) => setM3u(e.target.value)}
                  rows={4}
                  className="input font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </Field>
            )}

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[#e50914]"
              />
              Lembrar de mim neste dispositivo
            </label>

            {error && (
              <div className="whitespace-pre-line rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#e50914] py-2.5 font-semibold text-white transition hover:bg-[#f6121d] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Conectando...
                </>
              ) : (
                "Entrar"
              )}
            </button>

            <button
              type="button"
              onClick={loadDefault}
              className="w-full rounded-md border border-white/15 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Usar lista de demonstração
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Suas credenciais são armazenadas apenas no seu navegador (localStorage).
        </p>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          color: white;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .input:focus { border-color: #e50914; background: rgba(0,0,0,0.7); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}
