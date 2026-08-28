import { useMemo } from 'react';
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

function FilterSelect({ value, onChange, options = [], placeholder, showAvatar = false }) {
  const ALL = '__all__';

  // Deduplicar opções para garantir chaves únicas no React Select
  const uniqueOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    (options || []).forEach((o) => {
      const val = typeof o === 'object' ? (o.value || o.nome || '') : o;
      if (val && !seen.has(val)) {
        seen.add(val);
        list.push(typeof o === 'object' ? o : { value: o, label: o });
      }
    });
    return list;
  }, [options]);

  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(v === ALL ? '' : v)}
    >
      <SelectTrigger className="h-9 w-full sm:w-auto min-w-[125px] bg-background text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder} (Todos)</SelectItem>
        {uniqueOptions.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <div className="flex items-center gap-2">
              {showAvatar && o.value && (
                <UserAvatar name={o.label} src={o.avatar_url} size="xs" className="shrink-0" />
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
    <div className="space-y-2.5">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          value={filtros.busca}
          onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          placeholder="Buscar por cliente, revenda, designer..."
          className="pl-9 h-9 sm:h-10 bg-background text-sm"
        />
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <FilterSelect
          value={filtros.designer}
          onChange={(v) => setFiltros({ ...filtros, designer: v })}
          options={designers.map((d) =>
            typeof d === 'object'
              ? { value: d.value || d.nome || '', label: d.label || d.nome || '', avatar_url: d.avatar_url }
              : { value: d, label: d }
          )}
          placeholder="Designer"
          showAvatar={true}
        />
        <FilterSelect
          value={filtros.vendedor}
          onChange={(v) => setFiltros({ ...filtros, vendedor: v })}
          options={vendedores.map((v) =>
            typeof v === 'object'
              ? { value: v.value || v.nome || '', label: v.label || v.nome || '', avatar_url: v.avatar_url }
              : { value: v, label: v }
          )}
          placeholder="Vendedor"
          showAvatar={true}
        />
        <FilterSelect
          value={filtros.revenda}
          onChange={(v) => setFiltros({ ...filtros, revenda: v })}
          options={revendas.map((r) =>
            typeof r === 'object'
              ? { value: r.value || r.nome || '', label: r.label || r.nome || '', avatar_url: r.avatar_url }
              : { value: r, label: r }
          )}
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
            className="col-span-2 sm:col-span-1 h-9 text-muted-foreground hover:text-foreground justify-center"
          >
            <X size={14} className="mr-1" /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}