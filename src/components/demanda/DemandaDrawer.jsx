import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
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
import { tipoAlertaPrazo, formatarPrazo } from '@/lib/datas';
import { formatarDataHistorico } from '@/lib/historico';
import { faseArteConfig, FASES_ARTE } from '@/lib/progressoArte';
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
}) {
  const { can, usuario } = useAuth();
  const canEdit = can('priority_edit');
  const [activeTab, setActiveTab] = useState(initialTab || 'detalhes'); // 'detalhes' | 'alteracoes'
  const [abaAlteracoesFiltro, setAbaAlteracoesFiltro] = useState(initialSubTab || 'todas'); // 'todas' | 'prazos'

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialSubTab) setAbaAlteracoesFiltro(initialSubTab);
  }, [demanda?.id, initialTab, initialSubTab]);
  const [prazoPopoverOpen, setPrazoPopoverOpen] = useState(false);
  const [novaAlteracaoTexto, setNovaAlteracaoTexto] = useState('');
  const [diasAdicionarPrazo, setDiasAdicionarPrazo] = useState(0);
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
  const alerta = tipoAlertaPrazo(demanda.prazo);
  const faseArteCfg = faseArteConfig(demanda.fase_arte);
  const acabamentoCfg = acabamentoConfig(demanda.acabamento || 'Autocolante');

  const prazoTexto = (() => {
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
    <aside className="w-full sm:w-[380px] md:w-[410px] shrink-0 border-l border-border bg-card flex flex-col justify-between h-full min-h-[600px] overflow-y-auto animate-in slide-in-from-right-3 duration-150 shadow-xl z-20 select-none">
      
      {/* Conteúdo Superior */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* 1. Cabeçalho do Drawer: Número + Nome do Cliente + Botão de fechar */}
        <div className="p-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
              <span className="font-mono text-[15px] font-bold text-muted-foreground/80 tabular-nums shrink-0">
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
                  className="w-full text-sm font-bold px-2 py-0.5 rounded bg-background border border-primary text-foreground focus:outline-none"
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

          {/* Subtítulo / Orientação Principal com Edição Rápida */}
          <div className="mt-2.5 pt-2 border-t border-border/50">
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
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-primary text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs font-medium"
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
                className="group/desc flex items-start justify-between gap-2 p-2 rounded-lg bg-secondary/40 border border-border/60 hover:border-border hover:bg-secondary/70 transition cursor-pointer"
                title={canEdit ? 'Clique para editar a orientação' : ''}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Orientação atual
                  </span>
                  <p className="text-xs font-medium text-foreground leading-relaxed break-words">
                    {demanda.demanda && demanda.demanda.trim()
                      ? demanda.demanda.trim()
                      : (canEdit ? '+ Clique aqui para adicionar uma orientação...' : 'Nenhuma orientação informada.')}
                  </p>
                </div>
                {canEdit && (
                  <Pencil size={12} className="opacity-40 group-hover/desc:opacity-100 text-muted-foreground shrink-0 mt-1" />
                )}
              </div>
            )}
          </div>

          {/* Abas Superiores do Drawer: Detalhes x Alterações */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-secondary/70 rounded-lg border border-border mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('detalhes')}
              className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === 'detalhes'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Detalhes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alteracoes')}
              className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === 'alteracoes'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare size={13} />
              <span>Alterações</span>
              {alteracoesHistorico.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'alteracoes'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted-foreground/20 text-foreground'
                }`}>
                  {alteracoesHistorico.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Conteúdo da Aba Ativa */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">
          {activeTab === 'detalhes' ? (
            <>
              {/* Campos de Detalhes da Demanda com Ações Diretas */}
              <div className="space-y-3 text-xs">
                
                {/* Prioridade Interativa */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Prioridade</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                      >
                        {prioridadeValor === 'urgente' ? (
                          <span className="text-rose-500">URGENTE</span>
                        ) : prioridadeValor === 'alta' ? (
                          <span className="text-[#f97316]">ALTA</span>
                        ) : (
                          <span className="text-muted-foreground/75">ROTINA</span>
                        )}
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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

                {/* Prazo Interativo */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/90 font-medium">Prazo</span>
                    {historicoPrazos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('alteracoes');
                          setAbaAlteracoesFiltro('prazos');
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/25 hover:bg-amber-500/25 transition cursor-pointer"
                        title="Ver histórico de alterações deste prazo"
                      >
                        <Clock size={10} />
                        <span>{historicoPrazos.length} {historicoPrazos.length === 1 ? 'ajuste' : 'ajustes'}</span>
                      </button>
                    )}
                  </div>
                  <Popover open={prazoPopoverOpen} onOpenChange={setPrazoPopoverOpen}>
                    <PopoverTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-semibold text-xs hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                      >
                        {prazoTexto ? (
                          <>
                            <span className={prazoTexto.isHoje ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}>
                              {prazoTexto.data}
                            </span>
                            {prazoTexto.status && (
                              <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                                {prazoTexto.status}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground/40">Definir prazo</span>
                        )}
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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

                {/* Etapa Interativa */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Etapa</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium text-foreground hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                      >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: corEtapa }} />
                        <span>{nomeEtapa}</span>
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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

                {/* Status Geral Interativo */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Status</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium text-foreground hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:cursor-default"
                      >
                        {status ? (
                          <span
                            style={getStatusBadgeStyle(status)}
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs hover:brightness-110 transition-all"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                              style={{ backgroundColor: getStatusColor(status) }}
                            />
                            <span>{status.nome}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground">
                            Aguardando
                          </span>
                        )}
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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
                            onClick={() => onQuickUpdate?.(demanda, { status_id: st.id })}
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

                {/* Designer */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Designer</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium text-foreground hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                      >
                        {demanda.designer ? (
                          <>
                            <UserAvatar name={demanda.designer} size="xs" />
                            <span className="font-medium text-foreground">{demanda.designer}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/40 italic">Não atribuído</span>
                        )}
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Vendedor</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium text-foreground hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                      >
                        {demanda.vendedor ? (
                          <>
                            <UserAvatar name={demanda.vendedor} size="xs" />
                            <span className="font-medium text-foreground">{demanda.vendedor}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/40 italic">Não atribuído</span>
                        )}
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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
                        return (
                          <DropdownMenuItem
                            key={v.id || nome}
                            onClick={() => onQuickUpdate?.(demanda, { vendedor: nome })}
                            className={`text-xs py-1.5 px-2 cursor-pointer hover:bg-accent flex items-center justify-between rounded-lg transition-colors my-0.5 ${
                              isSelected ? 'bg-accent/80 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserAvatar name={nome} src={v.avatar_url} size="xs" />
                              <span>{nome}</span>
                            </div>
                            {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Revenda */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Revenda</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium text-foreground hover:opacity-80 transition cursor-pointer disabled:cursor-default"
                      >
                        {demanda.revenda ? (
                          <>
                            <UserAvatar name={demanda.revenda} size="xs" />
                            <span className="font-medium text-foreground">{demanda.revenda}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/40 italic">Sem revenda</span>
                        )}
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium">Bitrix</span>
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
                      className="text-xs px-2 py-0.5 rounded bg-background border border-primary text-foreground w-24 text-right focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canEdit) return;
                        setIsEditingBitrix(true);
                        setBitrixInput(demanda.bitrix_id || '');
                      }}
                      className="font-mono text-xs font-semibold text-foreground hover:text-primary transition cursor-pointer"
                      title={canEdit ? 'Clique para editar o ID do Bitrix' : ''}
                    >
                      {demanda.bitrix_id || '18913'}
                    </button>
                  )}
                </div>

                {/* Acabamento (Fábrica) - Substituindo Observação */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground/90 font-medium flex items-center gap-1">
                    Acabamento
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!canEdit}>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:cursor-default"
                        title="Alterar Acabamento"
                      >
                        <span
                          style={{
                            backgroundColor: acabamentoCfg.corBg,
                            color: acabamentoCfg.cor,
                            borderColor: acabamentoCfg.corBorder,
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-xs transition-all"
                        >
                          {acabamentoCfg.label}
                        </span>
                        {canEdit && <ChevronDown size={12} className="text-muted-foreground/50" />}
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
                            <span
                              style={{
                                backgroundColor: a.corBg,
                                color: a.cor,
                                borderColor: a.corBorder,
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold"
                            >
                              {a.label}
                            </span>
                            {isSelected && <Check size={13} className="ml-2 shrink-0 text-primary" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Botão para registrar alteração rápida */}
              <div className="pt-1">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('alteracoes')}
                  className="w-full h-9 rounded-lg border-border bg-secondary/80 hover:bg-secondary hover:text-foreground text-xs font-semibold text-muted-foreground transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Registrar nova alteração / pedido</span>
                </Button>
              </div>

              {/* Seção "ATIVIDADE RESUMIDA" */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground/80 uppercase select-none">
                    Últimas Atividades
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('alteracoes')}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Ver todas
                  </button>
                </div>

                {itensAtividade.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 italic py-2">
                    Nenhuma atividade registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3.5 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-border pl-4">
                    {itensAtividade.map((item) => (
                      <div key={item.id} className="relative space-y-0.5 text-xs">
                        <div
                          className={`absolute -left-[19px] top-1 h-2 w-2 rounded-full ${item.cor} ring-4 ring-card`}
                        />
                        <div className="text-[10px] text-muted-foreground/80 font-medium">
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
              
              {/* Caixa para Adicionar Nova Alteração com Opção de Aumentar Prazo */}
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus size={13} className="text-primary stroke-[2.5]" />
                    <span>Adicionar nova alteração</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar</span>
                </div>

                <Textarea
                  value={novaAlteracaoTexto}
                  onChange={(e) => setNovaAlteracaoTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmeterNovaAlteracao();
                    }
                  }}
                  placeholder="Ex: Cliente pediu para alterar o layout e a paleta de cores..."
                  rows={3}
                  className="resize-none text-xs bg-background border-border text-foreground"
                />

                {/* Bloco de Ajuste / Aumento de Prazo */}
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Clock size={13} className="text-amber-500" />
                      <span>Estender prazo:</span>
                    </div>

                    {/* Stepper + / - */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDiasAdicionarPrazo((prev) => Math.max(0, prev - 1))}
                        disabled={diasAdicionarPrazo === 0}
                        className="h-6 w-6 rounded flex items-center justify-center bg-secondary hover:bg-accent text-foreground disabled:opacity-30 transition cursor-pointer"
                        title="Diminuir 1 dia"
                      >
                        <Minus size={11} />
                      </button>

                      <div className="px-2 py-0.5 rounded bg-secondary text-xs font-bold tabular-nums min-w-[58px] text-center">
                        {diasAdicionarPrazo === 0 ? '0 dias' : `+${diasAdicionarPrazo} ${diasAdicionarPrazo === 1 ? 'dia' : 'dias'}`}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDiasAdicionarPrazo((prev) => prev + 1)}
                        className="h-6 w-6 rounded flex items-center justify-center bg-secondary hover:bg-accent text-foreground transition cursor-pointer"
                        title="Aumentar +1 dia"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Atalhos Rápidos de Dias (+1d, +2d, +3d, +5d) */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span className="text-[10px] text-muted-foreground/75">Atalhos:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDiasAdicionarPrazo(d)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                            diasAdicionarPrazo === d
                              ? 'bg-amber-500 text-amber-950 dark:text-amber-950 font-bold shadow-xs'
                              : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          +{d}d
                        </button>
                      ))}
                      {diasAdicionarPrazo > 0 && (
                        <button
                          type="button"
                          onClick={() => setDiasAdicionarPrazo(0)}
                          className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-rose-500 hover:bg-secondary transition cursor-pointer"
                          title="Zerar acréscimo"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview do Novo Prazo */}
                  {previewNovoPrazo && (
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium animate-in fade-in-50 duration-150">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>Novo prazo para entrega:</span>
                      </span>
                      <span className="font-bold">{previewNovoPrazo} (+{diasAdicionarPrazo} {diasAdicionarPrazo === 1 ? 'dia' : 'dias'})</span>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={handleSubmeterNovaAlteracao}
                  disabled={!novaAlteracaoTexto.trim()}
                  className="w-full h-8 text-xs font-semibold cursor-pointer"
                >
                  <Send size={12} className="mr-1.5" />
                  <span>
                    {diasAdicionarPrazo > 0
                      ? `Registrar alteração (+${diasAdicionarPrazo} ${diasAdicionarPrazo === 1 ? 'dia' : 'dias'} de prazo)`
                      : 'Registrar alteração'}
                  </span>
                </Button>
              </div>

              {/* Sub-abas de Visualização: Todas as Alterações x Histórico de Prazos */}
              <div className="flex items-center gap-1 p-0.5 bg-secondary/60 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setAbaAlteracoesFiltro('todas')}
                  className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    abaAlteracoesFiltro === 'todas'
                      ? 'bg-card text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare size={12} />
                  <span>Alterações ({alteracoesHistorico.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAlteracoesFiltro('prazos')}
                  className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    abaAlteracoesFiltro === 'prazos'
                      ? 'bg-card text-amber-600 dark:text-amber-400 font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock size={12} className={abaAlteracoesFiltro === 'prazos' ? 'text-amber-500' : ''} />
                  <span>Histórico de Prazos ({historicoPrazos.length})</span>
                </button>
              </div>

              {/* Conteúdo: Todas as Alterações */}
              {abaAlteracoesFiltro === 'todas' && (
                <div className="space-y-3 pt-0.5">
                  {alteracoesHistorico.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
                      <MessageSquare size={24} className="mx-auto text-muted-foreground/60" />
                      <p className="text-xs text-muted-foreground">
                        Nenhuma alteração registrada ainda para este cliente.
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Use a caixa acima para anotar o que foi pedido.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {alteracoesHistorico.map((alt, idx) => {
                        const autorNome = alt.usuario?.nome || alt.autor || 'Sistema';
                        const dataFormatada = alt.data ? formatarDataHistorico(alt.data) : 'Data não informada';
                        const textoAlteracao = alt.texto || alt.descricao || '';
                        const isUltima = idx === 0;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border transition text-xs space-y-1.5 ${
                              isUltima
                                ? 'bg-secondary/70 border-primary/30 shadow-2xs'
                                : 'bg-card border-border/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <UserAvatar name={autorNome} size="xs" />
                                <span className="font-semibold text-foreground truncate">
                                  {autorNome}
                                </span>
                                {isUltima && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                                    Última
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                {dataFormatada}
                              </span>
                            </div>

                            <p className="text-xs text-foreground font-medium leading-relaxed break-words pl-6">
                              {textoAlteracao}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo: Histórico Específico de Prazos */}
              {abaAlteracoesFiltro === 'prazos' && (
                <div className="space-y-3 pt-0.5">
                  {historicoPrazos.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
                      <Clock size={24} className="mx-auto text-amber-500/60" />
                      <p className="text-xs text-muted-foreground">
                        Nenhuma alteração ou prorrogação de prazo registrada.
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Ao registrar alterações com prorrogação de dias, elas aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {historicoPrazos.map((alt, idx) => {
                        const autorNome = alt.usuario?.nome || alt.autor || 'Sistema';
                        const dataFormatada = alt.data ? formatarDataHistorico(alt.data) : 'Hoje';
                        const motivo = alt.motivo || alt.texto || alt.descricao || '';
                        const deFormatado = alt.prazo_antigo ? formatarPrazo(alt.prazo_antigo) || alt.prazo_antigo : 'Sem prazo';
                        const paraFormatado = alt.prazo_novo ? formatarPrazo(alt.prazo_novo) || alt.prazo_novo : 'Sem prazo';
                        const dias = alt.dias_ajustados;

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <UserAvatar name={autorNome} size="xs" />
                                <span className="font-semibold text-foreground truncate">
                                  {autorNome}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                {dataFormatada}
                              </span>
                            </div>

                            {/* Badge do Salto do Prazo */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background/80 border border-border/80 text-[11px] font-semibold text-foreground">
                              <Clock size={12} className="text-amber-500 shrink-0" />
                              <span className="text-muted-foreground line-through">{deFormatado}</span>
                              <ArrowRight size={11} className="text-muted-foreground shrink-0" />
                              <span className="text-amber-600 dark:text-amber-400 font-bold">{paraFormatado}</span>
                              {dias > 0 && (
                                <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  +{dias} {dias === 1 ? 'dia' : 'dias'}
                                </span>
                              )}
                            </div>

                            {/* Motivo do Ajuste */}
                            {motivo && (
                              <div className="text-[11px] text-muted-foreground pl-1 leading-relaxed">
                                <span className="font-semibold text-foreground/80">Motivo: </span>
                                {motivo}
                              </div>
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

      {/* 3. Seção "AÇÕES" no Rodapé do Drawer */}
      <div className="p-4 border-t border-border bg-muted/40 space-y-2 shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
          Ações
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Concluir Demanda */}
          <Button
            variant="outline"
            onClick={() => onConcluir?.(demanda)}
            className="flex-1 h-9 rounded-lg border-border bg-card text-xs font-medium text-foreground hover:bg-accent hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check size={13} className="stroke-[2.5]" />
            <span>Concluir demanda</span>
          </Button>

          {/* Botão Imprimir */}
          <Button
            variant="outline"
            onClick={() => onEnviarParaImpressao?.(demanda)}
            className="h-9 px-3 rounded-lg border-border bg-card text-xs font-medium text-foreground hover:bg-accent transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Imprimir demanda"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>

          {/* Botão de Menu Overflow "..." */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer shrink-0"
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px] p-1 bg-popover border-border text-popover-foreground rounded-lg shadow-2xl">
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
