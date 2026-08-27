import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, History } from 'lucide-react';
import StatusSelect from './StatusSelect';
import HistoricoPainel from './HistoricoPainel';
import RegistrarAlteracaoDialog from './RegistrarAlteracaoDialog';
import { ETIQUETAS, etiquetaConfig } from '@/lib/etiquetas';
import { hexToRgba } from '@/lib/statusColors';

const VAZIO = {
  cliente: '',
  demanda: '',
  revenda: '',
  vendedor: '',
  prazo: '',
  status_id: '',
  etiqueta: '',
  observacao: '',
};

export default function DemandaForm({
  open,
  onClose,
  onSave,
  demanda,
  statuses,
  vendedores,
  revendas,
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
            prazo: demanda.prazo || '',
            status_id: demanda.status_id || '',
            etiqueta: demanda.etiqueta || '',
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
        prazo: form.prazo || '',
        status_id: form.status_id || '',
        etiqueta: form.etiqueta || '',
        observacao: (form.observacao || '').trim(),
      });
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
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
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

            <div className="space-y-1.5">
              <Label>Etiqueta</Label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="revenda">Revenda</Label>
                <Input
                  id="revenda"
                  list="revendas-list"
                  value={form.revenda}
                  onChange={(e) => set('revenda', e.target.value)}
                  placeholder="Revenda relacionada"
                />
                <datalist id="revendas-list">
                  {revendas.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendedor">Vendedor</Label>
                <Input
                  id="vendedor"
                  list="vendedores-list"
                  value={form.vendedor}
                  onChange={(e) => set('vendedor', e.target.value)}
                  placeholder="Vendedor responsável"
                />
                <datalist id="vendedores-list">
                  {vendedores.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prazo">Prazo</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={form.prazo}
                  onChange={(e) => set('prazo', e.target.value)}
                />
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <textarea
                id="observacao"
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
                placeholder="Informações complementares (opcional)"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
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
