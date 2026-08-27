import { Search, X } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/ui/UserAvatar';

function FilterSelect({ value, onChange, options, placeholder, showAvatar = false }) {
  const ALL = '__all__';
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(v === ALL ? '' : v)}
    >
      <SelectTrigger className="h-9 w-auto min-w-[130px] bg-background text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder} (Todos)</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <div className="flex items-center gap-2">
              {showAvatar && o.value && (
                <UserAvatar name={o.label} size="xs" className="shrink-0" />
              )}
              <span>{o.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Filtros({
  filtros,
  setFiltros,
  vendedores = [],
  revendas = [],
  designers = [],
  statuses = [],
}) {
  const ativo =
    filtros.busca ||
    filtros.vendedor ||
    filtros.revenda ||
    filtros.designer ||
    filtros.status;

  const statusOpts = [...statuses]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((s) => ({ value: s.id, label: s.nome }));

  function limpar() {
    setFiltros({ busca: '', vendedor: '', revenda: '', designer: '', status: '' });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          value={filtros.busca}
          onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          placeholder="Buscar por cliente, revenda, designer..."
          className="pl-9 h-10 bg-background"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={filtros.designer}
          onChange={(v) => setFiltros({ ...filtros, designer: v })}
          options={designers.map((d) => ({ value: d, label: d }))}
          placeholder="Designer"
          showAvatar={true}
        />
        <FilterSelect
          value={filtros.vendedor}
          onChange={(v) => setFiltros({ ...filtros, vendedor: v })}
          options={vendedores.map((v) => ({ value: v, label: v }))}
          placeholder="Vendedor"
          showAvatar={true}
        />
        <FilterSelect
          value={filtros.revenda}
          onChange={(v) => setFiltros({ ...filtros, revenda: v })}
          options={revendas.map((r) => ({ value: r, label: r }))}
          placeholder="Revenda"
          showAvatar={true}
        />
        <FilterSelect
          value={filtros.status}
          onChange={(v) => setFiltros({ ...filtros, status: v })}
          options={statusOpts}
          placeholder="Status"
        />
        {ativo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={limpar}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X size={14} className="mr-1" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}