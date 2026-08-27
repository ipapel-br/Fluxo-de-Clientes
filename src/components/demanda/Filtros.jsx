import { Search, X } from 'lucide-react';

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function Filtros({ filtros, setFiltros, vendedores, revendas, statuses }) {
  const ativo = filtros.busca || filtros.vendedor || filtros.revenda || filtros.status;
  const statusOpts = [...statuses]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((s) => ({ value: s.id, label: s.nome }));

  function limpar() {
    setFiltros({ busca: '', vendedor: '', revenda: '', status: '' });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filtros.busca}
          onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          placeholder="Buscar por cliente ou revenda..."
          className="w-full h-11 rounded-xl border border-input bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filtros.vendedor}
          onChange={(v) => setFiltros({ ...filtros, vendedor: v })}
          options={vendedores.map((v) => ({ value: v, label: v }))}
          placeholder="Vendedor"
        />
        <Select
          value={filtros.revenda}
          onChange={(v) => setFiltros({ ...filtros, revenda: v })}
          options={revendas.map((r) => ({ value: r, label: r }))}
          placeholder="Revenda"
        />
        <Select
          value={filtros.status}
          onChange={(v) => setFiltros({ ...filtros, status: v })}
          options={statusOpts}
          placeholder="Status"
        />
        {ativo && (
          <button
            onClick={limpar}
            className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted transition"
          >
            <X size={14} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}