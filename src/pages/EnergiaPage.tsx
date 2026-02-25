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
import { Plus, Search, Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type PowerOutage = {
  id: string;
  outage_date: string;
  protocol: string | null;
  start_time: string;
  return_time: string | null;
  duration_minutes: number | null;
  attendant_name: string | null;
  doorman_name: string | null;
  notes: string | null;
};

const emptyForm = {
  outage_date: format(new Date(), "yyyy-MM-dd"),
  protocol: "",
  start_time: "",
  return_time: "",
  attendant_name: "",
  doorman_name: "",
  notes: "",
};

export default function EnergiaPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PowerOutage | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: outages = [], isLoading } = useQuery({
    queryKey: ["power-outages", search],
    queryFn: async () => {
      let q = supabase.from("power_outages").select("*").order("outage_date", { ascending: false });
      if (search) q = q.or(`protocol.ilike.%${search}%,attendant_name.ilike.%${search}%,doorman_name.ilike.%${search}%`);
      const { data } = await q;
      return (data ?? []) as PowerOutage[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm & { id?: string }) => {
      const payload = {
        outage_date: data.outage_date,
        protocol: data.protocol || null,
        start_time: data.start_time,
        return_time: data.return_time || null,
        attendant_name: data.attendant_name || null,
        doorman_name: data.doorman_name || null,
        notes: data.notes || null,
        created_by: user?.id,
      };
      if (data.id) {
        const { error } = await supabase.from("power_outages").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("power_outages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["power-outages"] });
      qc.invalidateQueries({ queryKey: ["outage-count"] });
      toast.success(editItem ? "Registro atualizado!" : "Registro criado!");
      setDialogOpen(false); setEditItem(null); setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("power_outages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["power-outages"] }); toast.success("Registro excluído."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (item: PowerOutage) => {
    setEditItem(item);
    setForm({
      outage_date: item.outage_date,
      protocol: item.protocol ?? "",
      start_time: item.start_time,
      return_time: item.return_time ?? "",
      attendant_name: item.attendant_name ?? "",
      doorman_name: item.doorman_name ?? "",
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  };

  const canEdit = role === "admin" || role === "supervisor";
  const canDelete = role === "admin";

  const formatDuration = (min: number | null) => {
    if (!min) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Queda de Energia</h1>
          <p className="text-muted-foreground text-sm">{outages.length} registros</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Registro
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar protocolo, atendente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Retorno</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Atendente</TableHead>
                <TableHead>Porteiro</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : outages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Nenhum registro de queda de energia</p>
                  </TableCell>
                </TableRow>
              ) : outages.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">{item.outage_date}</TableCell>
                  <TableCell className="text-sm">{item.protocol ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{item.start_time}</TableCell>
                  <TableCell className="font-mono text-sm">{item.return_time ?? "—"}</TableCell>
                  <TableCell>
                    {item.duration_minutes !== null ? (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                        {formatDuration(item.duration_minutes)}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{item.attendant_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{item.doorman_name ?? "—"}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell>
                      <div className="flex gap-1">
                        {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar Registro" : "Nova Queda de Energia"}</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            if (!form.start_time) return toast.error("Hora de início obrigatória.");
            saveMutation.mutate(editItem ? { ...form, id: editItem.id } : form);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={form.outage_date} onChange={e => setForm(f => ({ ...f, outage_date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Protocolo</Label>
                <Input value={form.protocol} onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))} placeholder="N° protocolo" />
              </div>
              <div className="space-y-1">
                <Label>Hora Início *</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Hora Retorno</Label>
                <Input type="time" value={form.return_time} onChange={e => setForm(f => ({ ...f, return_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Atendente</Label>
                <Input value={form.attendant_name} onChange={e => setForm(f => ({ ...f, attendant_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Porteiro</Label>
                <Input value={form.doorman_name} onChange={e => setForm(f => ({ ...f, doorman_name: e.target.value }))} />
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
