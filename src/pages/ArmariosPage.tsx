import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Lock, User, X } from "lucide-react";
import { toast } from "sonner";

type Locker = {
  id: string;
  number: string;
  locker_group: string;
  employee_id: string | null;
  allocated_at: string | null;
  notes: string | null;
  employees?: { name: string; registration: string | null } | null;
};

const groups = [
  { value: "FEM_A", label: "Feminino A" },
  { value: "MASC_A", label: "Masculino A" },
  { value: "MASC_B", label: "Masculino B" },
];

const emptyForm = { number: "", locker_group: "MASC_A", notes: "" };

export default function ArmariosPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [activeGroup, setActiveGroup] = useState("MASC_A");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const { data: lockers = [], isLoading, isFetched } = useQuery({
    queryKey: ["lockers", activeGroup],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lockers")
        .select("*, employees(name, registration)")
        .eq("locker_group", activeGroup as "FEM_A" | "MASC_A" | "MASC_B")
        .order("number");
      if (error) throw error;
      return (data ?? []) as Locker[];
    },
    staleTime: 30_000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name, registration").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lockers").insert({
        number: form.number,
        locker_group: form.locker_group as "FEM_A" | "MASC_A" | "MASC_B",
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lockers"] }); qc.invalidateQueries({ queryKey: ["locker-count"] }); toast.success("Armário criado!"); setDialogOpen(false); setForm(emptyForm); },
    onError: (e: Error) => toast.error(e.message),
  });

  const allocMutation = useMutation({
    mutationFn: async ({ lockerId, employeeId }: { lockerId: string; employeeId: string | null }) => {
      const { error } = await supabase.from("lockers").update({
        employee_id: employeeId,
        allocated_at: employeeId ? new Date().toISOString() : null,
      }).eq("id", lockerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lockers"] });
      qc.invalidateQueries({ queryKey: ["locker-count"] });
      toast.success("Armário atualizado!");
      setAllocDialogOpen(false);
      setSelectedLocker(null);
      setSelectedEmployee("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAlloc = (locker: Locker) => {
    setSelectedLocker(locker);
    setSelectedEmployee(locker.employee_id ?? "");
    setAllocDialogOpen(true);
  };

  const canManage = role === "admin" || role === "supervisor";
  const occupied = lockers.filter(l => l.employee_id).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Armários</h1>
          <p className="text-muted-foreground text-sm">{occupied}/{lockers.length} alocados</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Armário
          </Button>
        )}
      </div>

      <Tabs value={activeGroup} onValueChange={setActiveGroup}>
        <TabsList>
          {groups.map(g => <TabsTrigger key={g.value} value={g.value}>{g.label}</TabsTrigger>)}
        </TabsList>

        {groups.map(g => (
          <TabsContent key={g.value} value={g.value} className="mt-4">
          {!isFetched ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : lockers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum armário cadastrado para este grupo</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {lockers.map(locker => (
                  <div
                    key={locker.id}
                    onClick={() => canManage && openAlloc(locker)}
                    className={`relative p-3 rounded-lg border-2 transition-all ${
                      locker.employee_id
                        ? "border-status-active bg-green-50 cursor-pointer hover:bg-green-100"
                        : "border-border bg-card cursor-pointer hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-sm font-mono">{locker.number}</span>
                      {locker.employee_id ? (
                        <Lock className="h-3 w-3 text-status-active flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    {locker.employees ? (
                      <div>
                        <p className="text-xs font-medium text-foreground truncate">{locker.employees.name}</p>
                        {locker.employees.registration && (
                          <p className="text-xs text-muted-foreground">{locker.employees.registration}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Disponível</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Armário</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (!form.number) return toast.error("Número obrigatório."); createMutation.mutate(); }} className="space-y-4">
            <div className="space-y-1">
              <Label>Número *</Label>
              <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="01, A1, etc." required />
            </div>
            <div className="space-y-1">
              <Label>Grupo</Label>
              <Select value={form.locker_group} onValueChange={v => setForm(f => ({ ...f, locker_group: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{groups.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alloc Dialog */}
      <Dialog open={allocDialogOpen} onOpenChange={setAllocDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Armário {selectedLocker?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLocker?.employees && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedLocker.employees.name}</p>
                  <p className="text-xs text-muted-foreground">Alocado atualmente</p>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => allocMutation.mutate({ lockerId: selectedLocker.id, employeeId: null })}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <Label>{selectedLocker?.employee_id ? "Trocar funcionário" : "Alocar funcionário"}</Label>
              <Select value={selectedEmployee || "none"} onValueChange={v => setSelectedEmployee(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar funcionário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (desalocar)</SelectItem>
                  {(employees as { id: string; name: string; registration: string | null }[]).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} {emp.registration ? `(${emp.registration})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAllocDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => selectedLocker && allocMutation.mutate({ lockerId: selectedLocker.id, employeeId: selectedEmployee || null })}
                disabled={allocMutation.isPending}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
