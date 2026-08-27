import { Clock, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { formatarDataHistorico } from '@/lib/historico';
import UserAvatar from '@/components/ui/UserAvatar';

function getIconeTipo(tipo) {
  switch (tipo) {
    case 'criacao':
      return <Sparkles size={13} className="text-sky-500" />;
    case 'conclusao':
      return <CheckCircle2 size={13} className="text-emerald-500" />;
    case 'reabertura':
      return <RotateCcw size={13} className="text-amber-500" />;
    default:
      return <Clock size={13} className="text-muted-foreground" />;
  }
}

export default function HistoricoPainel({ historico }) {
  const entradas = historico || [];
  if (entradas.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground italic">
        Nenhum registro no histórico ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
      {entradas.map((e, i) => {
        const autor = e.usuario?.nome ? e.usuario : null;

        return (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition text-xs"
          >
            <UserAvatar
              name={autor ? autor.nome : 'Sistema'}
              size="md"
              className="shrink-0"
            />

            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-foreground truncate">
                    {autor ? autor.nome : 'Sistema'}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                  {formatarDataHistorico(e.data)}
                </span>
              </div>

              <div className="flex items-start gap-1.5 pt-0.5">
                <span className="mt-0.5 shrink-0">{getIconeTipo(e.tipo)}</span>
                <p
                  className={
                    e.tipo === 'situacao'
                      ? 'text-foreground font-medium break-words leading-relaxed'
                      : 'text-muted-foreground break-words leading-relaxed'
                  }
                >
                  {e.texto}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}