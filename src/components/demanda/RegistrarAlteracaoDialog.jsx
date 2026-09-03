import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Plus, Minus, Sparkles, Check } from 'lucide-react';
import { isStatusRevisao, isStatusPausa, calcularPrazoFuturo, formatarPrazoCompleto } from '@/lib/datas';

export default function RegistrarAlteracaoDialog({ open, onClose, onConfirm, demanda }) {
  const [texto, setTexto] = useState('');
  const [diasAdicionar, setDiasAdicionar] = useState(0);
  const [mudarParaStatus, setMudarParaStatus] = useState(null); // 'status_amostra' | 'status_criacao' | null

  const emRevisao = useMemo(() => isStatusRevisao(demanda), [demanda]);
  const emPausa = useMemo(() => isStatusPausa(demanda), [demanda]);

  useEffect(() => {
    if (open) {
      setTexto('');
      setDiasAdicionar(0);
      setMudarParaStatus(null);
    }
  }, [open]);

  const previewNovoPrazo = useMemo(() => {
    if (mudarParaStatus) {
      const prazoAuto = calcularPrazoFuturo(1);
      return formatarPrazoCompleto(prazoAuto);
    }
    if (diasAdicionar === 0) return null;
    const base = demanda?.prazo ? new Date(demanda.prazo + 'T12:00:00') : new Date();
    const novoPrazoCalculado = calcularPrazoFuturo(diasAdicionar, base);
    return formatarPrazoCompleto(novoPrazoCalculado);
  }, [demanda?.prazo, diasAdicionar, mudarParaStatus]);

  function confirmar() {
    if (!texto.trim()) return;
    let novoPrazo = null;
    let diasAjustados = diasAdicionar;
    let novoStatusId = null;

    if (mudarParaStatus) {
      novoStatusId = mudarParaStatus;
      novoPrazo = calcularPrazoFuturo(1);
      diasAjustados = 1;
    } else if (diasAdicionar !== 0) {
      const base = demanda?.prazo ? new Date(demanda.prazo + 'T12:00:00') : new Date();
      novoPrazo = calcularPrazoFuturo(diasAdicionar, base);
    }

    onConfirm(texto.trim(), { novoPrazo, diasAjustados, novoStatusId });
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

          {/* Se a demanda estiver em Revisão, atalho inteligente para colocar em Amostra (prazo de 1 dia) */}
          {emRevisao && (
            <div
              onClick={() => {
                setMudarParaStatus((prev) => {
                  const proximo = prev === 'status_amostra' ? null : 'status_amostra';
                  if (proximo) setDiasAdicionar(0);
                  return proximo;
                });
              }}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                mudarParaStatus === 'status_amostra'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-2xs'
                  : 'bg-muted/50 border-border hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    mudarParaStatus === 'status_amostra'
                      ? 'bg-cyan-500 border-cyan-600 text-white'
                      : 'border-muted-foreground/40 bg-card'
                  }`}
                >
                  {mudarParaStatus === 'status_amostra' && <Check size={11} className="stroke-[3]" />}
                </div>
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <Sparkles size={12} className={mudarParaStatus === 'status_amostra' ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground'} />
                    Voltar para status "Amostra"
                  </div>
                  <div className="text-[10px] opacity-80">
                    Define prazo automático de 1 dia para confecção da amostra
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-card border border-border/60">
                +1 dia
              </span>
            </div>
          )}

          {/* Se a demanda estiver em Pausa/Parado/Pendente, atalho para reativar e voltar para Criação (prazo de 1 dia) */}
          {emPausa && (
            <div
              onClick={() => {
                setMudarParaStatus((prev) => {
                  const proximo = prev === 'status_criacao' ? null : 'status_criacao';
                  if (proximo) setDiasAdicionar(0);
                  return proximo;
                });
              }}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                mudarParaStatus === 'status_criacao'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'bg-muted/50 border-border hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    mudarParaStatus === 'status_criacao'
                      ? 'bg-amber-500 border-amber-600 text-white'
                      : 'border-muted-foreground/40 bg-card'
                  }`}
                >
                  {mudarParaStatus === 'status_criacao' && <Check size={11} className="stroke-[3]" />}
                </div>
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <Sparkles size={12} className={mudarParaStatus === 'status_criacao' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'} />
                    Reativar e retornar para "Criação"
                  </div>
                  <div className="text-[10px] opacity-80">
                    Descongela a demanda e define novo prazo de 1 dia (amanhã)
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-card border border-border/60">
                +1 dia
              </span>
            </div>
          )}

          {/* Opção para aumentar o prazo de entrega */}
          <div className={`p-2.5 rounded-lg bg-secondary/60 border border-border/80 space-y-2 text-xs ${mudarParaStatus ? 'opacity-40 pointer-events-none' : ''}`}>
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

            {previewNovoPrazo && !mudarParaStatus && (
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  <span>Novo prazo:</span>
                </span>
                <span className="font-bold">{previewNovoPrazo} (+{diasAdicionar} {diasAdicionar === 1 ? 'dia útil' : 'dias úteis'})</span>
              </div>
            )}
          </div>

          {previewNovoPrazo && mudarParaStatus && (
            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/25 text-primary font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" />
                <span>Novo prazo ({mudarParaStatus === 'status_amostra' ? 'Amostra' : 'Criação'}):</span>
              </span>
              <span className="font-bold">{previewNovoPrazo} (1 dia útil)</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!texto.trim()} className="h-8 text-xs font-semibold">
            {mudarParaStatus
              ? `Registrar e ir para ${mudarParaStatus === 'status_amostra' ? 'Amostra' : 'Criação'} (+1d)`
              : diasAdicionar > 0
              ? `Registrar (+${diasAdicionar}d)`
              : 'Registrar alteração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}