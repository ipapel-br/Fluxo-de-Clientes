import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RotateCcw, Calendar, Palette, Layers, UserCheck, History } from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/demanda/StatusBadge';
import EtiquetaBadge from '@/components/demanda/EtiquetaBadge';
import HistoricoPainel from '@/components/demanda/HistoricoPainel';
import UserAvatar from '@/components/ui/UserAvatar';
import AcessoNegado from '@/components/auth/AcessoNegado';
import { formatarPrazoCompleto } from '@/lib/datas';
import { faseArteConfig } from '@/lib/progressoArte';
import { acabamentoConfig } from '@/lib/acabamentos';
import { hexToRgba } from '@/lib/statusColors';
import { useAuth } from '@/contexts/AuthContext';
import { formatarDataHistorico } from '@/lib/historico';
import { emitirNotificacao, NOTIFICATION_TYPES } from '@/lib/notificationService';

export default function Concluidos() {
  const { usuario, can } = useAuth();
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [historicoModalDemanda, setHistoricoModalDemanda] = useState(null);

  const canReopen = can('completed_reopen');
  const canViewHistory = can('history_view');

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
        .sort((a, b) => new Date(b.completed_at || b.updated_date) - new Date(a.completed_at || a.updated_date)),
    [demandas, statusMap]
  );

  const visiveis = useMemo(() => {
    if (!busca) return concluidas;
    const q = busca.toLowerCase();
    return concluidas.filter((d) =>
      `${d.cliente} ${d.demanda || ''} ${d.vendedor || ''} ${d.revenda || ''} ${d.designer || ''} ${d.acabamento || ''}`.toLowerCase().includes(q)
    );
  }, [concluidas, busca]);

  async function reabrir(d) {
    if (!canReopen) return;
    const naoConcluido = statuses.find((s) => !s.concluido);
    if (!naoConcluido) {
      window.alert('Crie um status não concluído antes de reabrir uma demanda.');
      return;
    }

    // Identificar de onde a demanda veio antes de ser concluída:
    // Analisamos o último evento de conclusão no histórico
    const ultimoEventoConclusao = (d.historico || []).find(
      (h) => h.tipo === 'conclusao_impressao' || h.tipo === 'conclusao'
    );

    let veioDeImpressao = false;
    if (ultimoEventoConclusao) {
      veioDeImpressao = ultimoEventoConclusao.tipo === 'conclusao_impressao';
    } else {
      veioDeImpressao = d.factory_status === 'impresso';
    }

    const ativas = demandas.filter((d2) => {
      const st = statusMap[d2.status_id];
      return !st || !st.concluido;
    });
    const maxOrdem = ativas.reduce((m, x) => Math.max(m, x.ordem ?? 0), -1);

    const entrada = {
      texto: veioDeImpressao ? 'Demanda reaberta para a Fila de Impressão' : 'Demanda reaberta para a Fila de Prioridades',
      data: new Date().toISOString(),
      tipo: 'reabertura',
      usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
    };
    const historico = [entrada, ...(d.historico || [])];

    const patch = {
      status_id: naoConcluido.id,
      ordem: maxOrdem + 1,
      design_position: maxOrdem + 1,
      completed_at: null,
      completed_by: null,
      factory_status: veioDeImpressao ? 'aguardando' : 'pendente_design',
      historico,
    };

    await localClient.entities.Demanda.update(d.id, patch);

    emitirNotificacao({
      demanda: { ...d, ...patch },
      autor: usuario,
      tipo: NOTIFICATION_TYPES.REABERTURA,
      titulo: 'Demanda reaberta',
      mensagem: `${usuario?.nome || 'Alguém'} reabriu a demanda de "${d.cliente}" para ${
        veioDeImpressao ? 'a fila de impressão' : 'a fila de prioridades'
      }.`,
      link_path: veioDeImpressao ? '/impressao' : '/',
    });

    setDemandas((prev) => prev.filter((x) => x.id !== d.id));
  }

  if (!can('completed_view')) {
    return <AcessoNegado mensagem="Você não possui permissão para visualizar as demandas concluídas." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Concluídos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Demandas e impressões finalizadas. Reabra para retornar à fila ativa de trabalho.
        </p>
      </div>

      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar concluídos..."
          className="h-9 sm:h-10 pl-8 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground rounded-2xl border border-dashed border-border bg-card/40 p-8">
          {busca ? 'Nenhuma demanda encontrada com este termo.' : 'Nenhuma demanda concluída ainda.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visiveis.map((d) => {
            const acabamentoCfg = acabamentoConfig(d.acabamento || 'Autocolante');
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs hover:border-foreground/20 transition">
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-base leading-snug break-words text-foreground">{d.cliente}</h3>
                    {d.demanda && <p className="text-xs sm:text-sm text-foreground/80 mt-0.5">{d.demanda}</p>}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      {d.designer && (
                        <span className="inline-flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                          <span className="text-muted-foreground/80 font-normal">Designer:</span>
                          <UserAvatar name={d.designer} size="xs" />
                          <strong className="font-semibold text-foreground">{d.designer}</strong>
                        </span>
                      )}
                      {d.vendedor && (
                        <span className="inline-flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                          <span className="text-muted-foreground/80 font-normal">Vendedor:</span>
                          <UserAvatar name={d.vendedor} size="xs" />
                          <strong className="font-semibold text-foreground">{d.vendedor}</strong>
                        </span>
                      )}
                      {d.revenda && (
                        <span className="inline-flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                          <span className="text-muted-foreground/80 font-normal">Revenda:</span>
                          <UserAvatar name={d.revenda} size="xs" />
                          <strong className="font-semibold text-foreground">{d.revenda}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Acabamento */}
                      <span
                        style={{
                          backgroundColor: acabamentoCfg.corBg,
                          color: acabamentoCfg.cor,
                          borderColor: acabamentoCfg.corBorder,
                        }}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                      >
                        <Layers size={11} />
                        {acabamentoCfg.label}
                      </span>

                      {d.etiqueta && <EtiquetaBadge etiqueta={d.etiqueta} />}

                      {faseArteConfig(d.fase_arte) && (
                        <span
                          style={{
                            backgroundColor: hexToRgba(faseArteConfig(d.fase_arte).cor, 0.14),
                            color: faseArteConfig(d.fase_arte).cor,
                            borderColor: hexToRgba(faseArteConfig(d.fase_arte).cor, 0.35),
                          }}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                        >
                          <Palette size={10} />
                          {faseArteConfig(d.fase_arte).label}
                        </span>
                      )}

                      {d.prazo && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={11} /> {formatarPrazoCompleto(d.prazo)}
                        </span>
                      )}

                      <StatusBadge status={statusMap[d.status_id]} />
                    </div>

                    {/* Data de conclusão e responsável */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40 flex-wrap">
                      {d.completed_at && (
                        <span>Concluído em: <strong>{formatarDataHistorico(d.completed_at)}</strong></span>
                      )}
                      {d.completed_by && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <UserCheck size={12} /> Por: <strong>{d.completed_by}</strong>
                          </span>
                        </>
                      )}
                      {canViewHistory && (
                        <button
                          type="button"
                          onClick={() => setHistoricoModalDemanda(d)}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition cursor-pointer"
                        >
                          <History size={12} /> Histórico ({d.historico?.length || 0})
                        </button>
                      )}
                    </div>

                    {d.observacao && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                        {d.observacao}
                      </p>
                    )}
                  </div>

                  {canReopen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reabrir(d)}
                      className="shrink-0 h-8 px-2.5 text-xs font-semibold shadow-xs"
                    >
                      <RotateCcw size={13} className="mr-1" /> Reabrir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Histórico */}
      <Dialog open={Boolean(historicoModalDemanda)} onOpenChange={(open) => !open && setHistoricoModalDemanda(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History size={18} /> Histórico de Alterações
            </DialogTitle>
            <DialogDescription className="text-xs">
              Histórico da demanda concluída de <strong className="text-foreground">{historicoModalDemanda?.cliente}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <HistoricoPainel historico={historicoModalDemanda?.historico} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
