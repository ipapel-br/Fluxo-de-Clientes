import { formatarDataHistorico } from '@/lib/historico';

export default function HistoricoPainel({ historico }) {
  const entradas = historico || [];
  if (entradas.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-2">Nenhum registro ainda.</p>;
  }
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {entradas.map((e, i) => (
        <div key={i} className="text-sm border-l-2 border-border pl-3">
          <p className="text-xs text-muted-foreground">{formatarDataHistorico(e.data)}</p>
          <p className={e.tipo === 'situacao' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
            {e.texto}
          </p>
        </div>
      ))}
    </div>
  );
}