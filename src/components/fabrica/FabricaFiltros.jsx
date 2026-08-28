import { useMemo } from 'react';
import { Search, X, Layers } from 'lucide-react';
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
import { ACABAMENTOS, STATUS_FABRICA } from '@/lib/acabamentos';
import { ETIQUETAS } from '@/lib/etiquetas';

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
      <SelectTrigger className="h-9 w-full sm:w-auto min-w-[130px] bg-background text-sm">
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

export default function FabricaFiltros({
  filtros,
  setFiltros,
  vendedores = [],
}) {
  const ativo =
    filtros.busca ||
    filtros.acabamento ||
    filtros.urgencia ||
    filtros.vendedor ||
    filtros.statusFabrica;

  function limpar() {
    setFiltros({
      busca: '',
      acabamento: '',
      urgencia: '',
      vendedor: '',
      statusFabrica: '',
    });
  }

  const urgenciaOpts = ETIQUETAS.map((e) => ({ value: e.valor, label: e.label }));
  const statusFabricaOpts = STATUS_FABRICA.map((s) => ({ value: s.id, label: s.label }));

  return (
    <div className="space-y-2.5">
      {/* Barra de Busca Principal */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          value={filtros.busca}
          onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          placeholder="Buscar por cliente, pedido, vendedor..."
          className="pl-9 h-9 sm:h-10 bg-background text-sm"
        />
      </div>

      {/* Filtros Rápidos por Acabamento (Remessas / Lotes) */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Layers size={13} /> Acabamento:
        </span>
        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, acabamento: '' })}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
            !filtros.acabamento
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          TODOS
        </button>

        {ACABAMENTOS.map((a) => {
          const isSelected = filtros.acabamento === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() =>
                setFiltros({
                  ...filtros,
                  acabamento: isSelected ? '' : a.id,
                })
              }
              style={
                isSelected
                  ? {
                      backgroundColor: a.cor,
                      color: '#ffffff',
                      borderColor: a.cor,
                    }
                  : undefined
              }
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                isSelected
                  ? 'shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {a.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Filtros Dropdown Complementares */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <FilterSelect
          value={filtros.statusFabrica}
          onChange={(v) => setFiltros({ ...filtros, statusFabrica: v })}
          options={statusFabricaOpts}
          placeholder="Status"
        />
        <FilterSelect
          value={filtros.urgencia}
          onChange={(v) => setFiltros({ ...filtros, urgencia: v })}
          options={urgenciaOpts}
          placeholder="Urgência"
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
