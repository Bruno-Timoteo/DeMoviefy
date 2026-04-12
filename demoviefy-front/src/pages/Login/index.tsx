import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/AuthContext";

type RouterState = {
  from?: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Use as credenciais administrativas configuradas no backend.");

  if (loading) {
    return null;
  }

  if (isAdmin) {
    return <Navigate to="/admin/lab" replace />;
  }

  const state = location.state as RouterState | null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await login({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setMessage(result.message ?? "Nao foi possivel entrar.");
      return;
    }
    navigate(state?.from ?? "/admin/lab", { replace: true });
  };

  return (
    <div className="app-startup-shell">
      <section className="surface mx-auto grid w-full max-w-[480px] gap-6 rounded-[32px] px-7 py-8">
        <div>
          <span className="eyebrow">Login Admin</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Acesso ao laboratorio de testes
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Este e o inicio do sistema de login. Por enquanto, a autenticacao esta no front para destravar a
            navegacao protegida e a experiencia administrativa.
          </p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="field-block">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>

          <label className="field-block">
            <span>Senha</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar como admin"}
          </button>
        </form>

        <p className="rounded-[20px] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--text)]">{message}</p>

        <Link to="/" className="text-sm font-medium text-[var(--brand-strong)] no-underline">
          Voltar para a home
        </Link>
      </section>
    </div>
  );
}
