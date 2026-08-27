import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, List, LayoutGrid } from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Button } from '@/components/ui/button';
import DemandaItem from '@/components/demanda/DemandaItem';
import DemandaForm from '@/components/demanda/DemandaForm';
import Filtros from '@/components/demanda/Filtros';
import StatusForm from '@/components/demanda/StatusForm';
import StatusManager from '@/components/demanda/StatusManager';
import AcessoNegado from '@/components/auth/AcessoNegado';
import { useAuth } from '@/contexts/AuthContext';
import { PERFIS } from '@/lib/permissoes';
import {
  gerarEntradasEdicao,
  entradaSituacao,
  entradaStatus,
  entradaCriacao,
  entradaConclusao,
  entradaReordenacaoPrioridade,
} from '@/lib/historico';

export default function Prioridades() {
  const { usuario, can, configuracao } = useAuth();
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', vendedor: '', revenda: '', designer: '', status: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('fluxo-clientes:view-mode') || 'lista';
    } catch {
      return 'lista';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('fluxo-clientes:view-mode', mode);
    } catch {}
  };

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

  // Demandas ativas na fila de prioridade
  const ativas = useMemo(() => {
    let list = demandas.filter((d) => {
      const st = statusMap[d.status_id];
      return !st || !st.concluido;
    });

    // Se o sistema estiver configurado no Modo 2 (Vendedor vê apenas suas demandas)
    if (
      configuracao?.seller_view_mode === 'own' &&
      usuario?.role === PERFIS.SELLER &&
      usuario?.nome
    ) {
      list = list.filter(
        (d) =>
          (d.vendedor || '').toLowerCase().trim() === usuario.nome.toLowerCase().trim() ||
          d.seller_id === usuario.id
      );
    }

    return list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [demandas, statusMap, configuracao, usuario]);

  const filtrando = Boolean(filtros.busca || filtros.vendedor || filtros.revenda || filtros.designer || filtros.status);

  const visiveis = useMemo(() => {
    if (!filtrando) return ativas;
    return ativas.filter((d) => {
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!`${d.cliente} ${d.demanda || ''} ${d.revenda || ''} ${d.vendedor || ''} ${d.designer || ''}`.toLowerCase().includes(q)) return false;
      }
      if (filtros.designer && d.designer !== filtros.designer) return false;
      if (filtros.vendedor && d.vendedor !== filtros.vendedor) return false;
      if (filtros.revenda && d.revenda !== filtros.revenda) return false;
      if (filtros.status && d.status_id !== filtros.status) return false;
      return true;
    });
  }, [ativas, filtros, filtrando]);

  const designers = useMemo(
    () => [...new Set(demandas.map((d) => d.designer).filter(Boolean))].sort(),
    [demandas]
  );
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
    if (!can('priority_reorder')) return;

    const itens = [...ativas];
    const [movido] = itens.splice(result.source.index, 1);
    itens.splice(result.destination.index, 0, movido);

    // Atualiza ordem e design_position sem alterar factory_position
    const novos = itens.map((d, i) => ({ id: d.id, ordem: i, design_position: i }));
    const ordemMap = Object.fromEntries(itens.map((d, i) => [d.id, i]));

    setDemandas((prev) =>
      prev.map((d) => (ordemMap[d.id] !== undefined ? { ...d, ordem: ordemMap[d.id], design_position: ordemMap[d.id] } : d))
    );

    // Registra alteração de prioridade no histórico do card movido
    const entradaHist = entradaReordenacaoPrioridade(result.source.index, result.destination.index, usuario);
    const movidoAtualizado = {
      ...movido,
      ordem: result.destination.index,
      design_position: result.destination.index,
      historico: [entradaHist, ...(movido.historico || [])],
    };

    try {
      await localClient.entities.Demanda.bulkUpdate(novos);
      await localClient.entities.Demanda.update(movido.id, { historico: movidoAtualizado.historico });
    } catch {
      carregar();
    }
  }

  async function salvarDemanda(data) {
    if (editando) {
      const entradas = gerarEntradasEdicao(editando, data, statusMap, usuario);
      const historico = [...entradas, ...(editando.historico || [])];
      const atualizada = await localClient.entities.Demanda.update(editando.id, { ...data, historico });
      setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...data, ...atualizada } : d)));
      setEditando(null);
    } else {
      const historico = [
        entradaCriacao(usuario),
        ...(data.demanda ? [entradaSituacao(data.demanda, usuario)] : []),
      ];
      const maxOrdem = ativas.reduce((m, d) => Math.max(m, d.ordem ?? 0), -1);
      const maxFactoryOrdem = demandas.reduce((m, d) => Math.max(m, d.factory_position ?? 0), -1);

      const nova = await localClient.entities.Demanda.create({
        ...data,
        historico,
        ordem: maxOrdem + 1,
        design_position: maxOrdem + 1,
        factory_position: maxFactoryOrdem + 1,
        acabamento: data.acabamento || 'Autocolante',
        factory_status: 'aguardando',
      });
      setDemandas((prev) => [...prev, nova]);
    }
    setFormOpen(false);
  }

  async function excluirDemanda(demanda) {
    if (!can('priority_edit')) return;
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
    const entradaSt = entradaStatus(statusMap[demanda.status_id]?.nome, concluidoStatus.nome, usuario);
    const entradaConc = entradaConclusao(usuario);
    const historico = [entradaConc, entradaSt, ...(demanda.historico || [])];
    const agora = new Date().toISOString();

    const atualizada = await localClient.entities.Demanda.update(demanda.id, {
      status_id: concluidoStatus.id,
      completed_at: agora,
      completed_by: usuario?.nome || 'Sistema',
      historico,
    });
    setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...atualizada } : d)));
  }

  async function registrarAlteracao(demanda, novoTexto) {
    const entrada = entradaSituacao(novoTexto, usuario);
    const historico = [entrada, ...(demanda.historico || [])];
    const atualizada = await localClient.entities.Demanda.update(demanda.id, {
      demanda: novoTexto,
      historico,
    });
    setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...atualizada } : d)));
  }

  async function quickUpdateDemanda(demanda, patch) {
    const entradas = gerarEntradasEdicao(demanda, { ...demanda, ...patch }, statusMap, usuario);
    const historico = entradas.length > 0 ? [...entradas, ...(demanda.historico || [])] : (demanda.historico || []);
    const updatedData = { ...demanda, ...patch, historico };
    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? updatedData : d)));

    try {
      const atualizada = await localClient.entities.Demanda.update(demanda.id, { ...patch, historico });
      setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...updatedData, ...atualizada } : d)));
    } catch (err) {
      console.error('Erro ao atualizar demanda rapidamente:', err);
      carregar();
    }
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

  if (!can('priority_view')) {
    return <AcessoNegado mensagem="Você não possui permissão para visualizar a área de Prioridades." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {loading ? 'Carregando...' : `${ativas.length} demanda(s) ativa(s)`}
          </span>
          {/* Seletor Modo Lista / Modo Grade */}
          <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => handleSetViewMode('lista')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Visualização em Lista"
            >
              <List size={14} />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('grade')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'grade'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={14} />
              <span>Grade</span>
            </button>
          </div>
        </div>

        {can('priority_create') && (
          <Button onClick={abrirNovo}>
            <Plus size={16} className="mr-1" /> Nova demanda
          </Button>
        )}
      </div>

      <div className="mb-4">
        <Filtros
          filtros={filtros}
          setFiltros={setFiltros}
          vendedores={vendedores}
          revendas={revendas}
          designers={designers}
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
        <div className="text-center py-20 text-muted-foreground rounded-2xl border border-dashed border-border bg-card/40 p-8">
          {filtrando ? 'Nenhuma demanda encontrada com os filtros.' : 'Nenhuma demanda ativa. Clique em "+ Nova demanda" para começar.'}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fila">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={
                  viewMode === 'grade'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
                    : 'space-y-3'
                }
              >
                {visiveis.map((d, i) => (
                  <DemandaItem
                    key={d.id}
                    demanda={d}
                    status={statusMap[d.status_id]}
                    statuses={statuses}
                    vendedores={vendedores}
                    revendas={revendas}
                    designers={designers}
                    index={i}
                    onEdit={abrirEdicao}
                    onDelete={excluirDemanda}
                    onConcluir={concluirDemanda}
                    onQuickUpdate={quickUpdateDemanda}
                    onRegistrarAlteracao={registrarAlteracao}
                    dragDisabled={filtrando || !can('priority_reorder')}
                    destaque={i === 0 && !filtrando}
                    viewMode={viewMode}
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
        designers={designers}
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
