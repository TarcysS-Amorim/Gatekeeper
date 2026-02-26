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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, Car } from "lucide-react";
import { toast } from "sonner";

type Vehicle = {
  id: string;
  plate: string;
  model: string | null;
  color: string | null;
  brand: string | null;
  year: number | null;
  status: string;
  notes: string | null;
  employee_id: string | null;
  employees?: { name: string } | null;
};

const statusOptions = [
  { value: "FLUTUANTE", label: "Flutuante", cls: "bg-blue-100 text-blue-800" },
  { value: "FIXO", label: "Fixo", cls: "bg-green-100 text-green-800" },
];

const emptyForm = { plate: "", model: "", color: "", brand: "", year: "", status: "FLUTUANTE", notes: "", employee_id: "" };

export default function VeiculosPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles", search],
    queryFn: async () => {
      let q = supabase.from("vehicles").select("*, employees(name)").order("created_at", { ascending: false });
      if (search) q = q.ilike("plate", `%${search}%`);
      const { data } = await q;
      return (data ?? []) as Vehicle[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm & { id?: string }) => {
      const payload = {
        plate: data.plate.toUpperCase(),
        model: data.model || null,
        color: data.color || null,
        brand: data.brand || null,
        year: data.year ? Number(data.year) : null,
        status: (data.status === "FIXO" ? "ACTIVE" : "PENDING") as "ACTIVE" | "PENDING" | "BLOCKED",
        notes: data.notes || null,
        employee_id: data.employee_id || null,
        created_by: user?.id,
      };
      if (data.id) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle-count"] });
      toast.success(editItem ? "Veículo atualizado!" : "Veículo cadastrado!");
      setDialogOpen(false); setEditItem(null); setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Veículo excluído."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (v: Vehicle) => {
    setEditItem(v);
    setForm({ plate: v.plate, model: v.model ?? "", color: v.color ?? "", brand: v.brand ?? "", year: v.year?.toString() ?? "", status: v.status, notes: v.notes ?? "", employee_id: v.employee_id ?? "" });
    setDialogOpen(true);
  };

  const canEdit = role === "admin" || role === "supervisor";
  const canDelete = role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground text-sm">{vehicles.length} veículos</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Veículo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por placa..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Placa</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Funcionário</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Car className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Nenhum veículo encontrado</p>
                  </TableCell>
                </TableRow>
              ) : vehicles.map(v => {
                const st = statusOptions.find(s => s.value === v.status);
                return (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-bold text-sm">{v.plate}</TableCell>
                    <TableCell className="text-sm">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-sm">{v.color ?? "—"}</TableCell>
                    <TableCell className="text-sm">{v.year ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st?.cls ?? ""}`}>{st?.label ?? v.status}</span>
                    </TableCell>
                    <TableCell className="text-sm">{v.employees?.name ?? "—"}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex gap-1">
                          {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="h-3 w-3" /></Button>}
                          {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(v.id)}><Trash2 className="h-3 w-3" /></Button>}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar Veículo" : "Novo Veículo"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (!form.plate) return toast.error("Placa obrigatória."); saveMutation.mutate(editItem ? { ...form, id: editItem.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Placa *</Label>
                <Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" className="font-mono" required />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Volkswagen" />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Gol" />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Branco" />
              </div>
              <div className="space-y-1">
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Funcionário</Label>
                <Select value={form.employee_id || "none"} onValueChange={v => setForm(f => ({ ...f, employee_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar funcionário" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {employees.map((emp: { id: string; name: string }) => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
