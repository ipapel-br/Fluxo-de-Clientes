import { useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X, Check, List, Columns3 } from 'lucide-react';
import { COMPLEXIDADES } from '@/lib/complexidade';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import UserAvatar from '@/components/ui/UserAvatar';
import { getStatusColor } from '@/lib/statusColors';

const ALL = '__all__';

function CompactSelect({ value, onChange, options = [], placeholder, showAvatar = false }) {
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
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{placeholder}</label>
      <Select
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? '' : v)}
      >
        <SelectTrigger className="h-8.5 w-full bg-card border-border text-xs text-foreground focus:ring-1 focus:ring-ring">
          <SelectValue placeholder={`Todos(as) ${placeholder.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border text-popover-foreground">
          <SelectItem value={ALL} className="text-xs">Todos ({placeholder})</SelectItem>
          {uniqueOptions.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
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
    </div>
  );
}

export default function Filtros({
  filtros,
  setFiltros,
  vendedores = [],
  revendas = [],
  designers = [],
  statuses = [],
  ordenacao = 'prioridade',
  setOrdenacao,
  contadores = { todas: 0, minhas: 0, hoje: 0, atrasadas: 0, altaPrioridade: 0, pendente: 0, amostra: 0, revisao: 0 },
  viewMode = 'lista',
  onViewModeChange,
  acoesExtras,
}) {
  const statusOpts = useMemo(
    () =>
      [...statuses]
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((s) => ({ value: s.id, label: s.nome, cor: getStatusColor(s) })),
    [statuses]
  );

  // Calcula total de filtros ativos (além da busca e da aba ativa)
  const filtrosAtivosCount = useMemo(() => {
    let count = 0;
    if (filtros.status) count++;
    if (filtros.prioridade) count++;
    if (filtros.complexidade) count++;
    if (filtros.etapa) count++;
    if (filtros.designer) count++;
    if (filtros.vendedor) count++;
    if (filtros.revenda) count++;
    return count;
  }, [filtros]);

  function limparFiltros() {
    setFiltros({
      busca: '',
      aba: 'todas',
      vendedor: '',
      revenda: '',
      designer: '',
      status: '',
      prioridade: '',
      complexidade: '',
      etapa: '',
    });
  }

  const opcoesOrdenacao = [
    { value: 'prioridade', label: 'Prioridade' },
    { value: 'prazo', label: 'Prazo mais próximo' },
    { value: 'cliente', label: 'Cliente (A-Z)' },
    { value: 'recentes', label: 'Mais recentes' },
  ];

  const ordenacaoAtualLabel =
    opcoesOrdenacao.find((o) => o.value === ordenacao)?.label || 'Prioridade';

  return (
    <div className="space-y-4">
      {/* 1. Navegação rápida horizontal (Abas de filtro de topo) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border text-xs">
        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'todas' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'todas'
              ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <span>Todas</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
              filtros.aba === 'todas'
                ? 'bg-muted-foreground/15 text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {contadores.todas}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'minhas' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'minhas'
              ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <span>Minhas</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
              filtros.aba === 'minhas'
                ? 'bg-muted-foreground/15 text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {contadores.minhas}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'hoje' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'hoje'
              ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <span>Hoje</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
              filtros.aba === 'hoje'
                ? 'bg-muted-foreground/15 text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {contadores.hoje}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'atrasadas' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'atrasadas'
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 font-semibold border border-rose-500/30 shadow-xs'
              : 'text-rose-600/90 dark:text-rose-400/90 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10'
          }`}
        >
          <span className="font-semibold text-rose-600 dark:text-rose-400">Atrasadas</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
              filtros.aba === 'atrasadas'
                ? 'bg-rose-500/25 text-rose-700 dark:text-rose-200'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }`}
          >
            {contadores.atrasadas}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'alta_prioridade' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'alta_prioridade'
              ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <span>Alta prioridade</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
              filtros.aba === 'alta_prioridade'
                ? 'bg-muted-foreground/15 text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {contadores.altaPrioridade}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'pendente' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'pendente'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 shadow-xs'
              : 'text-amber-600/90 dark:text-amber-400/90 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          <span className="font-semibold text-amber-600 dark:text-amber-400">Pendente</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
              filtros.aba === 'pendente'
                ? 'bg-amber-500/25 text-amber-800 dark:text-amber-200'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
            }`}
          >
            {contadores.pendente ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'amostra' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'amostra'
              ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/30 shadow-xs'
              : 'text-cyan-600/90 dark:text-cyan-400/90 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-500/10'
          }`}
        >
          <span className="font-semibold text-cyan-600 dark:text-cyan-400">Amostra</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
              filtros.aba === 'amostra'
                ? 'bg-cyan-500/25 text-cyan-800 dark:text-cyan-200'
                : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400'
            }`}
          >
            {contadores.amostra ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, aba: 'revisao' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
            filtros.aba === 'revisao'
              ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 font-semibold border border-orange-500/30 shadow-xs'
              : 'text-orange-600/90 dark:text-orange-400/90 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-500/10'
          }`}
        >
          <span className="font-semibold text-orange-600 dark:text-orange-400">Revisão</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
              filtros.aba === 'revisao'
                ? 'bg-orange-500/25 text-orange-800 dark:text-orange-200'
                : 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
            }`}
          >
            {contadores.revisao ?? 0}
          </span>
        </button>
      </div>

      {/* 2. Barra principal de busca e controles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Input grande de busca */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            placeholder="Buscar cliente, Bitrix, revenda, designer..."
            className="pl-10 h-10 bg-card border-border text-sm text-foreground placeholder:text-muted-foreground/60 rounded-lg focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition"
          />
          {filtros.busca && (
            <button
              type="button"
              onClick={() => setFiltros({ ...filtros, busca: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Seletor Lista / Kanban - disponível apenas na aba "Todas" */}
        {onViewModeChange && filtros.aba === 'todas' && (
          <div className="flex items-center rounded-lg border border-border bg-card p-1 h-10 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange('lista')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer h-full ${
                viewMode === 'lista'
                  ? 'bg-secondary text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              title="Visualização em Lista"
            >
              <List size={14} />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer h-full ${
                viewMode === 'kanban'
                  ? 'bg-secondary text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              title="Visualização em Kanban"
            >
              <Columns3 size={14} />
              <span>Kanban</span>
            </button>
          </div>
        )}

        {/* Botão Filtros Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 px-3.5 rounded-lg border-border bg-card hover:bg-accent hover:text-accent-foreground text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
                filtrosAtivosCount > 0 ? 'text-foreground border-primary/40 bg-accent/80' : 'text-muted-foreground'
              }`}
            >
              <SlidersHorizontal size={14} className="opacity-80" />
              <span>Filtros</span>
              {filtrosAtivosCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 text-foreground px-1.5 text-[11px] font-bold">
                  {filtrosAtivosCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 p-4 space-y-3.5 bg-popover border-border text-popover-foreground shadow-2xl rounded-xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="text-xs font-bold tracking-tight text-foreground uppercase">Filtros avançados</h4>
              {filtrosAtivosCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFiltros({
                      ...filtros,
                      status: '',
                      prioridade: '',
                      etapa: '',
                      designer: '',
                      vendedor: '',
                      revenda: '',
                    })
                  }
                  className="text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  Resetar
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Prioridade */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Prioridade</label>
                <Select
                  value={filtros.prioridade || ALL}
                  onValueChange={(v) => setFiltros({ ...filtros, prioridade: v === ALL ? '' : v })}
                >
                  <SelectTrigger className="h-8.5 w-full bg-card border-border text-xs text-foreground">
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value={ALL} className="text-xs">Todas</SelectItem>
                    <SelectItem value="alta_urgente" className="text-xs">Alta, Urgente</SelectItem>
                    <SelectItem value="urgente" className="text-xs">Apenas Urgente</SelectItem>
                    <SelectItem value="alta" className="text-xs">Apenas Alta</SelectItem>
                    <SelectItem value="rotina" className="text-xs">Rotina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Complexidade */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Complexidade</label>
                <Select
                  value={filtros.complexidade || ALL}
                  onValueChange={(v) => setFiltros({ ...filtros, complexidade: v === ALL ? '' : v })}
                >
                  <SelectTrigger className="h-8.5 w-full bg-card border-border text-xs text-foreground">
                    <SelectValue placeholder="Todas as complexidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value={ALL} className="text-xs">Todas as complexidades</SelectItem>
                    {COMPLEXIDADES.map((c) => (
                      <SelectItem key={c.valor} value={c.valor} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.cor }}
                          />
                          <span>{c.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Status operacional</label>
                <Select
                  value={filtros.status || ALL}
                  onValueChange={(v) => setFiltros({ ...filtros, status: v === ALL ? '' : v })}
                >
                  <SelectTrigger className="h-8.5 w-full bg-card border-border text-xs text-foreground">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value={ALL} className="text-xs">Todos os status</SelectItem>
                    <SelectItem value="abertas" className="text-xs font-semibold">Abertas (Não concluídas)</SelectItem>
                    {statusOpts.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: s.cor }}
                          />
                          <span>{s.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Designer */}
              <CompactSelect
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

              {/* Vendedor */}
              <CompactSelect
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

              {/* Revenda */}
              <CompactSelect
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
            </div>
          </PopoverContent>
        </Popover>

        {/* Dropdown de Ordenação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-3.5 rounded-lg border-border bg-card hover:bg-accent hover:text-accent-foreground text-xs sm:text-sm font-medium text-muted-foreground transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <ArrowUpDown size={14} className="opacity-80" />
              <span>Ordenar: <strong className="text-foreground font-semibold">{ordenacaoAtualLabel}</strong></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[170px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-xl">
            {opcoesOrdenacao.map((op) => (
              <DropdownMenuItem
                key={op.value}
                onClick={() => setOrdenacao && setOrdenacao(op.value)}
                className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-md cursor-pointer transition ${
                  ordenacao === op.value
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span>{op.label}</span>
                {ordenacao === op.value && <Check size={13} className="text-primary ml-2" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ações adicionais (Importar CSV, Nova demanda, etc.) */}
        {acoesExtras && (
          <div className="flex items-center gap-2 shrink-0">
            {acoesExtras}
          </div>
        )}
      </div>
    </div>
  );
}