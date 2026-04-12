import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AxiosError } from "axios";

import { api } from "../../services/api";

type AuthRole = "admin";

type AuthSession = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: AuthRole;
  created_at?: string | null;
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthApiUser = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at?: string | null;
};

function normalizeAuthUser(user: AuthApiUser | null | undefined): AuthSession | null {
  if (!user || !user.is_admin) {
    return null;
  }

  return {
    id: user.id,
    name: user.username,
    username: user.username,
    email: user.email,
    role: "admin",
    created_at: user.created_at ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const response = await api.get<{
          authenticated: boolean;
          user: AuthApiUser | null;
        }>("/auth/me");

        if (!cancelled) {
          setUser(normalizeAuthUser(response.data.user));
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      login: async ({ email, password }) => {
        try {
          const response = await api.post<{
            message: string;
            user: AuthApiUser;
          }>("/auth/login", {
            identifier: email,
            password,
          });

          const nextUser = normalizeAuthUser(response.data.user);
          if (!nextUser) {
            setUser(null);
            return {
              ok: false,
              message: "A conta autenticada nao possui permissao administrativa.",
            };
          }

          setUser(nextUser);
          return { ok: true };
        } catch (error) {
          const axiosError = error as AxiosError<{ error?: string; message?: string }>;
          const message =
            axiosError.response?.data?.error ??
            axiosError.response?.data?.message ??
            "Nao foi possivel autenticar no backend.";
          return {
            ok: false,
            message,
          };
        }
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          setUser(null);
        }
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
