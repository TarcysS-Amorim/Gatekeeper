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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Download, Pencil, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type GateEntry = {
  id: string;
  classification: string;
  entry_date: string;
  entry_time: string | null;
  name: string;
  company: string | null;
  plate: string | null;
  nf: string | null;
  purchase_order: string | null;
  unit_price: number | null;
  total_price: number | null;
  quantity: number | null;
  net_weight: number | null;
  material: string | null;
  notes: string | null;
  created_at: string;
};

const classOptions = [
  { value: "PRESTADOR_ISENTO", label: "Prestador/Isento" },
  { value: "VISITANTE", label: "Visitante" },
  { value: "CLIENTE", label: "Cliente" },
  { value: "FORNECEDOR", label: "Fornecedor" },
];

const classColors: Record<string, string> = {
  PRESTADOR_ISENTO: "bg-blue-100 text-blue-800",
  VISITANTE: "bg-purple-100 text-purple-800",
  CLIENTE: "bg-green-100 text-green-800",
  FORNECEDOR: "bg-orange-100 text-orange-800",
};

const emptyForm = {
  classification: "VISITANTE",
  entry_date: format(new Date(), "yyyy-MM-dd"),
  entry_time: format(new Date(), "HH:mm"),
  name: "",
  company: "",
  plate: "",
  nf: "",
  purchase_order: "",
  unit_price: "",
  total_price: "",
  quantity: "",
  net_weight: "",
  material: "",
  notes: "",
};

export default function PortariaPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<GateEntry | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["gate-entries", search, filterClass],
    queryFn: async () => {
      let q = supabase
        .from("gate_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("entry_time", { ascending: false });
      if (search) q = q.or(`name.ilike.%${search}%,company.ilike.%${search}%,plate.ilike.%${search}%`);
      if (filterClass !== "all") q = q.eq("classification", filterClass as "CLIENTE" | "FORNECEDOR" | "PRESTADOR_ISENTO" | "VISITANTE");
      const { data } = await q;
      return (data ?? []) as GateEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm & { id?: string }) => {
      const payload = {
        classification: data.classification as "CLIENTE" | "FORNECEDOR" | "PRESTADOR_ISENTO" | "VISITANTE",
        entry_date: data.entry_date,
        entry_time: data.entry_time || null,
        name: data.name,
        company: data.company || null,
        plate: data.plate || null,
        nf: data.nf || null,
        purchase_order: data.purchase_order || null,
        material: data.material || null,
        notes: data.notes || null,
        unit_price: data.unit_price ? Number(data.unit_price) : null,
        total_price: data.total_price ? Number(data.total_price) : null,
        quantity: data.quantity ? Number(data.quantity) : null,
        net_weight: data.net_weight ? Number(data.net_weight) : null,
        created_by: user?.id,
      };
      if (data.id) {
        const { error } = await supabase.from("gate_entries").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gate_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gate-entries"] });
      qc.invalidateQueries({ queryKey: ["gate-count"] });
      toast.success(editEntry ? "Registro atualizado!" : "Registro criado!");
      setDialogOpen(false);
      setEditEntry(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gate_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gate-entries"] });
      toast.success("Registro excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditEntry(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: GateEntry) => {
    setEditEntry(entry);
    setForm({
      classification: entry.classification,
      entry_date: entry.entry_date,
      entry_time: entry.entry_time ?? "",
      name: entry.name,
      company: entry.company ?? "",
      plate: entry.plate ?? "",
      nf: entry.nf ?? "",
      purchase_order: entry.purchase_order ?? "",
      unit_price: entry.unit_price?.toString() ?? "",
      total_price: entry.total_price?.toString() ?? "",
      quantity: entry.quantity?.toString() ?? "",
      net_weight: entry.net_weight?.toString() ?? "",
      material: entry.material ?? "",
      notes: entry.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    saveMutation.mutate(editEntry ? { ...form, id: editEntry.id } : form);
  };

  const exportCSV = () => {
    const headers = ["Data", "Hora", "Classificação", "Nome", "Empresa", "Placa", "NF", "Pedido", "Material", "Quantidade", "Peso Líquido", "Preço Unit.", "Preço Total", "Obs"];
    const rows = entries.map(e => [
      e.entry_date, e.entry_time ?? "", e.classification, e.name, e.company ?? "",
      e.plate ?? "", e.nf ?? "", e.purchase_order ?? "", e.material ?? "",
      e.quantity ?? "", e.net_weight ?? "", e.unit_price ?? "", e.total_price ?? "", e.notes ?? ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "portaria.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const canEdit = role === "admin" || role === "supervisor";
  const canDelete = role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Controle de Portaria</h1>
          <p className="text-muted-foreground text-sm">{entries.length} registros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, empresa, placa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {classOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Material</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
              ) : entries.map(entry => (
                <TableRow key={entry.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-mono">{entry.entry_date}</TableCell>
                  <TableCell className="text-sm font-mono">{entry.entry_time ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${classColors[entry.classification] ?? ""}`}>
                      {classOptions.find(o => o.value === entry.classification)?.label ?? entry.classification}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{entry.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.company ?? "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{entry.plate ?? "—"}</TableCell>
                  <TableCell className="text-sm">{entry.nf ?? "—"}</TableCell>
                  <TableCell className="text-sm">{entry.material ?? "—"}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell>
                      <div className="flex gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(entry.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Editar Registro" : "Novo Registro de Portaria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Classificação *</Label>
                <Select value={form.classification} onValueChange={v => setForm(f => ({ ...f, classification: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input type="time" value={form.entry_time} onChange={e => setForm(f => ({ ...f, entry_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" required />
              </div>
              <div className="space-y-1">
                <Label>Empresa</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Empresa" />
              </div>
              <div className="space-y-1">
                <Label>Placa</Label>
                <Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" className="font-mono" />
              </div>
              <div className="space-y-1">
                <Label>NF</Label>
                <Input value={form.nf} onChange={e => setForm(f => ({ ...f, nf: e.target.value }))} placeholder="Nota fiscal" />
              </div>
              <div className="space-y-1">
                <Label>Pedido de Compra</Label>
                <Input value={form.purchase_order} onChange={e => setForm(f => ({ ...f, purchase_order: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Material</Label>
                <Input value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input type="number" step="0.001" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Peso Líquido (kg)</Label>
                <Input type="number" step="0.001" value={form.net_weight} onChange={e => setForm(f => ({ ...f, net_weight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Preço Unitário</Label>
                <Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Preço Total</Label>
                <Input type="number" step="0.01" value={form.total_price} onChange={e => setForm(f => ({ ...f, total_price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
