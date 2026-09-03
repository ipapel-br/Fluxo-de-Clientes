import { useMemo, useRef, useState, useCallback } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Calendar,
  AlertTriangle,
  Printer,
  Check,
  CheckCircle2,
  PauseCircle,
  MoreHorizontal,
  ArrowUpToLine,
  Pencil,
  Plus,
  Copy,
  History,
  Trash2,
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getStatusColor, hexToRgba } from '@/lib/statusColors';
import { complexidadeConfig } from '@/lib/complexidade';
import { faseArteConfig, FASES_ARTE } from '@/lib/progressoArte';
import { tipoAlertaPrazo, formatarPrazo, obterDataEntregaRevisao } from '@/lib/datas';
import { tipoDemandaConfig, TIPOS_DEMANDA } from '@/lib/tiposDemanda';
import { etiquetaConfig } from '@/lib/etiquetas';

export default function PrioridadesKanban({
  statuses = [],
  demandas = [],
  statusMap = {},
  vendedores = [],
  designers = [],
  revendas = [],
  onSelectDemanda,
  demandaSelecionadaId,
  onQuickUpdate,
  onEdit,
  onDelete,
  onConcluir,
  onEnviarParaImpressao,
  onRegistrarAlteracao,
  onDuplicar,
  onVerHistorico,
  onDefinirComoPrioridade,
  canEdit = true,
  canReorder = true,
  filtrando = false,
}) {
  // Ordena os statuses por ordem configurada
  const colunas = useMemo(() => {
    return [...statuses].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [statuses]);

  // Agrupa demandas visíveis por status_id
  const demandasPorColuna = useMemo(() => {
    const mapa = {};
    colunas.forEach((col) => {
      mapa[col.id] = [];
    });
    // Fallback para demandas cujo status não pertença aos statuses cadastrados
    mapa['__sem_coluna__'] = [];

    demandas.forEach((d) => {
      if (mapa[d.status_id]) {
        mapa[d.status_id].push(d);
      } else {
        mapa['__sem_coluna__'].push(d);
      }
    });

    return mapa;
  }, [colunas, demandas]);

  // Lógica para clicar e arrastar para rolar horizontalmente fora dos cards
  const scrollContainerRef = useRef(null);
  const isDraggingScrollRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const handleMouseDown = useCallback((e) => {
    // Se o clique foi dentro de um card arrastável ou botão/link/input, não intercepta o scroll lateral
    if (
      e.target.closest('[data-rfd-draggable-id]') ||
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('[role="menuitem"]')
    ) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingScrollRef.current = true;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
    setIsGrabbing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingScrollRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // multiplicador de velocidade confortável
    container.scrollLeft = scrollLeftRef.current - walk;
  }, []);

  const handleMouseUpOrLeave = useCallback(() => {
    if (isDraggingScrollRef.current) {
      isDraggingScrollRef.current = false;
      setIsGrabbing(false);
    }
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      className={`w-full overflow-x-auto pb-4 pt-1 kanban-scroll-container select-none ${
        isGrabbing ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <div className="flex items-start gap-4 min-w-max pb-2">
        {colunas.map((col) => {
          const corColuna = getStatusColor(col);
          const listaDemandas = demandasPorColuna[col.id] || [];

          return (
            <div
              key={col.id}
              className="w-80 shrink-0 flex flex-col rounded-xl border border-border/80 bg-muted/20 shadow-xs max-h-[calc(100vh-270px)] min-h-[350px]"
            >
              {/* Cabeçalho da Coluna Kanban */}
              <div className="p-3 border-b border-border/60 bg-card/60 rounded-t-xl flex items-center justify-between gap-2 select-none sticky top-0 z-10 backdrop-blur-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: corColuna }}
                  />
                  <h3
                    className="font-bold text-xs text-foreground uppercase tracking-wider truncate cursor-default"
                    title={col.descricao || (col.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : col.nome)}
                  >
                    {col.nome}
                  </h3>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold border tabular-nums shrink-0"
                  style={{
                    backgroundColor: hexToRgba(corColuna, 0.12),
                    borderColor: hexToRgba(corColuna, 0.3),
                    color: corColuna,
                  }}
                >
                  {listaDemandas.length}
                </span>
              </div>

              {/* Área Droppable da Coluna */}
              <Droppable droppableId={`coluna_${col.id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 transition-colors min-h-[140px] ${
                      snapshot.isDraggingOver ? 'bg-primary/5 rounded-b-xl' : ''
                    }`}
                  >
                    {listaDemandas.length === 0 && !snapshot.isDraggingOver && (
                      <div className="h-28 flex items-center justify-center border border-dashed border-border/70 rounded-lg text-xs text-muted-foreground/60 italic select-none">
                        Nenhuma demanda
                      </div>
                    )}

                    {listaDemandas.map((demanda, index) => {
                      const isSelected = demandaSelecionadaId === demanda.id;
                      const compCfg = complexidadeConfig(demanda.complexidade || 'normal');
                      const faseCfg = faseArteConfig(demanda.fase_arte);
                      const alerta = tipoAlertaPrazo(demanda.prazo, demanda, statusMap);
                      const etiqueta = etiquetaConfig(demanda.etiqueta);
                      const tipoCfg = tipoDemandaConfig(demanda.tipo_demanda || demanda.demanda);
                      const isPrimeiraGeral = demanda.ordem === 0 && !filtrando;

                      const designerObj = designers.find((d) => (d.nome || d.value || d.label) === demanda.designer);
                      const vendedorObj = vendedores.find((v) => (v.nome || v.value || v.label) === demanda.vendedor);

                      return (
                        <Draggable
                          key={demanda.id}
                          draggableId={demanda.id}
                          index={index}
                          isDragDisabled={!canReorder}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...(canReorder ? dragProvided.dragHandleProps : {})}
                              onClick={() => onSelectDemanda?.(demanda)}
                              className={`group relative rounded-lg border bg-card p-3 transition shadow-xs cursor-pointer select-none hover:shadow-md hover:border-primary/40 ${
                                isSelected
                                  ? 'border-primary/60 bg-muted/60'
                                  : 'border-border/80'
                              } ${
                                dragSnapshot.isDragging
                                  ? 'shadow-2xl ring-1 ring-border bg-card z-50 rotate-1'
                                  : ''
                              }`}
                            >
                              {/* Barra de destaque discreta na lateral esquerda */}
                              {(isPrimeiraGeral || isSelected) && (
                                <div
                                  className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg ${
                                    isSelected ? 'bg-primary' : 'bg-[#f97316]'
                                  }`}
                                />
                              )}

                              {/* Linha 1: Ordem, Prioridade (Etiqueta) e Menu */}
                              <div className="flex items-center justify-between gap-1.5 mb-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[11px] font-bold text-muted-foreground/70 tabular-nums">
                                    #{String((demanda.ordem ?? index) + 1).padStart(2, '0')}
                                  </span>

                                  {etiqueta && (
                                    <span
                                      className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs"
                                      style={{
                                        backgroundColor: hexToRgba(etiqueta.cor, 0.12),
                                        borderColor: hexToRgba(etiqueta.cor, 0.3),
                                        color: etiqueta.cor,
                                      }}
                                    >
                                      {etiqueta.label}
                                    </span>
                                  )}

                                  {isPrimeiraGeral && (
                                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black uppercase bg-[#f97316]/15 border border-[#f97316]/40 text-[#f97316] shadow-2xs">
                                      Prioridade
                                    </span>
                                  )}
                                </div>

                                {/* Menu ... */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition opacity-70 group-hover:opacity-100"
                                      >
                                        <MoreHorizontal size={13} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[170px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-2xl">
                                      {canReorder && (
                                        <DropdownMenuItem
                                          onClick={() => onDefinirComoPrioridade?.(demanda)}
                                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                                        >
                                          <ArrowUpToLine size={13} className="mr-2 text-amber-500" /> Definir como Prioridade
                                        </DropdownMenuItem>
                                      )}
                                      {canReorder && canEdit && <DropdownMenuSeparator className="bg-border" />}
                                      {canEdit && (
                                        <DropdownMenuItem
                                          onClick={() => onEdit?.(demanda)}
                                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent"
                                        >
                                          <Pencil size={13} className="mr-2 text-muted-foreground" /> Editar
                                        </DropdownMenuItem>
                                      )}
                                      {canEdit && (
                                        <DropdownMenuItem
                                          onClick={() => onEnviarParaImpressao?.(demanda)}
                                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent"
                                        >
                                          <Printer size={13} className="mr-2 text-muted-foreground" /> Imprimir
                                        </DropdownMenuItem>
                                      )}
                                      {canEdit && (
                                        <DropdownMenuItem
                                          onClick={() => onRegistrarAlteracao?.(demanda)}
                                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent"
                                        >
                                          <Plus size={13} className="mr-2 text-muted-foreground stroke-[2.5]" /> Registrar alteração
                                        </DropdownMenuItem>
                                      )}
                                      {canEdit && (
                                        <DropdownMenuItem
                                          onClick={() => onDuplicar?.(demanda)}
                                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent"
                                        >
                                          <Copy size={13} className="mr-2 text-muted-foreground" /> Duplicar
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => onVerHistorico?.(demanda)}
                                        className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent"
                                      >
                                        <History size={13} className="mr-2 text-muted-foreground" /> Ver histórico
                                      </DropdownMenuItem>
                                      {canEdit && (
                                        <>
                                          <DropdownMenuSeparator className="bg-border" />
                                          <DropdownMenuItem
                                            onClick={() => onDelete?.(demanda)}
                                            className="text-xs py-1.5 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                          >
                                            <Trash2 size={13} className="mr-2" /> Excluir
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Linha 2: Nome do Cliente */}
                              <div className="font-bold text-xs text-foreground line-clamp-1 mb-1" title={demanda.cliente}>
                                {demanda.cliente}
                              </div>

                              {/* Linha 3: Texto da Demanda / Bitrix ID */}
                              {demanda.demanda && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2.5 leading-snug">
                                  {demanda.demanda}
                                </p>
                              )}

                              {/* Linha 4: Badges de Etapa, Complexidade e Tipo de Demanda */}
                              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                {faseCfg && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shadow-2xs transition hover:opacity-80 cursor-pointer disabled:cursor-default"
                                          style={{
                                            backgroundColor: hexToRgba(faseCfg.cor, 0.1),
                                            borderColor: hexToRgba(faseCfg.cor, 0.25),
                                            color: faseCfg.cor,
                                          }}
                                          title={`Etapa da arte: ${faseCfg.label} (Clique para alterar)`}
                                        >
                                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: faseCfg.cor }} />
                                          <span>{faseCfg.curto || faseCfg.label}</span>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-max min-w-[140px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Etapa da Arte
                                        </div>
                                        {FASES_ARTE.map((f) => {
                                          const isSel = faseCfg?.valor === f.valor;
                                          return (
                                            <DropdownMenuItem
                                              key={f.valor}
                                              onClick={() => onQuickUpdate?.(demanda, { fase_arte: f.valor })}
                                              className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between gap-3 rounded-lg transition-colors my-0.5 whitespace-nowrap ${
                                                isSel ? 'bg-accent/80 font-bold' : ''
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: f.cor }} />
                                                <span className="text-xs">{f.label}</span>
                                              </div>
                                              {isSel && <Check size={12} className="text-primary shrink-0" />}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}

                                {compCfg && (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${compCfg.bgClass}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: compCfg.cor }} />
                                    {compCfg.label}
                                  </span>
                                )}

                                {/* Tag Tipo de Demanda (ex: P. DO ZERO, A. COR, etc) */}
                                {tipoCfg ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                                        <button
                                          type="button"
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold tracking-tight shadow-2xs transition hover:opacity-80 cursor-pointer disabled:cursor-default ${tipoCfg.bgClass}`}
                                          title={tipoCfg ? `${tipoCfg.nomeCompleto} - ${tipoCfg.descricao}` : ''}
                                        >
                                          <span
                                            className="h-1.5 w-1.5 rounded-full mr-1 shrink-0"
                                            style={{ backgroundColor: tipoCfg.cor }}
                                          />
                                          <span>{tipoCfg.curto}</span>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="min-w-[200px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Tipo de Demanda
                                        </div>
                                        {TIPOS_DEMANDA.map((t) => {
                                          const isSel = tipoCfg?.valor === t.valor;
                                          return (
                                            <DropdownMenuItem
                                              key={t.valor}
                                              onClick={() => onQuickUpdate?.(demanda, { tipo_demanda: t.valor })}
                                              className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex flex-col items-start rounded-lg transition-colors my-0.5 ${
                                                isSel ? 'bg-accent/80 font-bold' : ''
                                              }`}
                                            >
                                              <div className="w-full flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                                                  <span className="font-semibold text-xs text-foreground">{t.curto}</span>
                                                </div>
                                                {isSel && <Check size={12} className="text-primary shrink-0" />}
                                              </div>
                                              <span className="text-[10px] text-muted-foreground pl-3.5 font-normal">
                                                {t.nomeCompleto}
                                              </span>
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                ) : canEdit && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-dashed border-border/80 text-[10px] font-medium text-muted-foreground/60 hover:text-foreground hover:border-border transition cursor-pointer"
                                          title="Definir tipo de demanda"
                                        >
                                          + Demanda
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="min-w-[200px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Tipo de Demanda
                                        </div>
                                        {TIPOS_DEMANDA.map((t) => (
                                          <DropdownMenuItem
                                            key={t.valor}
                                            onClick={() => onQuickUpdate?.(demanda, { tipo_demanda: t.valor })}
                                            className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex flex-col items-start rounded-lg transition-colors my-0.5"
                                          >
                                            <div className="w-full flex items-center gap-1.5">
                                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                                              <span className="font-semibold text-xs text-foreground">{t.curto}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground pl-3.5 font-normal">
                                              {t.nomeCompleto}
                                            </span>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>

                              {/* Linha 5: Prazo, Avatares e Concluir rápido */}
                              <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/40 text-[11px]">
                                {/* Prazo */}
                                <div className="flex items-center gap-1 min-w-0">
                                  {demanda.prazo ? (
                                    alerta === 'entregue' ? (
                                      <span className="font-semibold flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400" title="Arte entregue em revisão">
                                        <CheckCircle2 size={11} className="shrink-0" />
                                        <span className="truncate">
                                          Entregue · {formatarPrazo(obterDataEntregaRevisao(demanda) || demanda.prazo)}
                                        </span>
                                      </span>
                                    ) : alerta === 'congelado' ? (
                                      <span className="font-semibold flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400" title="Prazo congelado/pausado">
                                        <PauseCircle size={11} className="shrink-0" />
                                        <span className="truncate">
                                          Pausado · {formatarPrazo(demanda.prazo)}
                                        </span>
                                      </span>
                                    ) : (
                                      <span
                                        className={`font-semibold flex items-center gap-1 text-[10px] ${
                                          alerta === 'hoje'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : alerta === 'vencido'
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {alerta === 'vencido' ? (
                                          <AlertTriangle size={11} className="shrink-0" />
                                        ) : (
                                          <Calendar size={11} className="shrink-0 opacity-75" />
                                        )}
                                        <span className="truncate">
                                          {alerta === 'hoje' ? 'Hoje' : formatarPrazo(demanda.prazo) || demanda.prazo}
                                        </span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground/40 text-[10px] italic">Sem prazo</span>
                                  )}
                                </div>

                                {/* Avatares D / V */}
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {demanda.designer ? (
                                    <UserAvatar
                                      name={demanda.designer}
                                      src={designerObj?.avatar_url}
                                      size="xs"
                                      className="ring-1 ring-background shadow-2xs"
                                      title={`Designer: ${demanda.designer}`}
                                    />
                                  ) : (
                                    <div
                                      className="w-4 h-4 rounded-full border border-dashed border-border flex items-center justify-center text-[8px] text-muted-foreground/50 font-bold"
                                      title="Sem designer"
                                    >
                                      D
                                    </div>
                                  )}

                                  {demanda.vendedor ? (
                                    <UserAvatar
                                      name={demanda.vendedor}
                                      src={vendedorObj?.avatar_url}
                                      size="xs"
                                      className="ring-1 ring-background shadow-2xs"
                                      title={`Vendedor: ${demanda.vendedor}`}
                                    />
                                  ) : (
                                    <div
                                      className="w-4 h-4 rounded-full border border-dashed border-border flex items-center justify-center text-[8px] text-muted-foreground/50 font-bold"
                                      title="Sem vendedor"
                                    >
                                      V
                                    </div>
                                  )}

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onConcluir?.(demanda);
                                      }}
                                      className="ml-1 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                                      title="Concluir demanda"
                                    >
                                      <Check size={12} className="stroke-[2.5]" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </div>
  );
}
