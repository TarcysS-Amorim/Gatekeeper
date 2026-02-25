import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  user_roles?: { role: string }[];
};

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "doorman", label: "Porteiro" },
];

const roleBadgeVariant: Record<string, "destructive" | "default" | "secondary"> = {
  admin: "destructive",
  supervisor: "default",
  doorman: "secondary",
};

export default function UsuariosPage() {
  const { role, user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", role: "doorman" });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, created_at")
        .order("created_at");
      if (!data) return [];
      // Fetch roles separately
      const userIds = data.map(p => p.user_id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      return data.map(p => ({
        ...p,
        user_roles: roles?.filter(r => r.user_id === p.user_id) ?? [],
      })) as Profile[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // Delete existing role first, then insert new
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as "admin" | "supervisor" | "doorman" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profiles"] }); toast.success("Role atualizada!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm mt-1">Somente administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm">{profiles.length} usuários</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-48">Alterar Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : profiles.map(profile => {
              const currentRole = profile.user_roles?.[0]?.role ?? null;
              const isSelf = profile.user_id === currentUser?.id;
              return (
                <TableRow key={profile.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {(profile.full_name ?? profile.email ?? "?")[0]?.toUpperCase()}
                      </div>
                      {profile.full_name ?? "—"}
                      {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{profile.email}</TableCell>
                  <TableCell>
                    {currentRole ? (
                      <Badge variant={roleBadgeVariant[currentRole] ?? "secondary"}>
                        {roleOptions.find(r => r.value === currentRole)?.label ?? currentRole}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem role</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={currentRole ?? ""}
                      onValueChange={v => updateRoleMutation.mutate({ userId: profile.user_id, newRole: v })}
                      disabled={isSelf}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Atribuir role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground flex items-start gap-2">
        <UserCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>Novos usuários são criados via login. Após o primeiro acesso, atribua uma role aqui. Usuários sem role têm acesso leitura apenas.</p>
      </div>
    </div>
  );
}
