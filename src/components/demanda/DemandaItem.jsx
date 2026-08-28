import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Check,
  Plus,
  Palette,
  X,
  History,
  Printer,
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import RegistrarAlteracaoDialog from './RegistrarAlteracaoDialog';
import HistoricoPainel from './HistoricoPainel';
import UserAvatar from '@/components/ui/UserAvatar';
import { processAvatarFile, saveAvatar } from '@/lib/avatarService';
import { labelPrazo, tipoAlertaPrazo } from '@/lib/datas';
import { ETIQUETAS, etiquetaConfig } from '@/lib/etiquetas';
import { FASES_ARTE, faseArteConfig } from '@/lib/progressoArte';
import { acabamentoConfig } from '@/lib/acabamentos';
import { hexToRgba } from '@/lib/statusColors';
import { useAuth } from '@/contexts/AuthContext';

const PRAZO_CLASSES = {
  vencido: 'text-red-700 bg-red-50/90 border-red-200 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:border-red-900/60 dark:hover:bg-red-900/50',
  hoje: 'text-amber-700 bg-amber-50/90 border-amber-200 font-semibold hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/60 dark:hover:bg-amber-900/50',
  amanha: 'text-sky-700 bg-sky-50/90 border-sky-200 hover:bg-sky-100 dark:text-sky-400 dark:bg-sky-950/40 dark:border-sky-900/60 dark:hover:bg-sky-900/50',
  null: 'text-muted-foreground bg-muted/40 border-border hover:bg-muted',
};

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
  dragDisabled,
  destaque,
  viewMode = 'lista',
}) {
  const { can } = useAuth();
  const [alteracaoOpen, setAlteracaoOpen] = useState(false);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [clienteTemp, setClienteTemp] = useState(demanda.cliente || '');
  const [etapaPopoverOpen, setEtapaPopoverOpen] = useState(false);
  const [etapaTemp, setEtapaTemp] = useState(demanda.demanda || '');
  const [responsaveisPopoverOpen, setResponsaveisPopoverOpen] = useState(false);
  const [respTemp, setRespTemp] = useState({
    designer: demanda.designer || '',
    vendedor: demanda.vendedor || '',
    revenda: demanda.revenda || '',
  });
  const [prazoPopoverOpen, setPrazoPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [etiquetaPopoverOpen, setEtiquetaPopoverOpen] = useState(false);
  const [faseArtePopoverOpen, setFaseArtePopoverOpen] = useState(false);
  const [acabamentoPopoverOpen, setAcabamentoPopoverOpen] = useState(false);

  const canEdit = can('priority_edit');
  const canReorder = can('priority_reorder');
  const canViewHistory = can('history_view');

  const alerta = tipoAlertaPrazo(demanda.prazo);
  const prazoClass = PRAZO_CLASSES[alerta];
  const etiquetaCfg = etiquetaConfig(demanda.etiqueta);
  const faseArteCfg = faseArteConfig(demanda.fase_arte);
  const acabamentoCfg = acabamentoConfig(demanda.acabamento || 'Autocolante');

  const prazoDate = (() => {
    if (!demanda.prazo) return undefined;
    const parts = String(demanda.prazo).split('-');
    if (parts.length !== 3) return undefined;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  })();

  function salvarCliente() {
    if (clienteTemp.trim() && clienteTemp.trim() !== demanda.cliente) {
      onQuickUpdate?.(demanda, { cliente: clienteTemp.trim() });
    }
    setClientePopoverOpen(false);
  }

  function salvarEtapa() {
    if (etapaTemp.trim() !== (demanda.demanda || '')) {
      onQuickUpdate?.(demanda, { demanda: etapaTemp.trim() });
    }
    setEtapaPopoverOpen(false);
  }

  function salvarResponsaveis() {
    const patch = {
      designer: (respTemp.designer || '').trim(),
      vendedor: (respTemp.vendedor || '').trim(),
      revenda: (respTemp.revenda || '').trim(),
    };
    onQuickUpdate?.(demanda, patch);
    setResponsaveisPopoverOpen(false);
  }

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

  // Elemento: Título do Cliente (Popover Inline)
  const clienteNode = canEdit ? (
    <Popover open={clientePopoverOpen} onOpenChange={(o) => {
      if (o) setClienteTemp(demanda.cliente || '');
      setClientePopoverOpen(o);
    }}>
      <PopoverTrigger asChild>
        <h3
          className="font-bold text-base text-foreground leading-tight truncate cursor-pointer hover:text-primary transition group-hover:underline underline-offset-2"
          title="Clique para editar o cliente"
        >
          {demanda.cliente}
        </h3>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2.5" align="start">
        <Label htmlFor={`cli-${demanda.id}`} className="text-xs font-semibold">Editar nome do cliente</Label>
        <Input
          id={`cli-${demanda.id}`}
          value={clienteTemp}
          onChange={(e) => setClienteTemp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && salvarCliente()}
          autoFocus
        />
        <div className="flex justify-end gap-1.5 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setClientePopoverOpen(false)} className="h-7 text-xs">Cancelar</Button>
          <Button size="sm" onClick={salvarCliente} className="h-7 text-xs">Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    <h3 className="font-bold text-base text-foreground leading-tight truncate">
      {demanda.cliente}
    </h3>
  );

  async function handleUploadAvatarFor(name, file) {
    if (!name || !file) return;
    try {
      const dataUrl = await processAvatarFile(file);
      saveAvatar(name, dataUrl);
    } catch (err) {
      console.error('Erro ao processar avatar:', err);
    }
  }

  // Elemento: Responsáveis (Designer / Vendedor / Revenda Popover)
  const responsaveisNode = canEdit ? (
    <Popover open={responsaveisPopoverOpen} onOpenChange={(o) => {
      if (o) setRespTemp({ designer: demanda.designer || '', vendedor: demanda.vendedor || '', revenda: demanda.revenda || '' });
      setResponsaveisPopoverOpen(o);
    }}>
      <PopoverTrigger asChild>
        <div
          className="inline-flex items-center gap-2 cursor-pointer py-0.5 px-1 -ml-1 rounded-md hover:bg-muted transition text-xs text-muted-foreground flex-wrap"
          title="Clique para editar responsáveis (Designer, Vendedor, Revenda)"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>Designer:</span>
            <UserAvatar name={demanda.designer} size="xs" />
            <strong className="font-semibold text-foreground/90">{demanda.designer || '—'}</strong>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <span>Vendedor:</span>
            <UserAvatar name={demanda.vendedor} size="xs" />
            <strong className="font-semibold text-foreground/90">{demanda.vendedor || '—'}</strong>
          </span>
          {demanda.revenda && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span>Revenda:</span>
                <UserAvatar name={demanda.revenda} size="xs" />
                <strong className="font-semibold text-foreground/90">{demanda.revenda}</strong>
              </span>
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-3" align="end">
        <div className="font-semibold text-xs text-foreground pb-0.5 border-b">Responsáveis pela Demanda</div>

        <div className="space-y-1.5">
          <Label htmlFor={`des-${demanda.id}`} className="text-xs flex items-center gap-1.5">
            <UserAvatar name={respTemp.designer} size="xs" /> Designer
          </Label>
          <Select
            value={respTemp.designer || '__none__'}
            onValueChange={(v) => setRespTemp((prev) => ({ ...prev, designer: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger id={`des-${demanda.id}`} className="h-8 text-xs">
              <SelectValue placeholder="Selecione o designer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum / Não atribuído</SelectItem>
              {designers.map((d) => {
                const val = typeof d === 'object' ? d.value || d.nome : d;
                const lbl = typeof d === 'object' ? d.label || d.nome : d;
                const avatar = typeof d === 'object' ? d.avatar_url : undefined;
                return (
                  <SelectItem key={val} value={val}>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={lbl} src={avatar} size="xs" />
                      <span>{lbl}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ven-${demanda.id}`} className="text-xs flex items-center gap-1.5">
            <UserAvatar name={respTemp.vendedor} size="xs" /> Vendedor
          </Label>
          <Select
            value={respTemp.vendedor || '__none__'}
            onValueChange={(v) => setRespTemp((prev) => ({ ...prev, vendedor: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger id={`ven-${demanda.id}`} className="h-8 text-xs">
              <SelectValue placeholder="Selecione o vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum / Não atribuído</SelectItem>
              {vendedores.map((v) => {
                const val = typeof v === 'object' ? v.value || v.nome : v;
                const lbl = typeof v === 'object' ? v.label || v.nome : v;
                const avatar = typeof v === 'object' ? v.avatar_url : undefined;
                return (
                  <SelectItem key={val} value={val}>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={lbl} src={avatar} size="xs" />
                      <span>{lbl}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`rev-${demanda.id}`} className="text-xs flex items-center gap-1.5">
            <UserAvatar name={respTemp.revenda} size="xs" /> Revenda
          </Label>
          <Select
            value={respTemp.revenda || '__none__'}
            onValueChange={(v) => setRespTemp((prev) => ({ ...prev, revenda: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger id={`rev-${demanda.id}`} className="h-8 text-xs">
              <SelectValue placeholder="Selecione a revenda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma revenda</SelectItem>
              {revendas.map((r) => {
                const val = typeof r === 'object' ? r.value || r.nome : r;
                const lbl = typeof r === 'object' ? r.label || r.nome : r;
                const avatar = typeof r === 'object' ? r.avatar_url : undefined;
                return (
                  <SelectItem key={val} value={val}>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={lbl} src={avatar} size="xs" />
                      <span>{lbl}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-1.5 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setResponsaveisPopoverOpen(false)} className="h-7 text-xs">Cancelar</Button>
          <Button size="sm" onClick={salvarResponsaveis} className="h-7 text-xs">Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    <div className="inline-flex items-center gap-2 py-0.5 px-0 text-xs text-muted-foreground flex-wrap">
      <span className="inline-flex items-center gap-1.5">
        <span>Designer:</span>
        <UserAvatar name={demanda.designer} size="xs" />
        <strong className="font-semibold text-foreground/90">{demanda.designer || '—'}</strong>
      </span>
      <span>·</span>
      <span className="inline-flex items-center gap-1.5">
        <span>Vendedor:</span>
        <UserAvatar name={demanda.vendedor} size="xs" />
        <strong className="font-semibold text-foreground/90">{demanda.vendedor || '—'}</strong>
      </span>
      {demanda.revenda && (
        <>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <span>Revenda:</span>
            <UserAvatar name={demanda.revenda} size="xs" />
            <strong className="font-semibold text-foreground/90">{demanda.revenda}</strong>
          </span>
        </>
      )}
    </div>
  );

  // Elemento: Ações do Topo (Enviar para Impressão / Concluir / Editar / Excluir)
  const acoesNode = (
    <div className="flex items-center gap-1.5 shrink-0">
      {canEdit && (
        <Button
          variant="default"
          size={viewMode === 'grade' ? 'icon' : 'sm'}
          onClick={() => onEnviarParaImpressao?.(demanda)}
          className={
            viewMode === 'grade'
              ? 'h-7 w-7 bg-foreground hover:bg-foreground/90 text-background transition shadow-xs rounded-lg cursor-pointer shrink-0'
              : 'h-7 px-2.5 text-xs font-semibold bg-foreground hover:bg-foreground/90 text-background transition shadow-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer'
          }
          title="Enviar demanda para a Fila de Impressão"
          aria-label="Enviar para Impressão"
        >
          <Printer size={13} className="stroke-[2.5]" />
          {viewMode !== 'grade' && <span>Enviar p/ Impressão</span>}
        </Button>
      )}
      {canEdit && (
        <Button
          variant="outline"
          size={viewMode === 'grade' ? 'icon' : 'sm'}
          onClick={() => onConcluir(demanda)}
          className={
            viewMode === 'grade'
              ? 'h-7 w-7 bg-background hover:bg-muted text-foreground transition shadow-xs rounded-lg cursor-pointer shrink-0'
              : 'h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted transition shadow-xs rounded-lg cursor-pointer'
          }
          title="Concluir demanda diretamente"
          aria-label="Concluir"
        >
          <Check size={13} className={viewMode === 'grade' ? 'stroke-[2.5]' : 'mr-1 stroke-[2]'} />
          {viewMode !== 'grade' && <span>Concluir</span>}
        </Button>
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(demanda)}
          className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg shrink-0"
          title="Editar demanda completa"
          aria-label="Editar"
        >
          <Pencil size={13} />
        </Button>
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(demanda)}
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
          title="Excluir demanda"
          aria-label="Excluir"
        >
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  );

  // Elemento: Etapa
  const etapaNode = (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground font-normal shrink-0">Etapa:</span>
      {canEdit ? (
        <Popover open={etapaPopoverOpen} onOpenChange={(o) => {
          if (o) setEtapaTemp(demanda.demanda || '');
          setEtapaPopoverOpen(o);
        }}>
          <PopoverTrigger asChild>
            <span
              className="text-foreground/90 font-normal cursor-pointer hover:text-primary transition hover:underline underline-offset-2 truncate"
              title="Clique para editar a etapa diretamente"
            >
              {demanda.demanda || <span className="text-muted-foreground/60 italic">Nenhuma etapa definida</span>}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 space-y-2.5" align="start">
            <Label htmlFor={`eta-${demanda.id}`} className="text-xs font-semibold">Editar etapa atual</Label>
            <Input
              id={`eta-${demanda.id}`}
              value={etapaTemp}
              onChange={(e) => setEtapaTemp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && salvarEtapa()}
              placeholder="O que precisa ser feito agora"
              autoFocus
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setEtapaPopoverOpen(false)} className="h-7 text-xs">Cancelar</Button>
              <Button size="sm" onClick={salvarEtapa} className="h-7 text-xs">Salvar</Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <span className="text-foreground/90 font-normal truncate">
          {demanda.demanda || <span className="text-muted-foreground/60 italic">Nenhuma etapa definida</span>}
        </span>
      )}
    </div>
  );

  // Elemento: Badges Interativos (Etiqueta, Prazo, Status, Fase da Arte)
  const badgesNode = (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">

      {/* Badge de Etiqueta (Interativo) */}
      {canEdit ? (
        <Popover open={etiquetaPopoverOpen} onOpenChange={setEtiquetaPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer transition-transform hover:scale-105"
              title="Clique para alterar a etiqueta"
            >
              {etiquetaCfg ? (
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
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/40 transition">
                  <Plus size={10} /> Etiqueta
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 space-y-1" align="start">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Alterar Etiqueta</div>
            {ETIQUETAS.map((e) => {
              const cfg = etiquetaConfig(e.valor);
              const isSelected = demanda.etiqueta === e.valor;
              return (
                <button
                  key={e.valor}
                  type="button"
                  onClick={() => {
                    onQuickUpdate?.(demanda, { etiqueta: e.valor });
                    setEtiquetaPopoverOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition ${
                    isSelected ? 'bg-accent font-semibold text-foreground' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.cor }} />
                    {e.label}
                  </span>
                  {isSelected && <Check size={13} className="text-foreground" />}
                </button>
              );
            })}
            {demanda.etiqueta && (
              <button
                type="button"
                onClick={() => {
                  onQuickUpdate?.(demanda, { etiqueta: '' });
                  setEtiquetaPopoverOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition"
              >
                <X size={13} /> Remover etiqueta
              </button>
            )}
          </PopoverContent>
        </Popover>
      ) : etiquetaCfg ? (
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
      ) : null}

      {/* Badge de Prazo (Interativo com Calendar) */}
      {canEdit ? (
        <Popover open={prazoPopoverOpen} onOpenChange={setPrazoPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer transition-transform hover:scale-105"
              title="Clique para alterar o prazo"
            >
              {demanda.prazo ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition font-medium ${prazoClass}`}
                >
                  <CalendarIcon size={12} />
                  {labelPrazo(demanda.prazo)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground/40 transition">
                  <Plus size={11} /> Prazo
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={prazoDate}
              onSelect={handleSelectPrazo}
              locale={ptBR}
              initialFocus
            />
            {demanda.prazo && (
              <div className="p-2 border-t border-border flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onQuickUpdate?.(demanda, { prazo: '' });
                    setPrazoPopoverOpen(false);
                  }}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X size={12} className="mr-1" /> Limpar prazo
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      ) : demanda.prazo ? (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${prazoClass}`}>
          <CalendarIcon size={12} />
          {labelPrazo(demanda.prazo)}
        </span>
      ) : null}

      {/* Badge de Status (Interativo) */}
      {canEdit ? (
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer transition-transform hover:scale-105"
              title="Clique para alterar o status"
            >
              {status ? (
                <span
                  style={{
                    backgroundColor: hexToRgba(status.cor || '#64748b', 0.14),
                    color: status.cor || '#64748b',
                    borderColor: hexToRgba(status.cor || '#64748b', 0.3),
                  }}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-2xs"
                >
                  {status.nome}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  Sem status
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 space-y-1" align="start">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Alterar Status</div>
            {statuses
              .slice()
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
              .map((st) => {
                const isSelected = demanda.status_id === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onQuickUpdate?.(demanda, { status_id: st.id });
                      setStatusPopoverOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition ${
                      isSelected ? 'bg-accent font-semibold text-foreground' : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: st.cor || '#64748b' }} />
                      <span className="truncate">{st.nome}</span>
                    </span>
                    {isSelected && <Check size={13} className="text-foreground shrink-0" />}
                  </button>
                );
              })}
          </PopoverContent>
        </Popover>
      ) : status ? (
        <span
          style={{
            backgroundColor: hexToRgba(status.cor || '#64748b', 0.14),
            color: status.cor || '#64748b',
            borderColor: hexToRgba(status.cor || '#64748b', 0.3),
          }}
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-2xs"
        >
          {status.nome}
        </span>
      ) : null}

      {/* Badge de Fase da Arte (Interativo) */}
      {canEdit ? (
        <Popover open={faseArtePopoverOpen} onOpenChange={setFaseArtePopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer transition-transform hover:scale-105"
              title="Clique para alterar a fase da arte do designer"
            >
              {faseArteCfg ? (
                <span
                  style={{
                    backgroundColor: hexToRgba(faseArteCfg.cor, 0.14),
                    color: faseArteCfg.cor,
                    borderColor: hexToRgba(faseArteCfg.cor, 0.35),
                  }}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-2xs"
                >
                  <Palette size={11} />
                  {faseArteCfg.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/40 transition">
                  <Palette size={10} /> Fase da arte
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 space-y-1" align="start">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fase da Arte (Designer)</div>
            {FASES_ARTE.map((f) => {
              const isSelected = demanda.fase_arte === f.valor;
              return (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => {
                    onQuickUpdate?.(demanda, { fase_arte: f.valor });
                    setFaseArtePopoverOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition text-left ${
                    isSelected ? 'bg-accent font-semibold text-foreground' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.cor }} />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{f.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{f.descricao}</div>
                    </div>
                  </div>
                  {isSelected && <Check size={13} className="text-foreground shrink-0 ml-1.5" />}
                </button>
              );
            })}
            {demanda.fase_arte && (
              <button
                type="button"
                onClick={() => {
                  onQuickUpdate?.(demanda, { fase_arte: '' });
                  setFaseArtePopoverOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition"
              >
                <X size={13} /> Limpar fase da arte
              </button>
            )}
          </PopoverContent>
        </Popover>
      ) : faseArteCfg ? (
        <span
          style={{
            backgroundColor: hexToRgba(faseArteCfg.cor, 0.14),
            color: faseArteCfg.cor,
            borderColor: hexToRgba(faseArteCfg.cor, 0.35),
          }}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-2xs"
        >
          <Palette size={11} />
          {faseArteCfg.label}
        </span>
      ) : null}
    </div>
  );

  // Elemento: Observação
  const observacaoNode = demanda.observacao ? (
    <p className="text-xs text-muted-foreground/90 italic line-clamp-2 pt-0.5">
      {demanda.observacao}
    </p>
  ) : null;

  // Elemento: Rodapé (Registrar Alteração & Histórico)
  const footerNode = (
    <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
      {canEdit ? (
        <button
          type="button"
          onClick={() => setAlteracaoOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Plus size={13} /> Registrar nova alteração
        </button>
      ) : <div />}

      {canViewHistory && (
        <button
          type="button"
          onClick={() => setHistoricoModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
          title="Ver histórico de alterações deste lead"
        >
          <History size={13} /> Histórico ({demanda.historico?.length || 0})
        </button>
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
              <span className="absolute -top-2.5 left-5 inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-background uppercase shadow-sm">
                PRÓXIMA TAREFA
              </span>
            )}

            {viewMode === 'grade' ? (
              /* LAYOUT MODO GRADE */
              <div className="flex flex-col justify-between h-full space-y-3">
                {/* Linha Topo da Grade: Drag + Número + Ações */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {canReorder && (
                      <button
                        {...provided.dragHandleProps}
                        disabled={dragDisabled}
                        className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing disabled:cursor-default p-0.5 transition-colors"
                        aria-label="Arrastar para reordenar"
                      >
                        <GripVertical size={16} />
                      </button>
                    )}
                    {canReorder && <div className="h-4 w-px bg-border/80" />}
                    <div className="font-bold tabular-nums text-sm text-foreground/90 leading-none">
                      #{String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                  {acoesNode}
                </div>

                {/* Corpo do Card em Grade */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="min-w-0">{clienteNode}</div>
                  <div className="min-w-0">{responsaveisNode}</div>
                  <div className="min-w-0">{etapaNode}</div>
                  {badgesNode}
                  {observacaoNode}
                </div>

                {/* Rodapé do Card */}
                {footerNode}
              </div>
            ) : (
              /* LAYOUT MODO LISTA */
              <div className="flex items-start gap-3">
                {/* Esquerda: Drag handle + Divisor + Número */}
                <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                  {canReorder && (
                    <button
                      {...provided.dragHandleProps}
                      disabled={dragDisabled}
                      className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing disabled:cursor-default p-0.5 transition-colors"
                      aria-label="Arrastar para reordenar"
                    >
                      <GripVertical size={18} />
                    </button>
                  )}
                  {canReorder && <div className="h-6 w-px bg-border/80" />}
                  <div className="w-7 text-center font-bold tabular-nums text-xl text-foreground/90 leading-none">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Centro e Direita: Conteúdo do Card */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Linha 1: Cliente | Ações */}
                  <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {clienteNode}
                    </div>

                    <div className="flex items-center gap-x-2 text-xs text-muted-foreground ml-auto">
                      {acoesNode}
                    </div>
                  </div>

                  {/* Linha 2: Responsáveis (Designer, Vendedor, Revenda) */}
                  <div className="min-w-0 -mt-1">
                    {responsaveisNode}
                  </div>

                  {/* Linha 3: Etapa */}
                  {etapaNode}

                  {/* Linha 3: Badges */}
                  {badgesNode}

                  {/* Observação */}
                  {observacaoNode}

                  {/* Linha 4: Rodapé */}
                  {footerNode}
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
              Registro completo de movimentações da demanda de <strong className="text-foreground">{demanda.cliente}</strong>.
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