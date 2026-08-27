import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Button } from '@/components/ui/button';
import DemandaItem from '@/components/demanda/DemandaItem';
import DemandaForm from '@/components/demanda/DemandaForm';
import Filtros from '@/components/demanda/Filtros';
import StatusForm from '@/components/demanda/StatusForm';
import StatusManager from '@/components/demanda/StatusManager';
import { gerarEntradasEdicao, entradaSituacao, entradaStatus } from '@/lib/historico';

export default function Prioridades() {
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', vendedor: '', revenda: '', status: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ds, sts] = await Promise.all([
        localClient.entities.Demanda.list('ordem', 500),
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

  const ativas = useMemo(
    () =>
      demandas
        .filter((d) => {
          const st = statusMap[d.status_id];
          return !st || !st.concluido;
        })
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [demandas, statusMap]
  );

  const filtrando = !!(filtros.busca || filtros.vendedor || filtros.revenda || filtros.status);

  const visiveis = useMemo(() => {
    if (!filtrando) return ativas;
    return ativas.filter((d) => {
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!`${d.cliente} ${d.demanda} ${d.revenda}`.toLowerCase().includes(q)) return false;
      }
      if (filtros.vendedor && d.vendedor !== filtros.vendedor) return false;
      if (filtros.revenda && d.revenda !== filtros.revenda) return false;
      if (filtros.status && d.status_id !== filtros.status) return false;
      return true;
    });
  }, [ativas, filtros, filtrando]);

  const vendedores = useMemo(
    () => [...new Set(demandas.map((d) => d.vendedor).filter(Boolean))].sort(),
    [demandas]
  );
  const revendas = useMemo(
    () => [...new Set(demandas.map((d) => d.revenda).filter(Boolean))].sort(),
    [demandas]
  );

  async function onDragEnd(result) {
    if (!result.destination || result.source.index === result.destination.index) return;
    const itens = [...ativas];
    const [movido] = itens.splice(result.source.index, 1);
    itens.splice(result.destination.index, 0, movido);
    const novos = itens.map((d, i) => ({ id: d.id, ordem: i }));
    const ordemMap = Object.fromEntries(itens.map((d, i) => [d.id, i]));
    setDemandas((prev) =>
      prev.map((d) => (ordemMap[d.id] !== undefined ? { ...d, ordem: ordemMap[d.id] } : d))
    );
    try {
      await localClient.entities.Demanda.bulkUpdate(novos);
    } catch {
      carregar();
    }
  }

  async function salvarDemanda(data) {
    if (editando) {
      const entradas = gerarEntradasEdicao(editando, data, statusMap);
      const historico = [...entradas, ...(editando.historico || [])];
      const atualizada = await localClient.entities.Demanda.update(editando.id, { ...data, historico });
      setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? atualizada : d)));
      setEditando(null);
    } else {
      const historico = data.demanda ? [entradaSituacao(data.demanda)] : [];
      const maxOrdem = ativas.reduce((m, d) => Math.max(m, d.ordem ?? 0), -1);
      const nova = await localClient.entities.Demanda.create({ ...data, historico, ordem: maxOrdem + 1 });
      setDemandas((prev) => [...prev, nova]);
    }
    setFormOpen(false);
  }

  async function excluirDemanda(demanda) {
    if (!window.confirm(`Excluir a demanda de "${demanda.cliente}"?`)) return;
    await localClient.entities.Demanda.delete(demanda.id);
    setDemandas((prev) => prev.filter((d) => d.id !== demanda.id));
  }

  async function concluirDemanda(demanda) {
    const concluidoStatus = statuses.find((s) => s.concluido);
    if (!concluidoStatus) {
      window.alert('Crie um status marcado como concluído primeiro.');
      return;
    }
    const entrada = entradaStatus(statusMap[demanda.status_id]?.nome, concluidoStatus.nome);
    const historico = [entrada, ...(demanda.historico || [])];
    const atualizada = await localClient.entities.Demanda.update(demanda.id, {
      status_id: concluidoStatus.id,
      historico,
    });
    setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? atualizada : d)));
  }

  async function registrarAlteracao(demanda, novoTexto) {
    const entrada = entradaSituacao(novoTexto);
    const historico = [entrada, ...(demanda.historico || [])];
    const atualizada = await localClient.entities.Demanda.update(demanda.id, {
      demanda: novoTexto,
      historico,
    });
    setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? atualizada : d)));
  }

  function abrirEdicao(demanda) {
    setEditando(demanda);
    setFormOpen(true);
  }

  function abrirNovo() {
    setEditando(null);
    setFormOpen(true);
  }

  async function criarStatus(data) {
    const maxOrdem = statuses.reduce((m, s) => Math.max(m, s.ordem ?? 0), -1);
    const novo = await localClient.entities.Status.create({ ...data, ordem: maxOrdem + 1 });
    setStatuses((prev) => [...prev, novo]);
    setStatusFormOpen(false);
    return novo;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Prioridades de Demandas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arraste as demandas para alterar a ordem de prioridade.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm text-muted-foreground">
          {loading ? 'Carregando...' : `${ativas.length} demanda(s) ativa(s)`}
        </span>
        <Button onClick={abrirNovo}>
          <Plus size={16} className="mr-1" /> Nova demanda
        </Button>
      </div>

      <div className="mb-4">
        <Filtros
          filtros={filtros}
          setFiltros={setFiltros}
          vendedores={vendedores}
          revendas={revendas}
          statuses={statuses}
        />
      </div>

      {filtrando && (
        <p className="text-xs text-muted-foreground mb-3 italic">
          Filtros ativos — reordenação desativada. Limpe os filtros para arrastar.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {filtrando ? 'Nenhuma demanda encontrada com os filtros.' : 'Nenhuma demanda ativa. Clique em "+ Nova demanda" para começar.'}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fila">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {visiveis.map((d, i) => (
                  <DemandaItem
                    key={d.id}
                    demanda={d}
                    status={statusMap[d.status_id]}
                    index={i}
                    onEdit={abrirEdicao}
                    onDelete={excluirDemanda}
                    onConcluir={concluirDemanda}
                    dragDisabled={filtrando}
                    destaque={i === 0}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <DemandaForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditando(null);
        }}
        onSave={salvarDemanda}
        demanda={editando}
        statuses={statuses}
        vendedores={vendedores}
        revendas={revendas}
        onCriarStatus={() => setStatusFormOpen(true)}
        onGerenciarStatus={() => setStatusManagerOpen(true)}
        onRegistrarAlteracao={registrarAlteracao}
      />

      <StatusForm
        open={statusFormOpen}
        onClose={() => setStatusFormOpen(false)}
        onSave={criarStatus}
      />

      <StatusManager
        open={statusManagerOpen}
        onClose={() => setStatusManagerOpen(false)}
        statuses={statuses}
        demandas={demandas}
        onChange={(acao) => {
          if (acao === 'novo') {
            setStatusManagerOpen(false);
            setStatusFormOpen(true);
          } else {
            carregar();
          }
        }}
      />
    </div>
  );
}
