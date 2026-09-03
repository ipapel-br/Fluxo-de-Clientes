import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  PauseCircle,
  Printer,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  SlidersHorizontal,
  Send,
  MessageSquare,
  Clock,
  ArrowRight,
  ArrowUpToLine,
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  tipoAlertaPrazo,
  formatarPrazo,
  isStatusAmostra,
  isStatusCriacao,
  isStatusPausa,
  calcularPrazoFuturo,
} from '@/lib/datas';
import { formatarDataHistorico } from '@/lib/historico';
import { faseArteConfig, FASES_ARTE } from '@/lib/progressoArte';
import { COMPLEXIDADES, complexidadeConfig } from '@/lib/complexidade';
import { TIPOS_DEMANDA, tipoDemandaConfig } from '@/lib/tiposDemanda';
import { getStatusColor, getStatusBadgeStyle } from '@/lib/statusColors';
import { ACABAMENTOS, acabamentoConfig } from '@/lib/acabamentos';
import { useAuth } from '@/contexts/AuthContext';

export default function DemandaDrawer({
  demanda,
  status,
  statuses = [],
  designers = [],
  vendedores = [],
  revendas = [],
  index = 0,
  initialTab = 'detalhes',
  initialSubTab = 'todas',
  onClose,
  onConcluir,
  onEnviarParaImpressao,
  onDelete,
  onDuplicar,
  onRegistrarAlteracao,
  onQuickUpdate,
  onDefinirComoPrioridade,
}) {
  const { can, usuario } = useAuth();
  const canEdit = can('priority_edit');
  const canReorder = can('priority_reorder');
  const [activeTab, setActiveTab] = useState(initialTab || 'detalhes'); // 'detalhes' | 'alteracoes'
  const [abaAlteracoesFiltro, setAbaAlteracoesFiltro] = useState(initialSubTab || 'todas'); // 'todas' | 'prazos'

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialSubTab) setAbaAlteracoesFiltro(initialSubTab);
  }, [demanda?.id, initialTab, initialSubTab]);
  const [prazoPopoverHeaderOpen, setPrazoPopoverHeaderOpen] = useState(false);
  const [prazoPopoverDetalhesOpen, setPrazoPopoverDetalhesOpen] = useState(false);
  const [novaAlteracaoTexto, setNovaAlteracaoTexto] = useState('');
  const [diasAdicionarPrazo, setDiasAdicionarPrazo] = useState(0);
  const [estenderPrazoAberto, setEstenderPrazoAberto] = useState(false);
  const [isEditingDemandaTexto, setIsEditingDemandaTexto] = useState(false);
  const [demandaTextoInput, setDemandaTextoInput] = useState(demanda?.demanda || '');
  const [isEditingCliente, setIsEditingCliente] = useState(false);
  const [clienteInput, setClienteInput] = useState(demanda?.cliente || '');
  const [isEditingBitrix, setIsEditingBitrix] = useState(false);
  const [bitrixInput, setBitrixInput] = useState(demanda?.bitrix_id || '');

  // Previsão calculada do novo prazo ao estender dias (Hook antes de retornos condicionais)
  const previewNovoPrazo = useMemo(() => {
    if (!demanda || diasAdicionarPrazo === 0) return null;
    const base = demanda.prazo ? new Date(demanda.prazo + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + diasAdicionarPrazo);
    const d = String(base.getDate()).padStart(2, '0');
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const y = base.getFullYear();
    return `${d}/${m}/${y}`;
  }, [demanda, diasAdicionarPrazo]);

  if (!demanda) return null;

  // Formatação do número da demanda
  const numFormatado = String(index + 1).padStart(2, '0');

  // Identificação de prioridade e prazo
  const prioridadeValor = (demanda.etiqueta || '').toLowerCase();
  const alerta = tipoAlertaPrazo(demanda.prazo, status || demanda);
  const faseArteCfg = faseArteConfig(demanda.fase_arte);
  const acabamentoCfg = acabamentoConfig(demanda.acabamento || 'Autocolante');

  const prazoTexto = (() => {
    if (alerta === 'entregue') {
      return {
        data: demanda.prazo ? formatarPrazo(demanda.prazo) : 'Entregue',
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
    setPrazoPopoverHeaderOpen(false);
    setPrazoPopoverDetalhesOpen(false);
  }

  function handleSaveDemandaTexto() {
    setIsEditingDemandaTexto(false);
    const novoValor = demandaTextoInput.trim();
    if (novoValor !== (demanda.demanda || '').trim()) {
      if (onRegistrarAlteracao) {
        onRegistrarAlteracao(demanda, novoValor);
      } else {
        onQuickUpdate?.(demanda, { demanda: novoValor });
      }
    }
  }

  function handleSubmeterNovaAlteracao() {
    if (!novaAlteracaoTexto.trim()) return;

    let novoPrazo = null;
    if (diasAdicionarPrazo !== 0) {
      const base = demanda.prazo ? new Date(demanda.prazo + 'T12:00:00') : new Date();
      base.setDate(base.getDate() + diasAdicionarPrazo);
      const y = base.getFullYear();
      const m = String(base.getMonth() + 1).padStart(2, '0');
      const d = String(base.getDate()).padStart(2, '0');
      novoPrazo = `${y}-${m}-${d}`;
    }

    onRegistrarAlteracao?.(demanda, novaAlteracaoTexto.trim(), {
      novoPrazo,
      diasAjustados: diasAdicionarPrazo,
    });
    setNovaAlteracaoTexto('');
    setDiasAdicionarPrazo(0);
    setEstenderPrazoAberto(false);
  }

  const nomeEtapa = faseArteCfg?.label || 'Iniciando arte';
  const corEtapa = faseArteCfg?.cor || '#0284c7';

  // Filtro de todas as alterações / orientações registradas para esta demanda
  const alteracoesHistorico = (demanda.historico || []).filter(
    (h) => h.tipo === 'situacao' || h.tipo === 'SITUACAO' || h.tipo === 'alteracao' || (!h.tipo && h.texto)
  );

  // Histórico dedicado apenas de alterações / prorrogações de prazos
  const historicoPrazos = (demanda.historico || []).filter(
    (h) => h.tipo === 'prazo' || h.prazo_novo || h.prazo_antigo
  );

  // Atividades / Timeline geral
  const itensAtividade = (demanda.historico && demanda.historico.length > 0)
    ? demanda.historico.slice(0, 5).map((h, i) => ({
        id: i,
        data: h.data ? formatarDataHistorico(h.data) : 'Hoje',
        titulo: h.descricao || (h.usuario?.nome ? `${h.usuario.nome} realizou uma alteração` : h.autor ? `${h.autor} realizou uma alteração` : 'Atualização'),
        subtitulo: h.texto || h.descricao || null,
        cor: i === 0 ? 'bg-sky-400' : i === 1 ? 'bg-purple-400' : 'bg-muted-foreground/40',
      }))
    : [];

  return (
    <aside className="w-full sm:w-[440px] md:w-[470px] shrink-0 border-l border-border bg-card flex flex-col justify-between h-full max-h-full min-h-0 overflow-hidden animate-in slide-in-from-right-3 duration-150 shadow-xl z-20 select-none">
      
      {/* Conteúdo Superior com Scroll Interno */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* 1. Cabeçalho do Drawer: Número + Nome do Cliente + Botão de fechar */}
        <div className="px-5 pt-4 pb-3 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
              <span className="font-mono text-sm font-semibold text-muted-foreground/70 tabular-nums shrink-0">
                {numFormatado}
              </span>
              {isEditingCliente ? (
                <input
                  type="text"
                  autoFocus
                  value={clienteInput}
                  onChange={(e) => setClienteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingCliente(false);
                      if (clienteInput.trim() && clienteInput.trim() !== demanda.cliente) {
                        onQuickUpdate?.(demanda, { cliente: clienteInput.trim() });
                      }
                    }
                    if (e.key === 'Escape') {
                      setIsEditingCliente(false);
                      setClienteInput(demanda.cliente || '');
                    }
                  }}
                  onBlur={() => {
                    setIsEditingCliente(false);
                    if (clienteInput.trim() && clienteInput.trim() !== demanda.cliente) {
                      onQuickUpdate?.(demanda, { cliente: clienteInput.trim() });
                    }
                  }}
                  className="w-full text-base font-bold px-2 py-0.5 rounded bg-background border border-primary text-foreground focus:outline-none"
                />
              ) : (
                <div
                  onClick={() => {
                    if (!canEdit) return;
                    setIsEditingCliente(true);
                    setClienteInput(demanda.cliente || '');
                  }}
                  className="group/title flex items-center gap-1.5 min-w-0 cursor-pointer"
                  title={canEdit ? 'Clique para editar o nome do cliente' : ''}
                >
                  <h2 className="font-bold text-base text-foreground leading-snug truncate" title={demanda.cliente}>
                    {demanda.cliente}
                  </h2>
                  {canEdit && (
                    <Pencil size={12} className="opacity-0 group-hover/title:opacity-100 text-muted-foreground shrink-0 transition" />
                  )}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md shrink-0 cursor-pointer -mt-1 -mr-1"
              title="Fechar detalhes"
              aria-label="Fechar detalhes"
            >
              <X size={15} />
            </Button>
          </div>

          {/* Linha compacta: Prazo, Status e Prioridade */}
          <div className="flex items-center gap-2 mt-2 pt-1 text-xs text-muted-foreground flex-wrap">
            {/* Prazo */}
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-muted-foreground/70 shrink-0" />
              <Popover open={prazoPopoverHeaderOpen} onOpenChange={setPrazoPopoverHeaderOpen}>
                <PopoverTrigger asChild disabled={!canEdit}>
                  <button
                    type="button"
                    className="font-medium text-foreground/90 hover:text-primary transition cursor-pointer disabled:cursor-default inline-flex items-center gap-1"
                    title={canEdit ? 'Clique para alterar o prazo' : ''}
                  >
                    {prazoTexto ? (
                      <span className={prazoTexto.isEntregue ? 'text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1' : prazoTexto.isCongelado ? 'text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-1' : prazoTexto.isHoje ? 'text-amber-500 font-semibold' : prazoTexto.isVencido ? 'text-rose-500 font-semibold' : ''}>
                        {prazoTexto.isEntregue && <CheckCircle2 size={11} className="shrink-0" />}
                        {prazoTexto.isCongelado && <PauseCircle size={11} className="shrink-0" />}
                        {prazoTexto.data} {prazoTexto.isEntregue ? '(Entregue)' : prazoTexto.isCongelado ? '(Congelado)' : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic">Sem prazo</span>
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

            <span className="text-border text-xs select-none">•</span>

            {/* Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={!canEdit}>
                <button
                  type="button"
                  className="font-medium hover:opacity-80 transition cursor-pointer disabled:cursor-default inline-flex items-center gap-1"
                  title={canEdit ? 'Alterar status' : ''}
                >
                  {status ? (
                    <span
                      style={getStatusBadgeStyle(status)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.2 text-[11px] font-medium"
                      title={status.descricao || (status.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : status.nome)}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: getStatusColor(status) }}
                      />
                      <span>{status.nome}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 text-[11px]">Aguardando</span>
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
                      title={st.descricao || (st.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : st.nome)}
                      onClick={() => {
                        const patch = { status_id: st.id };
                        if (isStatusAmostra(st) || isStatusCriacao(st)) {
                          patch.prazo = calcularPrazoFuturo(1);
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

            <span className="text-border text-xs select-none">•</span>

            {/* Prioridade */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={!canEdit}>
                <button
                  type="button"
                  className="font-bold text-[10px] uppercase tracking-wider hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                  title={canEdit ? 'Alterar prioridade' : ''}
                >
                  {prioridadeValor === 'urgente' ? (
                    <span className="text-rose-500">Urgente</span>
                  ) : prioridadeValor === 'alta' ? (
                    <span className="text-[#f97316]">Alta</span>
                  ) : (
                    <span className="text-muted-foreground/80">Rotina</span>
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

          {/* Abas Superiores do Drawer: Detalhes x Alterações (Tabs mínimas e alinhadas) */}
          <div className="flex items-center gap-5 mt-3 border-b border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('detalhes')}
              className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                activeTab === 'detalhes'
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Detalhes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alteracoes')}
              className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                activeTab === 'alteracoes'
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare size={13} />
              <span>Alterações</span>
              {alteracoesHistorico.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'alteracoes'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {alteracoesHistorico.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Conteúdo da Aba Ativa: Scrollbar fina e discreta + padding bottom amplo para nunca colidir com o footer */}
        <div className="px-5 py-3 space-y-4 flex-1 overflow-y-auto min-h-0 drawer-scrollbar pb-12">
          {activeTab === 'detalhes' ? (
            <>
              {/* Grupos de Detalhes da Demanda: Ficha contextual compacta */}
              <div className="space-y-4 text-xs">

                {/* GRUPO 1: Prazo e andamento */}
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90 px-1 pb-1 select-none">
                    Prazo e andamento
                  </div>

                  {/* Prioridade */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Prioridade</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-semibold text-xs transition cursor-pointer disabled:cursor-default"
                        >
                          {prioridadeValor === 'urgente' ? (
                            <span className="text-rose-500 font-bold uppercase tracking-wide">Urgente</span>
                          ) : prioridadeValor === 'alta' ? (
                            <span className="text-[#f97316] font-bold uppercase tracking-wide">Alta</span>
                          ) : (
                            <span className="text-foreground font-medium">Rotina</span>
                          )}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[120px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-xl">
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

                  {/* Prazo */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-normal">Prazo</span>
                      {historicoPrazos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('alteracoes');
                            setAbaAlteracoesFiltro('prazos');
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                          title="Ver histórico de alterações deste prazo"
                        >
                          <Clock size={10} />
                          <span>{historicoPrazos.length}</span>
                        </button>
                      )}
                    </div>
                    <Popover open={prazoPopoverDetalhesOpen} onOpenChange={setPrazoPopoverDetalhesOpen}>
                      <PopoverTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs transition cursor-pointer disabled:cursor-default"
                        >
                          {prazoTexto ? (
                            <>
                              <span className={`font-semibold ${prazoTexto.isEntregue ? 'text-emerald-600 dark:text-emerald-400' : prazoTexto.isCongelado ? 'text-amber-600 dark:text-amber-400' : prazoTexto.isHoje ? 'text-amber-500' : prazoTexto.isVencido ? 'text-rose-500' : 'text-foreground'}`}>
                                {prazoTexto.data}
                              </span>
                              {prazoTexto.status && (
                                <span className={`${prazoTexto.isEntregue ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : prazoTexto.isCongelado ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-rose-500'} font-medium text-[11px] inline-flex items-center gap-0.5`}>
                                  {prazoTexto.isEntregue && <CheckCircle2 size={11} className="shrink-0" />}
                                  {prazoTexto.isCongelado && <PauseCircle size={11} className="shrink-0" />}
                                  ({prazoTexto.status})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/50 italic font-normal">Definir prazo</span>
                          )}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="end">
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

                  {/* Etapa */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Etapa</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                        >
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: corEtapa }} />
                          <span>{nomeEtapa}</span>
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[180px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-xl">
                        {FASES_ARTE.map((f) => (
                          <DropdownMenuItem
                            key={f.valor}
                            onClick={() => onQuickUpdate?.(demanda, { fase_arte: f.valor })}
                            className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.cor }} />
                            <span>{f.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Status</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                        >
                          {status ? (
                            <span
                              style={getStatusBadgeStyle(status)}
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs hover:brightness-110 transition-all"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: getStatusColor(status) }}
                              />
                              <span>{status.nome}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">
                              Aguardando
                            </span>
                          )}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[190px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Alterar Status
                        </div>
                        {statuses.map((st) => {
                          const cor = getStatusColor(st);
                          const isSelected = status?.id === st.id;
                          return (
                            <DropdownMenuItem
                              key={st.id}
                              title={st.descricao || (st.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : st.nome)}
                              onClick={() => {
                                const patch = { status_id: st.id };
                                if (isStatusAmostra(st) || isStatusCriacao(st)) {
                                  patch.prazo = calcularPrazoFuturo(1);
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

                  {/* Demanda (Tipo / Briefing do Projeto) */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Demanda</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                          title={tipoDemandaConfig(demanda.tipo_demanda || demanda.demanda)?.descricao || ''}
                        >
                          {(() => {
                            const tipo = tipoDemandaConfig(demanda.tipo_demanda || demanda.demanda);
                            if (tipo) {
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold ${tipo.bgClass}`}>
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tipo.cor }} />
                                  <span>{tipo.curto}</span>
                                </span>
                              );
                            }
                            return <span className="text-muted-foreground font-normal italic">Não definida</span>;
                          })()}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[220px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Tipo de Demanda
                        </div>
                        {TIPOS_DEMANDA.map((t) => {
                          const isSelected = tipoDemandaConfig(demanda.tipo_demanda || demanda.demanda)?.valor === t.valor;
                          return (
                            <DropdownMenuItem
                              key={t.valor}
                              onClick={() => onQuickUpdate?.(demanda, { tipo_demanda: t.valor })}
                              className={`text-xs py-2 px-2.5 cursor-pointer hover:bg-accent flex flex-col items-start rounded-lg transition-colors my-0.5 ${
                                isSelected ? 'bg-accent/80 font-bold' : ''
                              }`}
                            >
                              <div className="w-full flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                                  <span className="font-semibold text-foreground">{t.curto}</span>
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
                  </div>

                  {/* Complexidade (Aparência neutra e limpa) */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Complexidade</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                        >
                          {(() => {
                            const comp = complexidadeConfig(demanda.complexidade);
                            if (comp) {
                              return (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: comp.cor }} />
                                  <span>{comp.label}</span>
                                </span>
                              );
                            }
                            return <span className="text-foreground font-medium">Normal</span>;
                          })()}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Alterar Complexidade
                        </div>
                        {COMPLEXIDADES.map((c) => {
                          const isSelected = (demanda.complexidade || 'normal').toLowerCase() === c.valor;
                          return (
                            <DropdownMenuItem
                              key={c.valor}
                              onClick={() => onQuickUpdate?.(demanda, { complexidade: c.valor })}
                              className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                                isSelected ? 'bg-accent/80 font-bold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />
                                <span>{c.label}</span>
                              </div>
                              {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* GRUPO 2: Responsáveis */}
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90 px-1 pb-1 select-none">
                    Responsáveis
                  </div>

                  {/* Designer */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Designer</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                        >
                          {demanda.designer ? (
                            <>
                              <UserAvatar name={demanda.designer} size="xs" />
                              <span className="font-semibold text-foreground">{demanda.designer}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/50 italic font-normal">Não atribuído</span>
                          )}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[190px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Atribuir Designer
                        </div>
                        <DropdownMenuItem
                          onClick={() => onQuickUpdate?.(demanda, { designer: '' })}
                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent text-muted-foreground rounded-lg"
                        >
                          — Nenhum (Remover)
                        </DropdownMenuItem>
                        {designers.map((d) => {
                          const nome = d.nome || d.value || d.label || d;
                          const isSelected = demanda.designer === nome;
                          return (
                            <DropdownMenuItem
                              key={d.id || nome}
                              onClick={() => onQuickUpdate?.(demanda, { designer: nome })}
                              className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                                isSelected ? 'bg-accent/80 font-semibold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <UserAvatar name={nome} src={d.avatar_url} size="xs" />
                                <span>{nome}</span>
                              </div>
                              {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Vendedor */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Vendedor</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                        >
                          {demanda.vendedor ? (
                            <>
                              <UserAvatar name={demanda.vendedor} size="xs" />
                              <span className="font-semibold text-foreground">{demanda.vendedor}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/50 italic font-normal">Não atribuído</span>
                          )}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[190px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Atribuir Vendedor
                        </div>
                        <DropdownMenuItem
                          onClick={() => onQuickUpdate?.(demanda, { vendedor: '' })}
                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent text-muted-foreground rounded-lg"
                        >
                          — Nenhum (Remover)
                        </DropdownMenuItem>
                        {vendedores.map((v) => {
                          const nome = v.nome || v.value || v.label || v;
                          const isSelected = demanda.vendedor === nome;
                          const revendaVend = v.revenda;
                          return (
                            <DropdownMenuItem
                              key={v.id || nome}
                              onClick={() => {
                                const patch = { vendedor: nome };
                                if (revendaVend && !demanda.revenda) {
                                  patch.revenda = revendaVend;
                                }
                                onQuickUpdate?.(demanda, patch);
                              }}
                              className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                                isSelected ? 'bg-accent/80 font-semibold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <UserAvatar name={nome} src={v.avatar_url} size="xs" />
                                <div className="flex flex-col">
                                  <span className="text-foreground">{nome}</span>
                                  {revendaVend && (
                                    <span className="text-[10px] text-muted-foreground">{revendaVend}</span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* GRUPO 3: Informações comerciais */}
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90 px-1 pb-1 select-none">
                    Informações comerciais
                  </div>

                  {/* Revenda */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Revenda</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                        >
                          {demanda.revenda ? (
                            <>
                              <UserAvatar name={demanda.revenda} size="xs" />
                              <span className="font-semibold text-foreground">{demanda.revenda}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/50 italic font-normal">Sem revenda</span>
                          )}
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[190px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Atribuir Revenda
                        </div>
                        <DropdownMenuItem
                          onClick={() => onQuickUpdate?.(demanda, { revenda: '' })}
                          className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent text-muted-foreground rounded-lg"
                        >
                          — Nenhuma (Direto)
                        </DropdownMenuItem>
                        {revendas.map((r) => {
                          const nome = r.nome || r.value || r.label || r;
                          const isSelected = demanda.revenda === nome;
                          return (
                            <DropdownMenuItem
                              key={r.id || nome}
                              onClick={() => onQuickUpdate?.(demanda, { revenda: nome })}
                              className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                                isSelected ? 'bg-accent/80 font-semibold' : ''
                              }`}
                            >
                              <span>{nome}</span>
                              {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Bitrix */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Bitrix</span>
                    {isEditingBitrix ? (
                      <input
                        type="text"
                        autoFocus
                        value={bitrixInput}
                        onChange={(e) => setBitrixInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingBitrix(false);
                            if (bitrixInput.trim() !== (demanda.bitrix_id || '')) {
                              onQuickUpdate?.(demanda, { bitrix_id: bitrixInput.trim() });
                            }
                          }
                          if (e.key === 'Escape') {
                            setIsEditingBitrix(false);
                            setBitrixInput(demanda.bitrix_id || '');
                          }
                        }}
                        onBlur={() => {
                          setIsEditingBitrix(false);
                          if (bitrixInput.trim() !== (demanda.bitrix_id || '')) {
                            onQuickUpdate?.(demanda, { bitrix_id: bitrixInput.trim() });
                          }
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-background border border-primary text-foreground w-24 text-right focus:outline-none shadow-xs"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) return;
                          setIsEditingBitrix(true);
                          setBitrixInput(demanda.bitrix_id || '');
                        }}
                        className="font-mono text-xs font-semibold text-foreground hover:text-primary transition cursor-pointer flex items-center gap-1"
                        title={canEdit ? 'Clique para editar o ID do Bitrix' : ''}
                      >
                        <span>{demanda.bitrix_id || '18913'}</span>
                        {canEdit && <Pencil size={10} className="text-muted-foreground opacity-0 group-hover:opacity-60 transition" />}
                      </button>
                    )}
                  </div>

                  {/* Acabamento (Aparência textual limpa e sem chip pesado) */}
                  <div className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground font-normal">Acabamento</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!canEdit}>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 font-semibold text-foreground transition cursor-pointer disabled:cursor-default"
                          title="Alterar Acabamento"
                        >
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: acabamentoCfg.cor }} />
                          <span>{acabamentoCfg.label}</span>
                          {canEdit && <ChevronDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 hover:opacity-100 transition" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[180px] p-1.5 bg-popover border-border text-popover-foreground rounded-xl shadow-2xl">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Acabamento (Fábrica)
                        </div>
                        {ACABAMENTOS.map((a) => {
                          const isSelected = (demanda.acabamento || 'Autocolante') === a.id;
                          return (
                            <DropdownMenuItem
                              key={a.id}
                              onClick={() => onQuickUpdate?.(demanda, { acabamento: a.id })}
                              className={`text-xs py-2 px-2.5 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                                isSelected ? 'bg-accent/80 font-semibold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.cor }} />
                                <span>{a.label}</span>
                              </div>
                              {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

              </div>

              {/* Ação rápida para registrar alteração: Ação secundária discreta e clicável */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('alteracoes')}
                  className="w-full py-1.5 px-2.5 rounded-md border border-border/70 bg-secondary/40 hover:bg-secondary/70 text-xs font-medium text-foreground/80 hover:text-foreground shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99]"
                >
                  <Plus size={12} className="opacity-70" />
                  <span>Registrar nova alteração / pedido</span>
                </button>
              </div>

              {/* Seção "ATIVIDADE RESUMIDA" com espaço confortável */}
              <div className="space-y-2.5 pt-2 pb-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90 select-none">
                    Últimas Atividades
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('alteracoes')}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    Ver todas
                  </button>
                </div>

                {itensAtividade.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic py-2 px-1">
                    Nenhuma atividade registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-border/60 pl-4">
                    {itensAtividade.map((item) => (
                      <div key={item.id} className="relative space-y-0.5 text-xs">
                        <div
                          className={`absolute -left-[19px] top-1 h-2 w-2 rounded-full ${item.cor} ring-4 ring-card`}
                        />
                        <div className="text-[10px] text-muted-foreground/70 font-normal">
                          {item.data}
                        </div>
                        <div className="font-medium text-foreground leading-tight">
                          {item.titulo}
                        </div>
                        {item.subtitulo && (
                          <div className="text-[11px] text-muted-foreground leading-relaxed">
                            {item.subtitulo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Aba: ALTERAÇÕES E PEDIDOS DO CLIENTE + HISTÓRICO DE PRAZOS */
            <div className="space-y-4">

              {/* Orientação Atual / Briefing da Demanda */}
              <div className="pb-3 border-b border-border/40">
                {isEditingDemandaTexto ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={demandaTextoInput}
                      onChange={(e) => setDemandaTextoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDemandaTexto();
                        if (e.key === 'Escape') {
                          setIsEditingDemandaTexto(false);
                          setDemandaTextoInput(demanda.demanda || '');
                        }
                      }}
                      onBlur={handleSaveDemandaTexto}
                      placeholder="Orientação / Briefing da demanda..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-background border border-primary text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium shadow-xs"
                    />
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                      <span>Pressione <strong className="text-foreground">Enter</strong> para salvar ou <strong className="text-foreground">Esc</strong> para cancelar</span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (!canEdit) return;
                      setIsEditingDemandaTexto(true);
                      setDemandaTextoInput(demanda.demanda || '');
                    }}
                    className="group/desc flex items-baseline justify-between gap-2 py-1 px-1.5 -mx-1.5 rounded-md hover:bg-muted/50 transition cursor-pointer"
                    title={canEdit ? 'Clique para editar a orientação' : ''}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90 block mb-1 select-none">
                        Orientação atual
                      </span>
                      <p className="text-xs text-foreground/90 leading-relaxed break-words font-normal">
                        {demanda.demanda && demanda.demanda.trim()
                          ? demanda.demanda.trim()
                          : (canEdit ? <span className="text-muted-foreground/60 italic">+ Adicionar orientação...</span> : 'Nenhuma orientação informada.')}
                      </p>
                    </div>
                    {canEdit && (
                      <Pencil size={11} className="opacity-0 group-hover/desc:opacity-60 hover:opacity-100 text-muted-foreground shrink-0 self-center transition" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Formulário limpo sem grande card externo */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-0.5">
                  <label className="font-medium text-foreground">
                    Nova alteração ou pedido
                  </label>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar</span>
                </div>

                {/* Textarea claramente delimitado */}
                <Textarea
                  value={novaAlteracaoTexto}
                  onChange={(e) => setNovaAlteracaoTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmeterNovaAlteracao();
                    }
                  }}
                  placeholder="Descreva o que o cliente solicitou alterar..."
                  rows={3}
                  className="resize-none text-xs bg-background border-border text-foreground focus:ring-1 focus:ring-primary shadow-xs rounded-lg"
                />

                {/* Bloco 'Estender prazo' recolhido por padrão com toggle simples */}
                <div className="pt-0.5">
                  {!estenderPrazoAberto && diasAdicionarPrazo === 0 ? (
                    <button
                      type="button"
                      onClick={() => setEstenderPrazoAberto(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer py-1"
                    >
                      <Clock size={12} />
                      <span>+ Estender prazo de entrega</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 space-y-2 animate-in fade-in-50 duration-150">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Clock size={12} className="text-amber-500" />
                          <span>Estender prazo:</span>
                        </div>

                        {/* Stepper + / - unificado como controle visual compacto */}
                        <div className="inline-flex items-center rounded-md border border-border/70 bg-background overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setDiasAdicionarPrazo((prev) => Math.max(0, prev - 1))}
                            disabled={diasAdicionarPrazo === 0}
                            className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition cursor-pointer"
                            title="Diminuir 1 dia"
                          >
                            <Minus size={11} />
                          </button>

                          <div className="px-2 py-0.5 text-xs font-semibold tabular-nums min-w-[54px] text-center border-x border-border/40 select-none text-foreground">
                            {diasAdicionarPrazo === 0 ? '0 dias' : `+${diasAdicionarPrazo} ${diasAdicionarPrazo === 1 ? 'dia' : 'dias'}`}
                          </div>

                          <button
                            type="button"
                            onClick={() => setDiasAdicionarPrazo((prev) => prev + 1)}
                            className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            title="Aumentar +1 dia"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Atalhos Rápidos de Dias (+1d, +2d, +3d, +5d) com mesmo tamanho */}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <span className="text-[10px] text-muted-foreground">Atalhos:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 5].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDiasAdicionarPrazo(d)}
                              className={`h-5 min-w-[28px] px-1.5 rounded text-[10px] font-medium transition cursor-pointer flex items-center justify-center ${
                                diasAdicionarPrazo === d
                                  ? 'bg-amber-500 text-amber-950 font-bold'
                                  : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              +{d}d
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setDiasAdicionarPrazo(0);
                              setEstenderPrazoAberto(false);
                            }}
                            className="text-[10px] text-muted-foreground/80 hover:text-foreground hover:underline transition cursor-pointer ml-1.5"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>

                      {/* Preview do Novo Prazo com foco na data */}
                      {previewNovoPrazo && (
                        <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-md bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-muted-foreground font-normal">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-amber-500" />
                            <span>Novo prazo:</span>
                          </span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {previewNovoPrazo} <span className="font-normal text-[10px] text-muted-foreground/80">(+{diasAdicionarPrazo}d)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Botão Registrar Alteração: Primário da seção sem ser botão branco agressivo no Dark Mode */}
                <button
                  type="button"
                  onClick={handleSubmeterNovaAlteracao}
                  disabled={!novaAlteracaoTexto.trim()}
                  className={`w-full h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                    novaAlteracaoTexto.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-muted dark:text-foreground dark:border dark:border-border dark:hover:bg-accent active:scale-[0.99]'
                      : 'bg-muted/60 text-muted-foreground/70 border border-border/60 cursor-not-allowed'
                  }`}
                >
                  <Send size={12} className="mr-0.5 opacity-80" />
                  <span>
                    {diasAdicionarPrazo > 0
                      ? `Registrar alteração (+${diasAdicionarPrazo} ${diasAdicionarPrazo === 1 ? 'dia' : 'dias'})`
                      : 'Registrar alteração'}
                  </span>
                </button>
              </div>

              {/* Sub-abas de Visualização: Tabs simplificadas */}
              <div className="flex items-center gap-4 pt-2 border-b border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setAbaAlteracoesFiltro('todas')}
                  className={`pb-1.5 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    abaAlteracoesFiltro === 'todas'
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Alterações</span>
                  <span className="text-[10px] text-muted-foreground">({alteracoesHistorico.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAlteracoesFiltro('prazos')}
                  className={`pb-1.5 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    abaAlteracoesFiltro === 'prazos'
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Histórico de Prazos</span>
                  <span className="text-[10px] text-muted-foreground">({historicoPrazos.length})</span>
                </button>
              </div>

              {/* Timeline simples para Alterações */}
              {abaAlteracoesFiltro === 'todas' && (
                <div className="pt-1">
                  {alteracoesHistorico.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs text-muted-foreground/60 italic">
                      Nenhuma alteração registrada ainda para esta demanda.
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border/60 pl-6">
                      {alteracoesHistorico.map((alt, idx) => {
                        const autorNome = alt.usuario?.nome || alt.autor || 'Sistema';
                        const dataFormatada = alt.data ? formatarDataHistorico(alt.data) : 'Data não informada';
                        const textoAlteracao = alt.texto || alt.descricao || '';
                        const isUltima = idx === 0;

                        return (
                          <div key={idx} className="relative space-y-1 text-xs">
                            <div className={`absolute -left-[23px] top-1 h-2 w-2 rounded-full ${isUltima ? 'bg-primary' : 'bg-muted-foreground/40'} ring-4 ring-card`} />
                            
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-foreground truncate">
                                  {autorNome}
                                </span>
                                {isUltima && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-muted text-muted-foreground border border-border/60">
                                    Mais recente
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums font-normal">
                                {dataFormatada}
                              </span>
                            </div>

                            <p className="text-xs text-foreground/90 leading-relaxed break-words font-normal">
                              {textoAlteracao}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline simples para Histórico de Prazos */}
              {abaAlteracoesFiltro === 'prazos' && (
                <div className="pt-1">
                  {historicoPrazos.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs text-muted-foreground/60 italic">
                      Nenhum ajuste de prazo registrado ainda.
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border/60 pl-6">
                      {historicoPrazos.map((alt, idx) => {
                        const autorNome = alt.usuario?.nome || alt.autor || 'Sistema';
                        const dataFormatada = alt.data ? formatarDataHistorico(alt.data) : 'Hoje';
                        const motivo = alt.motivo || alt.texto || alt.descricao || '';
                        const deFormatado = alt.prazo_antigo ? formatarPrazo(alt.prazo_antigo) || alt.prazo_antigo : 'Sem prazo';
                        const paraFormatado = alt.prazo_novo ? formatarPrazo(alt.prazo_novo) || alt.prazo_novo : 'Sem prazo';
                        const dias = alt.dias_ajustados;

                        return (
                          <div key={idx} className="relative space-y-1.5 text-xs">
                            <div className="absolute -left-[23px] top-1 h-2 w-2 rounded-full bg-amber-500 ring-4 ring-card" />

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground truncate">
                                {autorNome}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums font-normal">
                                {dataFormatada}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <span className="text-muted-foreground line-through">{deFormatado}</span>
                              <ArrowRight size={11} className="text-muted-foreground shrink-0" />
                              <span className="font-semibold text-amber-600 dark:text-amber-400">{paraFormatado}</span>
                              {dias > 0 && (
                                <span className="ml-1 text-[10px] text-muted-foreground font-medium">
                                  (+{dias}d)
                                </span>
                              )}
                            </div>

                            {motivo && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {motivo}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* 3. Seção de Ações no Rodapé: Compacta e elegante com separação sutil */}
      <div className="py-2.5 px-4 border-t border-border/40 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          {/* Botão Concluir Demanda: Ação Primária sem exagero de contraste */}
          <Button
            onClick={() => onConcluir?.(demanda)}
            className="flex-1 h-8 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-secondary dark:text-foreground dark:border dark:border-border dark:hover:bg-accent/80 active:scale-[0.99]"
          >
            <Check size={13} className="stroke-[2.5]" />
            <span>Concluir demanda</span>
          </Button>

          {/* Botão Imprimir: Ação Secundária */}
          <Button
            variant="outline"
            onClick={() => onEnviarParaImpressao?.(demanda)}
            className="h-8 px-3 rounded-lg border-border/70 hover:border-border text-xs font-medium text-foreground hover:bg-secondary/60 transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Imprimir demanda"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>

          {/* Botão '...' : Ação Terciária */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                title="Mais opções"
              >
                <MoreHorizontal size={14} />
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
                  onClick={() => setActiveTab('detalhes')}
                  className="text-xs py-1.5 px-2 cursor-pointer hover:bg-accent"
                >
                  <Pencil size={13} className="mr-2 text-muted-foreground" /> Detalhes & Edição
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

    </aside>
  );
}
