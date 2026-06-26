import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";

interface AuthState {
  email: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate any persisted token on first load.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!api.getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.fetchMe();
        if (active) setEmail(me.email);
      } catch {
        api.clearToken();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function signIn(emailInput: string, password: string) {
    const res = await api.login(emailInput, password);
    api.setToken(res.token);
    setEmail(res.email);
  }

  function signOut() {
    api.clearToken();
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ email, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
