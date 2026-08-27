import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RotateCcw, Calendar } from 'lucide-react';
import { localClient } from '@/api/localClient';
import StatusBadge from '@/components/demanda/StatusBadge';
import { formatarPrazoCompleto } from '@/lib/datas';

export default function Concluidos() {
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ds, sts] = await Promise.all([
        localClient.entities.Demanda.list('-updated_date', 500),
        localClient.entities.Status.list('ordem', 100),
      ]);
      setDemandas(ds);
      setStatuses(sts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const statusMap = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.id, s])),
    [statuses]
  );

  const concluidas = useMemo(
    () =>
      demandas
        .filter((d) => {
          const st = statusMap[d.status_id];
          return st && st.concluido;
        })
        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)),
    [demandas, statusMap]
  );

  const visiveis = useMemo(() => {
    if (!busca) return concluidas;
    const q = busca.toLowerCase();
    return concluidas.filter((d) =>
      `${d.cliente} ${d.demanda} ${d.vendedor} ${d.revenda}`.toLowerCase().includes(q)
    );
  }, [concluidas, busca]);

  async function reabrir(d) {
    const naoConcluido = statuses.find((s) => !s.concluido);
    if (!naoConcluido) {
      window.alert('Crie um status não concluído antes de reabrir uma demanda.');
      return;
    }
    const ativas = demandas.filter((d2) => {
      const st = statusMap[d2.status_id];
      return !st || !st.concluido;
    });
    const maxOrdem = ativas.reduce((m, x) => Math.max(m, x.ordem ?? 0), -1);
    await localClient.entities.Demanda.update(d.id, { status_id: naoConcluido.id, ordem: maxOrdem + 1 });
    setDemandas((prev) => prev.filter((x) => x.id !== d.id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Concluídos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Demandas finalizadas. Reabra para voltar à fila de prioridades.
        </p>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar concluídos"
          className="w-full h-9 rounded-lg border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {busca ? 'Nenhuma demanda encontrada.' : 'Nenhuma demanda concluída ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visiveis.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight truncate">{d.cliente}</h3>
                  {d.demanda && <p className="text-sm text-foreground/80 mt-0.5">{d.demanda}</p>}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1.5">
                    {d.vendedor && <span>{d.vendedor}</span>}
                    {d.vendedor && d.revenda && <span>·</span>}
                    {d.revenda && <span>Revenda {d.revenda}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {d.prazo && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar size={11} /> {formatarPrazoCompleto(d.prazo)}
                      </span>
                    )}
                    <StatusBadge status={statusMap[d.status_id]} />
                  </div>
                  {d.observacao && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                      {d.observacao}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => reabrir(d)}
                  className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-input text-sm hover:bg-muted transition"
                >
                  <RotateCcw size={14} /> Reabrir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
