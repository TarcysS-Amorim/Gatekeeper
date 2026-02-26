import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) toast.error("Credenciais inválidas. Verifique email e senha.");
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center header-gradient p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card rounded-xl shadow-card p-8 border border-border">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary rounded-full p-3 mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Gatekeeper</h1>
            <p className="text-muted-foreground text-sm mt-1">Sistema de Controle de Portaria</p>
          </div>

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
        </div>
        <p className="text-center text-xs text-primary-foreground/60 mt-4">
          © {new Date().getFullYear()} Gatekeeper — Portaria Inteligente
        </p>
      </div>
    </div>
  );
}
