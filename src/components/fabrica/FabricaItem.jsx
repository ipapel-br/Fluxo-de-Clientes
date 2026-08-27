import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  Play,
  Pause,
  CheckCircle2,
  Calendar as CalendarIcon,
  Check,
  Plus,
  History,
  Layers,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import RegistrarAlteracaoDialog from '@/components/demanda/RegistrarAlteracaoDialog';
import HistoricoPainel from '@/components/demanda/HistoricoPainel';
import UserAvatar from '@/components/ui/UserAvatar';
import { labelPrazo, tipoAlertaPrazo } from '@/lib/datas';
import { etiquetaConfig } from '@/lib/etiquetas';
import { ACABAMENTOS, acabamentoConfig, STATUS_FABRICA, statusFabricaConfig } from '@/lib/acabamentos';
import { hexToRgba } from '@/lib/statusColors';
import { useAuth } from '@/contexts/AuthContext';

const PRAZO_CLASSES = {
  vencido: 'text-red-700 bg-red-50/90 border-red-200 hover:bg-red-100',
  hoje: 'text-amber-700 bg-amber-50/90 border-amber-200 font-semibold hover:bg-amber-100',
  amanha: 'text-sky-700 bg-sky-50/90 border-sky-200 hover:bg-sky-100',
  null: 'text-muted-foreground bg-muted/40 border-border hover:bg-muted',
};

export default function FabricaItem({
  demanda,
  index,
  onQuickUpdate,
  onRegistrarAlteracao,
  onIniciarImpressao,
  onConcluirImpressao,
  onPausarImpressao,
  dragDisabled,
  destaque,
  viewMode = 'lista',
}) {
  const { can } = useAuth();
  const [alteracaoOpen, setAlteracaoOpen] = useState(false);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [acabamentoPopoverOpen, setAcabamentoPopoverOpen] = useState(false);
  const [statusFabricaPopoverOpen, setStatusFabricaPopoverOpen] = useState(false);

  const canEdit = can('factory_edit');
  const canReorder = can('factory_reorder');
  const canStart = can('factory_start');
  const canComplete = can('factory_complete');
  const canViewHistory = can('history_view');

  const acabamentoCfg = acabamentoConfig(demanda.acabamento || 'Autocolante');
  const statusFabricaCfg = statusFabricaConfig(demanda.factory_status || 'aguardando');
  const alerta = tipoAlertaPrazo(demanda.prazo);
  const prazoClass = PRAZO_CLASSES[alerta];
  const etiquetaCfg = etiquetaConfig(demanda.etiqueta);

  // Elemento: Ações rápidas de Produção (Iniciar / Pausar / Concluir)
  const acoesFabricaNode = (
    <div className="flex items-center gap-1.5 shrink-0">
      {demanda.factory_status === 'em_impressao' ? (
        <>
          {canComplete && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onConcluirImpressao(demanda)}
              className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-lg transition"
              title="Concluir impressão"
            >
              <CheckCircle2 size={13} className="mr-1 stroke-[2.5]" /> Concluir
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPausarImpressao(demanda)}
              className="h-7 px-2 text-xs font-medium text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/80 rounded-lg transition"
              title="Pausar impressão"
            >
              <Pause size={12} className="mr-1" /> Pausar
            </Button>
          )}
        </>
      ) : demanda.factory_status === 'impresso' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check size={12} /> Impresso
        </span>
      ) : (
        canStart && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onIniciarImpressao(demanda)}
            className="h-7 px-2.5 text-xs font-semibold bg-background hover:bg-foreground hover:text-background transition shadow-xs rounded-lg"
            title="Iniciar impressão deste pedido"
          >
            <Play size={12} className="mr-1 fill-current" /> Iniciar Impressão
          </Button>
        )
      )}
    </div>
  );

  // Elemento: Badges de Produção (Acabamento Destaque + Urgência + Status da Fábrica + Prazo)
  const badgesNode = (
    <div className="flex flex-wrap items-center gap-2 pt-0.5">
      {/* Badge de Acabamento com Destaque Visual */}
      {canEdit ? (
        <Popover open={acabamentoPopoverOpen} onOpenChange={setAcabamentoPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer transition-transform hover:scale-105"
              title="Clique para alterar o acabamento"
            >
              <span
                style={{
                  backgroundColor: acabamentoCfg.corBg,
                  color: acabamentoCfg.cor,
                  borderColor: acabamentoCfg.corBorder,
                }}
                className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-xs"
              >
                <Layers size={13} />
                {acabamentoCfg.label}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 space-y-1" align="start">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Alterar Acabamento
            </div>
            {ACABAMENTOS.map((a) => {
              const isSelected = (demanda.acabamento || 'Autocolante') === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onQuickUpdate?.(demanda, { acabamento: a.id });
                    setAcabamentoPopoverOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition ${
                    isSelected ? 'bg-accent font-semibold text-foreground' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.cor }} />
                    {a.label}
                  </span>
                  {isSelected && <Check size={13} className="text-foreground" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      ) : (
        <span
          style={{
            backgroundColor: acabamentoCfg.corBg,
            color: acabamentoCfg.cor,
            borderColor: acabamentoCfg.corBorder,
          }}
          className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-xs"
        >
          <Layers size={13} />
          {acabamentoCfg.label}
        </span>
      )}

      {/* Badge de Status da Fábrica */}
      {canEdit ? (
        <Popover open={statusFabricaPopoverOpen} onOpenChange={setStatusFabricaPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer transition-transform hover:scale-105"
              title="Clique para alterar o status da impressão"
            >
              <span
                style={{
                  backgroundColor: statusFabricaCfg.corBg,
                  color: statusFabricaCfg.cor,
                  borderColor: statusFabricaCfg.corBorder,
                }}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs"
              >
                <Printer size={11} />
                {statusFabricaCfg.label}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2 space-y-1" align="start">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Status da Impressão
            </div>
            {STATUS_FABRICA.map((st) => {
              const isSelected = (demanda.factory_status || 'aguardando') === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onQuickUpdate?.(demanda, { factory_status: st.id });
                    setStatusFabricaPopoverOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition ${
                    isSelected ? 'bg-accent font-semibold text-foreground' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.cor }} />
                    {st.label}
                  </span>
                  {isSelected && <Check size={13} className="text-foreground" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      ) : (
        <span
          style={{
            backgroundColor: statusFabricaCfg.corBg,
            color: statusFabricaCfg.cor,
            borderColor: statusFabricaCfg.corBorder,
          }}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs"
        >
          <Printer size={11} />
          {statusFabricaCfg.label}
        </span>
      )}

      {/* Urgência / Etiqueta */}
      {etiquetaCfg && (
        <span
          style={{
            backgroundColor: hexToRgba(etiquetaCfg.cor, 0.14),
            color: etiquetaCfg.cor,
            borderColor: hexToRgba(etiquetaCfg.cor, 0.35),
          }}
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shadow-2xs"
        >
          {etiquetaCfg.label}
        </span>
      )}

      {/* Prazo */}
      {demanda.prazo && (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${prazoClass}`}>
          <CalendarIcon size={12} />
          {labelPrazo(demanda.prazo)}
        </span>
      )}
    </div>
  );

  return (
    <>
      <Draggable draggableId={demanda.id} index={index} isDragDisabled={dragDisabled || !canReorder}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`group relative rounded-2xl border bg-card p-4 transition-all duration-150 ${
              destaque
                ? 'border-foreground/40 shadow-sm ring-1 ring-foreground/10 bg-card'
                : 'border-border hover:border-foreground/20 shadow-sm'
            } ${snapshot.isDragging ? 'shadow-xl ring-2 ring-foreground/20 z-50' : ''}`}
          >
            {destaque && (
              <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-background uppercase shadow-sm">
                <Sparkles size={10} /> PRÓXIMA IMPRESSÃO
              </span>
            )}

            {viewMode === 'grade' ? (
              /* MODO GRADE */
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {canReorder && (
                      <button
                        {...provided.dragHandleProps}
                        disabled={dragDisabled}
                        className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing disabled:cursor-default p-0.5 transition-colors"
                        aria-label="Arrastar para reordenar fábrica"
                      >
                        <GripVertical size={16} />
                      </button>
                    )}
                    {canReorder && <div className="h-4 w-px bg-border/80" />}
                    <div className="font-bold tabular-nums text-sm text-foreground/90 leading-none">
                      #{String((demanda.factory_position !== undefined ? demanda.factory_position : index) + 1).padStart(2, '0')}
                    </div>
                  </div>
                  {acoesFabricaNode}
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="font-bold text-base text-foreground leading-tight truncate">
                    {demanda.cliente}
                  </h3>

                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {demanda.vendedor && (
                      <span className="inline-flex items-center gap-1">
                        <span>Vendedor:</span>
                        <UserAvatar name={demanda.vendedor} size="xs" />
                        <strong className="font-semibold text-foreground/90">{demanda.vendedor}</strong>
                      </span>
                    )}
                    {demanda.revenda && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span>Revenda:</span>
                          <UserAvatar name={demanda.revenda} size="xs" />
                          <strong className="font-semibold text-foreground/90">{demanda.revenda}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {badgesNode}

                  {demanda.demanda && (
                    <p className="text-xs text-foreground/80 line-clamp-1">
                      <span className="text-muted-foreground">Etapa: </span>
                      {demanda.demanda}
                    </p>
                  )}
                  {demanda.observacao && (
                    <p className="text-xs text-muted-foreground/90 italic line-clamp-2">
                      {demanda.observacao}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAlteracaoOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> Registrar alteração
                  </button>

                  {canViewHistory && (
                    <button
                      type="button"
                      onClick={() => setHistoricoModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <History size={13} /> Histórico ({demanda.historico?.length || 0})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* MODO LISTA */
              <div className="flex items-start gap-3">
                {/* Esquerda: Drag handle + Divisor + Número da Fábrica */}
                <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                  {canReorder && (
                    <button
                      {...provided.dragHandleProps}
                      disabled={dragDisabled}
                      className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing disabled:cursor-default p-0.5 transition-colors"
                      aria-label="Arrastar para reordenar na fábrica"
                    >
                      <GripVertical size={18} />
                    </button>
                  )}
                  {canReorder && <div className="h-6 w-px bg-border/80" />}
                  <div className="w-7 text-center font-bold tabular-nums text-xl text-foreground/90 leading-none">
                    {String((demanda.factory_position !== undefined ? demanda.factory_position : index) + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Conteúdo Central e Ações */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-base text-foreground leading-tight truncate">
                        {demanda.cliente}
                      </h3>
                    </div>

                    <div className="flex items-center gap-x-2 text-xs text-muted-foreground ml-auto pr-2">
                      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {demanda.vendedor && (
                          <span className="inline-flex items-center gap-1">
                            <span>Vendedor:</span>
                            <UserAvatar name={demanda.vendedor} size="xs" />
                            <strong className="font-semibold text-foreground/90">{demanda.vendedor}</strong>
                          </span>
                        )}
                        {demanda.revenda && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span>Revenda:</span>
                              <UserAvatar name={demanda.revenda} size="xs" />
                              <strong className="font-semibold text-foreground/90">{demanda.revenda}</strong>
                            </span>
                          </>
                        )}
                      </div>
                      {acoesFabricaNode}
                    </div>
                  </div>

                  {/* Badges */}
                  {badgesNode}

                  {demanda.demanda && (
                    <div className="text-xs text-foreground/90">
                      <span className="text-muted-foreground">Etapa da arte: </span>
                      {demanda.demanda}
                    </div>
                  )}

                  {demanda.observacao && (
                    <p className="text-xs text-muted-foreground/90 italic line-clamp-2">
                      {demanda.observacao}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAlteracaoOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Registrar alteração
                    </button>

                    {canViewHistory && (
                      <button
                        type="button"
                        onClick={() => setHistoricoModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                      >
                        <History size={13} /> Histórico ({demanda.historico?.length || 0})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Draggable>

      <RegistrarAlteracaoDialog
        open={alteracaoOpen}
        onClose={() => setAlteracaoOpen(false)}
        onConfirm={async (novoTexto) => {
          await onRegistrarAlteracao?.(demanda, novoTexto);
          setAlteracaoOpen(false);
        }}
      />

      <Dialog open={historicoModalOpen} onOpenChange={setHistoricoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History size={18} /> Histórico de Alterações
            </DialogTitle>
            <DialogDescription className="text-xs">
              Histórico da demanda de <strong className="text-foreground">{demanda.cliente}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <HistoricoPainel historico={demanda.historico} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
