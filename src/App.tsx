import { useEffect, useState } from "react";
import Login from "./components/Login";
import Browse from "./components/Browse";
import {
  authenticate,
  loadCreds,
  saveCreds,
  type UserInfo,
  type XtreamCreds,
} from "./lib/xtream";

export default function App() {
  const [creds, setCreds] = useState<XtreamCreds | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Try auto-login from localStorage
  useEffect(() => {
    const saved = loadCreds();
    if (!saved) {
      setBootstrapping(false);
      return;
    }
    authenticate(saved)
      .then(({ user_info }) => {
        setCreds(saved);
        setUser(user_info);
      })
      .catch(() => {
        // silently fail — user will see login screen
      })
      .finally(() => setBootstrapping(false));
  }, []);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <p className="text-3xl font-black tracking-tighter">
            <span className="text-[#e50914]">WEB</span>PLAYER
          </p>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#e50914]" />
        </div>
      </div>
    );
  }

  if (!creds) {
    return (
      <Login
        onSuccess={(c) => {
          saveCreds(c);
          setCreds(c);
          // Fetch user info after login (best-effort)
          authenticate(c)
            .then(({ user_info }) => setUser(user_info))
            .catch(() => {});
        }}
      />
    );
  }

  return (
    <Browse
      creds={creds}
      user={user}
      onLogout={() => {
        setCreds(null);
        setUser(null);
      }}
    />
  );
}
