import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { queryFoundation } from "../lib/query-client.ts";
import { createAuthSession, type AuthSession } from "./session.ts";
const session = createAuthSession({
  auth: queryFoundation.services.auth,
  configureSession: queryFoundation.configureSession,
});
const AuthContext = createContext<AuthSession | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const verify = () => {
      session.expireIfNeeded();
      if (document.visibilityState === "visible")
        void session.refreshIdentity();
    };
    window.addEventListener("focus", verify);
    document.addEventListener("visibilitychange", verify);
    return () => {
      window.removeEventListener("focus", verify);
      document.removeEventListener("visibilitychange", verify);
    };
  }, []);
  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}
export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) throw new Error("useAuth requires AuthProvider");
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  return {
    ...state,
    login: session.login,
    logout: session.logout,
    refreshIdentity: session.refreshIdentity,
    expireIfNeeded: session.expireIfNeeded,
  };
}
