import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/demanda/StatusBadge';
import { Trash2, AlertTriangle, User, Calendar, UserCheck, Store, Palette, Loader2 } from 'lucide-react';
import { formatarPrazoCompleto } from '@/lib/datas';

export default function ExcluirDemandaDialog({
  open,
  onClose,
  onConfirm,
  demanda,
  status,
  loading = false,
}) {
  if (!demanda) return null;

  async function handleConfirm() {
    if (onConfirm) {
      await onConfirm(demanda);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Excluir Demanda
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                Esta ação não pode ser revertida.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Card Resumo da Demanda / Lead */}
        <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2.5 my-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <User className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{demanda.cliente}</span>
            </div>
            {status && <StatusBadge status={status} />}
          </div>

          {demanda.demanda && (
            <div className="text-xs text-muted-foreground flex items-baseline gap-1.5">
              <span className="font-medium text-foreground/80 shrink-0">Etapa:</span>
              <span className="truncate text-foreground/90 font-normal">{demanda.demanda}</span>
            </div>
          )}

          {/* Chips informativos adicionais */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
            {demanda.vendedor && (
              <span className="inline-flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-muted-foreground/80" />
                <span>{demanda.vendedor}</span>
              </span>
            )}
            {demanda.revenda && (
              <span className="inline-flex items-center gap-1">
                <Store className="w-3 h-3 text-muted-foreground/80" />
                <span>{demanda.revenda}</span>
              </span>
            )}
            {demanda.designer && (
              <span className="inline-flex items-center gap-1">
                <Palette className="w-3 h-3 text-muted-foreground/80" />
                <span>{demanda.designer}</span>
              </span>
            )}
            {demanda.prazo && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground/80" />
                <span>{formatarPrazoCompleto(demanda.prazo)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Alerta de confirmação */}
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Tem certeza que deseja remover este cliente? Todos os dados e o histórico de alterações serão apagados permanentemente.
          </p>
        </div>

        <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="mt-0 cursor-pointer text-xs h-9"
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="cursor-pointer text-xs h-9 gap-1.5 font-medium shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Excluir demanda
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
