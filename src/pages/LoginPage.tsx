import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) toast.error("Credenciais inválidas. Verifique email e senha.");
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Aguarde um administrador atribuir sua role.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center header-gradient p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card rounded-xl shadow-card p-8 border border-border">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-primary rounded-full p-3 mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Gatekeeper</h1>
            <p className="text-muted-foreground text-sm mt-1">Sistema de Controle de Portaria</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${tab === "login" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setTab("login")}
            >Entrar</button>
            <button
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${tab === "signup" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setTab("signup")}
            >Criar Conta</button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input placeholder="João Silva" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Criando..." : "Criar Conta"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Após criar a conta, aguarde um administrador atribuir sua permissão de acesso.
              </p>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-primary-foreground/60 mt-4">
          © {new Date().getFullYear()} Gatekeeper — Portaria Inteligente
        </p>
      </div>
    </div>
  );
}
