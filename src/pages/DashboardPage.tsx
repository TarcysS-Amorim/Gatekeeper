import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Car, Lock, Zap, TrendingUp, Clock } from "lucide-react";

export default function DashboardPage() {
  const { role } = useAuth();

  const { data: gateCount } = useQuery({
    queryKey: ["gate-count"],
    queryFn: async () => {
      const { count } = await supabase.from("gate_entries").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: vehicleCount } = useQuery({
    queryKey: ["vehicle-count"],
    queryFn: async () => {
      const { count } = await supabase.from("vehicles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: lockerCount } = useQuery({
    queryKey: ["locker-count"],
    queryFn: async () => {
      const { count } = await supabase.from("lockers").select("*", { count: "exact", head: true })
        .not("employee_id", "is", null);
      return count ?? 0;
    },
  });

  const { data: outageCount } = useQuery({
    queryKey: ["outage-count"],
    queryFn: async () => {
      const { count } = await supabase.from("power_outages").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: recentEntries } = useQuery({
    queryKey: ["recent-entries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gate_entries")
        .select("id, name, company, classification, entry_date, entry_time")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const stats = [
    { title: "Registros de Portaria", value: gateCount ?? 0, icon: ClipboardList, color: "text-primary" },
    { title: "Veículos Cadastrados", value: vehicleCount ?? 0, icon: Car, color: "text-status-active" },
    { title: "Armários Alocados", value: lockerCount ?? 0, icon: Lock, color: "text-accent" },
    { title: "Quedas de Energia", value: outageCount ?? 0, icon: Zap, color: "text-status-blocked" },
  ];

  const classLabels: Record<string, string> = {
    PRESTADOR_ISENTO: "Prestador/Isento",
    VISITANTE: "Visitante",
    CLIENTE: "Cliente",
    FORNECEDOR: "Fornecedor",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema de portaria</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ title, value, icon: Icon, color }) => (
          <Card key={title} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-muted ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent entries */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Últimas Entradas na Portaria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries && recentEntries.length > 0 ? (
            <div className="space-y-2">
              {recentEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium text-sm text-foreground">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.company ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                      {classLabels[entry.classification] ?? entry.classification}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.entry_date} {entry.entry_time ? `• ${entry.entry_time}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum registro ainda. Comece registrando entradas na portaria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
