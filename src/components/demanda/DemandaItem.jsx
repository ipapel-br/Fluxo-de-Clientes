import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  Check,
  CheckCircle2,
  PauseCircle,
  Printer,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  History,
  Plus,
  ArrowUpToLine,
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  tipoAlertaPrazo,
  formatarPrazo,
  obterDataEntregaRevisao,
  isStatusAmostra,
  isStatusCriacao,
  isStatusRevisao,
  isStatusPausa,
  isStatusSemBriefing,
  calcularPrazoFuturo,
} from '@/lib/datas';
import { faseArteConfig, FASES_ARTE } from '@/lib/progressoArte';
import { COMPLEXIDADES, complexidadeConfig } from '@/lib/complexidade';
import { TIPOS_DEMANDA, tipoDemandaConfig } from '@/lib/tiposDemanda';
import { getStatusColor, getStatusBadgeStyle } from '@/lib/statusColors';
import { useAuth } from '@/contexts/AuthContext';

export default function DemandaItem({
  demanda,
  status,
  statuses = [],
  vendedores = [],
  revendas = [],
  designers = [],
  index,
  onEdit,
  onDelete,
  onConcluir,
  onEnviarParaImpressao,
  onQuickUpdate,
  onRegistrarAlteracao,
  onDuplicar,
  onVerHistorico,
  onDefinirComoPrioridade,
  onSelectRow,
  isSelected = false,
  isBulkSelected = false,
  onToggleBulkSelect,
  dragDisabled,
  destaque,
  viewMode = 'lista',
}) {
  const { can } = useAuth();
  const [prazoPopoverOpen, setPrazoPopoverOpen] = useState(false);
  const [isEditingTexto, setIsEditingTexto] = useState(false);
  const [textoEdit, setTextoEdit] = useState(demanda.demanda || '');

  const canEdit = can('priority_edit');
  const canReorder = can('priority_reorder');

  function handleSaveTexto() {
    setIsEditingTexto(false);
    const novoValor = textoEdit.trim();
    if (novoValor !== (demanda.demanda || '').trim()) {
      if (onRegistrarAlteracao) {
        onRegistrarAlteracao(demanda, novoValor);
      } else {
        onQuickUpdate?.(demanda, { demanda: novoValor });
      }
    }
  }

  function handleCancelTexto() {
    setIsEditingTexto(false);
    setTextoEdit(demanda.demanda || '');
  }

  // Identificação de prioridade e prazo
  const prioridadeValor = (demanda.etiqueta || '').toLowerCase();
  const alerta = tipoAlertaPrazo(demanda.prazo, status || demanda);
  const faseArteCfg = faseArteConfig(demanda.fase_arte);

  // Formatação do Prazo e Status
  const prazoTexto = (() => {
    if (alerta === 'entregue') {
      const dataEntregue = obterDataEntregaRevisao(demanda) || demanda.prazo;
      return {
        data: dataEntregue ? formatarPrazo(dataEntregue) : 'Entregue',
        status: 'Entregue',
        isEntregue: true,
      };
    }
    if (alerta === 'congelado') {
      return {
        data: demanda.prazo ? formatarPrazo(demanda.prazo) : 'Pausado',
        status: 'Pausado',
        isCongelado: true,
      };
    }
    if (!demanda.prazo) return null;
    if (alerta === 'hoje') return { data: 'Hoje', status: null, isHoje: true };
    if (alerta === 'vencido') return { data: formatarPrazo(demanda.prazo) || demanda.prazo, status: 'Vencido', isVencido: true };
    if (alerta === 'amanha') return { data: 'Amanhã', status: null };
    return { data: formatarPrazo(demanda.prazo) || demanda.prazo, status: null };
  })();

  const prazoDate = (() => {
    if (!demanda.prazo) return undefined;
    const parts = String(demanda.prazo).split('-');
    if (parts.length !== 3) return undefined;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  })();

  function handleSelectPrazo(date) {
    if (!date) {
      onQuickUpdate?.(demanda, { prazo: '' });
    } else {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      onQuickUpdate?.(demanda, { prazo: `${y}-${m}-${d}` });
    }
    setPrazoPopoverOpen(false);
  }

  // Nome da etapa (Fase da arte exclusiva)
  const nomeEtapa = faseArteCfg?.label || 'Iniciando arte';
  const corEtapa = faseArteCfg?.cor || '#0284c7';

  const isImpressao =
    (status?.nome || '').toLowerCase().includes('impress') ||
    (demanda.demanda || '').toLowerCase().includes('impress') ||
    demanda.factory_status === 'aguardando' ||
    demanda.factory_status === 'em_impressao' ||
    demanda.status_id === 'status_impressao';

  // Subtítulo secundário abaixo do nome do cliente (Briefing / Orientação ou Bitrix)
  const subtituloDemanda = demanda.demanda && demanda.demanda.trim()
    ? demanda.demanda.trim()
    : (demanda.bitrix_id ? `Bitrix #${demanda.bitrix_id}` : null);

  const designerObj = designers.find((d) => (d.nome || d.value || d.label) === demanda.designer);
  const vendedorObj = vendedores.find((v) => (v.nome || v.value || v.label) === demanda.vendedor);
  const designerAvatar = designerObj?.avatar_url || '';
  const vendedorAvatar = vendedorObj?.avatar_url || '';

  const numFormatado = String(index + 1).padStart(2, '0');

  return (
    <Draggable draggableId={demanda.id} index={index} isDragDisabled={dragDisabled || !canReorder}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(canReorder && !dragDisabled ? provided.dragHandleProps : {})}
          onClick={() => onSelectRow?.(demanda)}
          className={`group relative flex items-center min-h-[68px] sm:min-h-[74px] px-3 sm:px-4 py-2 border-b border-border/60 transition-colors duration-150 select-none cursor-pointer ${
            isSelected
              ? 'bg-muted/80 border-primary/20'
              : 'bg-card hover:bg-muted/40'
          } ${
            snapshot.isDragging ? 'bg-card shadow-2xl z-50 ring-1 ring-border rounded-lg' : ''
          }`}
        >
          {/* Destaque discreto na lateral esquerda apenas para a prioridade ativa (sem filtros) ou selecionada */}
          {(destaque || isSelected) && (
            <div
              className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-xs ${
                isSelected
                  ? 'bg-primary shadow-[0_0_8px_rgba(0,0,0,0.15)] dark:shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                  : 'bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.3)]'
              }`}
            />
          )}

          {/* Grid de Colunas */}
          <div className="w-full grid grid-cols-12 items-center gap-2 sm:gap-4 text-xs">
            
            {/* Coluna 1: # (Número) + Checkbox para Ações em Massa (Suporta tecla Shift para seleção em intervalo) */}
            <div
              className="col-span-1 sm:col-span-1 flex items-center gap-1.5 min-w-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Checkbox
                checked={isBulkSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBulkSelect?.(demanda.id, !isBulkSelected, e.shiftKey);
                }}
                className="h-3.5 w-3.5 rounded border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-pointer"
                title="Selecionar demanda (Shift + clique para selecionar intervalo)"
              />
              <span className="font-mono text-[12px] font-bold text-muted-foreground/80 tabular-nums select-none">
                {numFormatado}
              </span>
            </div>

            {/* Coluna 2: PRIORIDADE (Edição Direta) */}
            <div className="col-span-2 sm:col-span-1 flex items-center min-w-0" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!canEdit}>
                  <button
                    type="button"
                    className="group/prio flex items-center gap-0.5 text-left font-bold text-[11px] uppercase tracking-wide hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                  >
                    {prioridadeValor === 'urgente' ? (
                      <span className="text-rose-500">URGENTE</span>
                    ) : prioridadeValor === 'alta' ? (
                      <span className="text-[#f97316]">ALTA</span>
                    ) : (
                      <span className="text-muted-foreground/70 font-medium">ROTINA</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-xl">
                  <DropdownMenuItem onClick={() => onQuickUpdate?.(demanda, { etiqueta: 'Urgente' })} className="text-xs text-rose-500 dark:text-rose-400 font-bold py-1.5 px-2 cursor-pointer hover:bg-accent">
                    URGENTE
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQuickUpdate?.(demanda, { etiqueta: 'Alta' })} className="text-xs text-[#f97316] font-bold py-1.5 px-2 cursor-pointer hover:bg-accent">
                    ALTA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQuickUpdate?.(demanda, { etiqueta: 'Rotina' })} className="text-xs text-muted-foreground font-medium py-1.5 px-2 cursor-pointer hover:bg-accent">
                    ROTINA
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Coluna 3: CLIENTE */}
            <div className="col-span-3 sm:col-span-3 min-w-0 pr-2">
              <div
                onClick={() => canEdit && onEdit?.(demanda)}
                className="font-bold text-sm text-foreground truncate hover:text-primary cursor-pointer transition leading-tight"
                title={demanda.cliente}
              >
                {demanda.cliente}
              </div>

              {isEditingTexto ? (
                <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    autoFocus
                    value={textoEdit}
                    onChange={(e) => setTextoEdit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTexto();
                      if (e.key === 'Escape') handleCancelTexto();
                    }}
                    onBlur={handleSaveTexto}
                    placeholder="Descreva a alteração..."
                    className="w-full text-[11px] h-6 px-1.5 py-0.5 rounded bg-background border border-primary text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs font-medium"
                  />
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    if (!canEdit) return;
                    e.stopPropagation();
                    setIsEditingTexto(true);
                    setTextoEdit(demanda.demanda || '');
                  }}
                  className="group/sub flex items-center gap-1 text-[11px] text-muted-foreground/80 truncate mt-0.5 hover:text-foreground cursor-pointer transition-colors py-0.5 px-1 -mx-1 rounded hover:bg-muted/70"
                  title={canEdit ? 'Clique para editar o texto/orientação' : subtituloDemanda || ''}
                >
                  <span className="truncate">
                    {demanda.demanda && demanda.demanda.trim()
                      ? demanda.demanda.trim()
                      : (demanda.bitrix_id ? `Bitrix #${demanda.bitrix_id}` : (canEdit ? '+ Adicionar orientação' : '—'))}
                  </span>
                  {canEdit && (
                    <Pencil size={10} className="opacity-0 group-hover/sub:opacity-80 transition-opacity shrink-0 text-muted-foreground ml-0.5" />
                  )}
                </div>
              )}
            </div>

            {/* Coluna 4: PRAZO (Edição Direta via Calendar Popover) */}
            <div className="col-span-2 sm:col-span-1 flex flex-col justify-center min-w-0 leading-tight" onClick={(e) => e.stopPropagation()}>
              <Popover open={prazoPopoverOpen} onOpenChange={setPrazoPopoverOpen}>
                <PopoverTrigger asChild disabled={!canEdit}>
                  <button
                    type="button"
                    className="flex flex-col text-left hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                  >
                    {prazoTexto ? (
                      <>
                        <span
                          className={`font-semibold text-xs ${
                            prazoTexto.isEntregue
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : prazoTexto.isCongelado
                              ? 'text-amber-600 dark:text-amber-400'
                              : prazoTexto.isHoje
                              ? 'text-amber-600 dark:text-amber-400'
                              : prazoTexto.isVencido
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {prazoTexto.data}
                        </span>
                        {prazoTexto.status && (
                          <span
                            className={`text-[10px] font-medium flex items-center gap-0.5 ${
                              prazoTexto.isEntregue
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : prazoTexto.isCongelado
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {prazoTexto.isEntregue && <CheckCircle2 size={10} className="shrink-0" />}
                            {prazoTexto.isCongelado && <PauseCircle size={10} className="shrink-0" />}
                            {prazoTexto.status}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="start">
                  <Calendar
                    mode="single"
                    selected={prazoDate}
                    onSelect={handleSelectPrazo}
                    locale={ptBR}
                    initialFocus
                    className="bg-popover text-popover-foreground rounded-lg"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Coluna 5: STATUS (Edição Direta via Menu de Status da Fila com cores destacadas) */}
            <div className="hidden lg:flex lg:col-span-1 items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!canEdit}>
                  <button
                    type="button"
                    className="text-left hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:cursor-default max-w-full truncate"
                  >
                    {status ? (
                      <span
                        style={getStatusBadgeStyle(status)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs hover:brightness-110 transition-all max-w-full truncate"
                        title={status.descricao || (status.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : status.nome)}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                          style={{ backgroundColor: getStatusColor(status) }}
                        />
                        <span className="truncate">{status.nome}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground/60 italic">—</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[190px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Alterar Status
                  </div>
                  {statuses.map((st) => {
                    const cor = getStatusColor(st);
                    const isSelected = status?.id === st.id;
                    return (
                      <DropdownMenuItem
                        key={st.id}
                        title={st.descricao || (st.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : status.nome)}
                        onClick={() => {
                          const patch = { status_id: st.id };
                          const ehSemBriefing = isStatusSemBriefing(st) || isStatusSemBriefing(status);
                          if (!ehSemBriefing && (isStatusAmostra(st) || isStatusCriacao(st))) {
                            patch.prazo = calcularPrazoFuturo(1);
                            patch.entregue_em = null;
                          } else if (isStatusRevisao(st)) {
                            const hoje = new Date();
                            const y = hoje.getFullYear();
                            const m = String(hoje.getMonth() + 1).padStart(2, '0');
                            const d = String(hoje.getDate()).padStart(2, '0');
                            patch.entregue_em = hoje.toISOString();
                            patch.prazo = `${y}-${m}-${d}`;
                          }
                          onQuickUpdate?.(demanda, patch);
                        }}
                        className={`text-xs py-2 px-2.5 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                          isSelected ? 'bg-accent/80 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: cor }}
                          />
                          <span style={{ color: isSelected ? cor : undefined }}>{st.nome}</span>
                        </div>
                        {isSelected && <Check size={13} className="ml-2 shrink-0" style={{ color: cor }} />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Coluna 5.5: DEMANDA (Tipo de Demanda: A. COR, REDIMENSIONAR, P. DO ZERO, SHUTTER/BANCO) */}
            <div className="hidden lg:flex lg:col-span-1 items-center min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const tipoCfg = tipoDemandaConfig(demanda.tipo_demanda || demanda.demanda);
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="group/tipo flex items-center gap-1 text-left transition cursor-pointer disabled:cursor-default max-w-full truncate hover:opacity-85"
                        title={tipoCfg ? `${tipoCfg.nomeCompleto} - ${tipoCfg.descricao}` : (canEdit ? 'Definir tipo de demanda' : 'Sem tipo definido')}
                      >
                        {tipoCfg ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold tracking-tight truncate shadow-2xs ${tipoCfg.bgClass}`}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full mr-1 shrink-0"
                              style={{ backgroundColor: tipoCfg.cor }}
                            />
                            <span className="truncate">{tipoCfg.curto}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground/50 hover:text-muted-foreground italic truncate">
                            {canEdit ? '+ Tipo' : '—'}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[210px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tipo de Demanda
                      </div>
                      {TIPOS_DEMANDA.map((t) => {
                        const isSelected = tipoCfg?.valor === t.valor;
                        return (
                          <DropdownMenuItem
                            key={t.valor}
                            onClick={() => onQuickUpdate?.(demanda, { tipo_demanda: t.valor })}
                            className={`text-xs py-2 px-2.5 cursor-pointer hover:bg-accent flex flex-col items-start rounded-lg transition-colors my-0.5 ${
                              isSelected ? 'bg-accent/80 font-bold' : ''
                            }`}
                            title={t.descricao}
                          >
                            <div className="w-full flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                                <span className="font-semibold text-xs text-foreground">{t.curto}</span>
                              </div>
                              {isSelected && <Check size={13} className="text-primary shrink-0" />}
                            </div>
                            <span className="text-[10px] text-muted-foreground pl-4 font-normal mt-0.5">
                              {t.nomeCompleto}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}
            </div>

            {/* Coluna 6: ETAPA (Edição Direta via Menu de Fases da Arte) */}
            <div className="hidden md:flex md:col-span-2 lg:col-span-1 items-center gap-1.5 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!canEdit}>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-left hover:opacity-80 transition cursor-pointer disabled:cursor-default max-w-full truncate"
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: corEtapa }} />
                    <span className="text-xs font-medium text-foreground truncate" title={nomeEtapa}>
                      {faseArteCfg?.curto || nomeEtapa}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-max min-w-[140px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-xl">
                  {FASES_ARTE.map((f) => (
                    <DropdownMenuItem
                      key={f.valor}
                      onClick={() => onQuickUpdate?.(demanda, { fase_arte: f.valor })}
                      className="text-xs py-1.5 px-2.5 cursor-pointer hover:bg-accent flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.cor }} />
                      <span>{f.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Coluna 7: COMPLEXIDADE (Edição Direta via Dropdown com badges coloridas) */}
            <div className="hidden md:flex md:col-span-2 lg:col-span-1 items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const compCfg = complexidadeConfig(demanda.complexidade || 'normal');
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="group/comp flex items-center gap-1 text-left transition cursor-pointer disabled:cursor-default max-w-full truncate hover:opacity-80"
                      >
                        {compCfg ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold truncate shadow-2xs ${compCfg.bgClass}`}
                            title={`Complexidade: ${compCfg.label}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: compCfg.cor }} />
                            {compCfg.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[140px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-xl">
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Complexidade
                      </div>
                      {COMPLEXIDADES.map((c) => {
                        const isSelected = (demanda.complexidade || 'normal').toLowerCase() === c.valor;
                        return (
                          <DropdownMenuItem
                            key={c.valor}
                            onClick={() => onQuickUpdate?.(demanda, { complexidade: c.valor })}
                            className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between rounded-md transition ${
                              isSelected ? 'bg-accent font-bold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />
                              <span>{c.label}</span>
                            </div>
                            {isSelected && <Check size={12} className="text-primary" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}
            </div>

            {/* Coluna 8: D / V (Designer e Vendedor com Avatares e Tooltips) */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-start gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              {/* Designer Avatar */}
              {demanda.designer ? (
                <div
                  className="cursor-pointer transition-transform hover:scale-115 active:scale-95 shrink-0"
                  title={`Designer: ${demanda.designer}`}
                >
                  <UserAvatar
                    name={demanda.designer}
                    src={designerAvatar}
                    size="xs"
                    className="ring-1 ring-background shadow-xs hover:ring-primary"
                  />
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full border border-dashed border-border/80 flex items-center justify-center text-[9px] text-muted-foreground/50 font-semibold select-none shrink-0"
                  title="Sem designer atribuído"
                >
                  D
                </div>
              )}

              {/* Vendedor Avatar */}
              {demanda.vendedor ? (
                <div
                  className="cursor-pointer transition-transform hover:scale-115 active:scale-95 shrink-0"
                  title={`Vendedor: ${demanda.vendedor}`}
                >
                  <UserAvatar
                    name={demanda.vendedor}
                    src={vendedorAvatar}
                    size="xs"
                    className="ring-1 ring-background shadow-xs hover:ring-emerald-500"
                  />
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full border border-dashed border-border/80 flex items-center justify-center text-[9px] text-muted-foreground/50 font-semibold select-none shrink-0"
                  title="Sem vendedor atribuído"
                >
                  V
                </div>
              )}
            </div>

            {/* Coluna 8: AÇÕES (Aparência discreta, alinhada e sem cortes) */}
            <div className="col-span-3 sm:col-span-3 md:col-span-2 lg:col-span-1 xl:col-span-1 flex items-center justify-end gap-1.5 ml-auto shrink-0 flex-nowrap pr-0.5">
              
              {/* Botão Imprimir (Disponível em todas as demandas) */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnviarParaImpressao?.(demanda);
                  }}
                  className="h-7 w-7 rounded-md bg-secondary/80 border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer shrink-0"
                  title="Enviar para Impressão"
                >
                  <Printer size={13} />
                </Button>
              )}

              {/* Botão/Check de Concluir */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConcluir?.(demanda);
                  }}
                  className="h-7 w-7 rounded-md bg-secondary/80 border-border text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-secondary cursor-pointer shrink-0"
                  title="Concluir demanda"
                >
                  <Check size={13} className="stroke-[2.5]" />
                </Button>
              )}

              {/* Botão de Menu Overflow "..." */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md bg-secondary/80 border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer shrink-0"
                  >
                    <MoreHorizontal size={13} />
                  </Button>
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
        </div>
      )}
    </Draggable>
  );
}