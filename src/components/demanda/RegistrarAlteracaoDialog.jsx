import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Plus, Minus } from 'lucide-react';

export default function RegistrarAlteracaoDialog({ open, onClose, onConfirm, demanda }) {
  const [texto, setTexto] = useState('');
  const [diasAdicionar, setDiasAdicionar] = useState(0);

  useEffect(() => {
    if (open) {
      setTexto('');
      setDiasAdicionar(0);
    }
  }, [open]);

  const previewNovoPrazo = useMemo(() => {
    if (diasAdicionar === 0) return null;
    const base = demanda?.prazo ? new Date(demanda.prazo + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + diasAdicionar);
    const d = String(base.getDate()).padStart(2, '0');
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const y = base.getFullYear();
    return `${d}/${m}/${y}`;
  }, [demanda?.prazo, diasAdicionar]);

  function confirmar() {
    if (!texto.trim()) return;
    let novoPrazo = null;
    if (diasAdicionar !== 0) {
      const base = demanda?.prazo ? new Date(demanda.prazo + 'T12:00:00') : new Date();
      base.setDate(base.getDate() + diasAdicionar);
      const y = base.getFullYear();
      const m = String(base.getMonth() + 1).padStart(2, '0');
      const d = String(base.getDate()).padStart(2, '0');
      novoPrazo = `${y}-${m}-${d}`;
    }
    onConfirm(texto.trim(), { novoPrazo, diasAjustados: diasAdicionar });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Nova situação / alteração {demanda?.cliente ? `· ${demanda.cliente}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Descreva o que o cliente solicitou..."
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmar();
            }}
            className="resize-none text-xs bg-background border-border text-foreground"
          />

          {/* Opção para aumentar o prazo de entrega */}
          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border/80 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Clock size={13} className="text-amber-500" />
                <span>Estender prazo de entrega:</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDiasAdicionar((prev) => Math.max(0, prev - 1))}
                  disabled={diasAdicionar === 0}
                  className="h-6 w-6 rounded flex items-center justify-center bg-card hover:bg-accent text-foreground disabled:opacity-30 transition cursor-pointer"
                  title="Diminuir 1 dia"
                >
                  <Minus size={11} />
                </button>

                <div className="px-2 py-0.5 rounded bg-card text-xs font-bold tabular-nums min-w-[58px] text-center border border-border/60">
                  {diasAdicionar === 0 ? '0 dias' : `+${diasAdicionar} ${diasAdicionar === 1 ? 'dia' : 'dias'}`}
                </div>

                <button
                  type="button"
                  onClick={() => setDiasAdicionar((prev) => prev + 1)}
                  className="h-6 w-6 rounded flex items-center justify-center bg-card hover:bg-accent text-foreground transition cursor-pointer"
                  title="Aumentar +1 dia"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 pt-0.5">
              <span className="text-[10px] text-muted-foreground/75">Atalhos rápidos:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiasAdicionar(d)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                      diasAdicionar === d
                        ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
                        : 'bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60'
                    }`}
                  >
                    +{d}d
                  </button>
                ))}
                {diasAdicionar > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiasAdicionar(0)}
                    className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {previewNovoPrazo && (
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span>Novo prazo:</span>
                </span>
                <span className="font-bold">{previewNovoPrazo} (+{diasAdicionar} {diasAdicionar === 1 ? 'dia' : 'dias'})</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!texto.trim()} className="h-8 text-xs font-semibold">
            {diasAdicionar > 0 ? `Registrar (+${diasAdicionar}d)` : 'Registrar alteração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}