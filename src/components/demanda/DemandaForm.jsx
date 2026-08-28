import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import UserAvatar from '@/components/ui/UserAvatar';
import { Plus, History, Layers } from 'lucide-react';
import StatusSelect from './StatusSelect';
import HistoricoPainel from './HistoricoPainel';
import RegistrarAlteracaoDialog from './RegistrarAlteracaoDialog';
import { ETIQUETAS, etiquetaConfig } from '@/lib/etiquetas';
import { FASES_ARTE, faseArteConfig } from '@/lib/progressoArte';
import { ACABAMENTOS } from '@/lib/acabamentos';
import { hexToRgba } from '@/lib/statusColors';

const VAZIO = {
  cliente: '',
  demanda: '',
  revenda: '',
  vendedor: '',
  designer: '',
  fase_arte: '',
  prazo: '',
  status_id: '',
  etiqueta: '',
  acabamento: 'Autocolante',
  observacao: '',
};

export default function DemandaForm({
  open,
  onClose,
  onSave,
  demanda,
  statuses,
  vendedores = [],
  revendas = [],
  designers = [],
  onCriarStatus,
  onGerenciarStatus,
  onRegistrarAlteracao,
}) {
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [alteracaoOpen, setAlteracaoOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const base = demanda
        ? {
            cliente: demanda.cliente || '',
            demanda: demanda.demanda || '',
            revenda: demanda.revenda || '',
            vendedor: demanda.vendedor || '',
            designer: demanda.designer || '',
            fase_arte: demanda.fase_arte || '',
            prazo: demanda.prazo || '',
            status_id: demanda.status_id || '',
            etiqueta: demanda.etiqueta || '',
            acabamento: demanda.acabamento || 'Autocolante',
            observacao: demanda.observacao || '',
          }
        : VAZIO;
      setForm(base);
      setHistoricoOpen(false);
    }
  }, [open, demanda]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar() {
    if (!form.cliente.trim()) return;
    setSalvando(true);
    try {
      await onSave({
        cliente: (form.cliente || '').trim(),
        demanda: (form.demanda || '').trim(),
        revenda: (form.revenda || '').trim(),
        vendedor: (form.vendedor || '').trim(),
        designer: (form.designer || '').trim(),
        fase_arte: form.fase_arte || '',
        prazo: form.prazo || '',
        status_id: form.status_id || '',
        etiqueta: form.etiqueta || '',
        acabamento: form.acabamento || 'Autocolante',
        observacao: (form.observacao || '').trim(),
      });
    } catch (err) {
      console.error('[DemandaForm] Erro ao salvar demanda:', err);
      window.alert(`Não foi possível salvar a demanda: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAlteracao(novoTexto) {
    if (demanda && onRegistrarAlteracao) {
      await onRegistrarAlteracao(demanda, novoTexto);
      setAlteracaoOpen(false);
      onClose();
    }
  }

  const historico = demanda?.historico || [];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{demanda ? 'Editar demanda' : 'Nova demanda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 px-1.5 max-h-[72vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="cliente">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliente"
                value={form.cliente}
                onChange={(e) => set('cliente', e.target.value)}
                placeholder="Nome do cliente"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="demanda">Situação atual</Label>
                {demanda && (
                  <button
                    type="button"
                    onClick={() => setAlteracaoOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus size={13} /> Registrar nova alteração
                  </button>
                )}
              </div>
              <Input
                id="demanda"
                value={form.demanda}
                onChange={(e) => set('demanda', e.target.value)}
                placeholder="O que precisa ser feito agora"
              />
              {demanda && historico.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoricoOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                >
                  <History size={13} />
                  {historicoOpen ? 'Ocultar histórico' : `Ver histórico (${historico.length})`}
                </button>
              )}
              {demanda && historicoOpen && (
                <div className="mt-2 border rounded-lg p-3 bg-muted/30">
                  <HistoricoPainel historico={historico} />
                </div>
              )}
            </div>

            {/* Acabamento para Fábrica */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Layers size={13} /> Acabamento (Fábrica)
              </Label>
              <div className="flex flex-wrap gap-2">
                {ACABAMENTOS.map((a) => {
                  const selecionado = form.acabamento === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => set('acabamento', a.id)}
                      style={
                        selecionado
                          ? {
                              backgroundColor: a.corBg,
                              color: a.cor,
                              borderColor: a.corBorder,
                            }
                          : undefined
                      }
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selecionado ? 'ring-1 ring-primary/20 shadow-2xs' : 'border-input text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Urgência / Etiqueta</Label>
              <div className="flex flex-wrap gap-2">
                {ETIQUETAS.map((e) => {
                  const selecionada = form.etiqueta === e.valor;
                  const cfg = etiquetaConfig(e.valor);
                  return (
                    <button
                      key={e.valor}
                      type="button"
                      onClick={() => set('etiqueta', selecionada ? '' : e.valor)}
                      style={
                        selecionada
                          ? {
                              backgroundColor: hexToRgba(cfg.cor, 0.16),
                              color: cfg.cor,
                              borderColor: hexToRgba(cfg.cor, 0.4),
                            }
                          : undefined
                      }
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selecionada ? '' : 'border-input text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {e.label}
                    </button>
                  );
                })}
                {!form.etiqueta && <span className="text-xs text-muted-foreground self-center">Nenhuma</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fase da arte (Designer)</Label>
              <div className="flex flex-wrap gap-2">
                {FASES_ARTE.map((f) => {
                  const selecionada = form.fase_arte === f.valor;
                  const cfg = faseArteConfig(f.valor);
                  return (
                    <button
                      key={f.valor}
                      type="button"
                      onClick={() => set('fase_arte', selecionada ? '' : f.valor)}
                      style={
                        selecionada
                          ? {
                              backgroundColor: hexToRgba(cfg.cor, 0.16),
                              color: cfg.cor,
                              borderColor: hexToRgba(cfg.cor, 0.4),
                            }
                          : undefined
                      }
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selecionada ? 'font-semibold' : 'border-input text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
                {!form.fase_arte && <span className="text-xs text-muted-foreground self-center">Não iniciada</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="revenda">Revenda</Label>
                <Select
                  value={form.revenda || '__none__'}
                  onValueChange={(v) => set('revenda', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="revenda" className="h-10 text-sm">
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
              <div className="space-y-1.5">
                <Label htmlFor="vendedor">Vendedor</Label>
                <Select
                  value={form.vendedor || '__none__'}
                  onValueChange={(v) => set('vendedor', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="vendedor" className="h-10 text-sm">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="designer">Designer</Label>
                <Select
                  value={form.designer || '__none__'}
                  onValueChange={(v) => set('designer', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="designer" className="h-10 text-sm">
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
                <Label htmlFor="prazo">Prazo</Label>
                <DatePicker
                  value={form.prazo}
                  onChange={(v) => set('prazo', v)}
                  placeholder="Selecione o prazo..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <StatusSelect
                statuses={statuses}
                value={form.status_id}
                onChange={(v) => set('status_id', v)}
                onCriarNovo={onCriarStatus}
                onGerenciar={onGerenciarStatus}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
                placeholder="Informações complementares (opcional)"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!form.cliente.trim() || salvando}>
              {salvando ? 'Salvando...' : demanda ? 'Salvar alterações' : 'Adicionar à fila'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegistrarAlteracaoDialog
        open={alteracaoOpen}
        onClose={() => setAlteracaoOpen(false)}
        onConfirm={confirmarAlteracao}
      />
    </>
  );
}
