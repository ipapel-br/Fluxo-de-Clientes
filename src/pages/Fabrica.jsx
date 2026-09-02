import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { List, LayoutGrid, Printer } from 'lucide-react';
import { localClient } from '@/api/localClient';
import FabricaItem from '@/components/fabrica/FabricaItem';
import FabricaFiltros from '@/components/fabrica/FabricaFiltros';
import AcessoNegado from '@/components/auth/AcessoNegado';
import { useAuth } from '@/contexts/AuthContext';
import {
  entradaSituacao,
  entradaConclusaoImpressao,
  entradaStatusFabrica,
} from '@/lib/historico';
import { emitirNotificacao, NOTIFICATION_TYPES } from '@/lib/notificationService';

export default function Fabrica() {
  const { usuario, can, vendedores: vendedoresCadastrados, activeRevenda } = useAuth();
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busca: '',
    acabamento: '',
    urgencia: '',
    vendedor: '',
    statusFabrica: '',
  });

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('fluxo-clientes:view-mode-fabrica') || 'lista';
    } catch {
      return 'lista';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('fluxo-clientes:view-mode-fabrica', mode);
    } catch {}
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ds, sts] = await Promise.all([
        localClient.entities.Demanda.list('factory_position', 500),
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

  // Demandas ativas para a fábrica (apenas demandas enviadas para impressão e não concluídas)
  const ativasFabrica = useMemo(() => {
    const isVendedor = Boolean(
      (usuario?.role === 'seller' || usuario?.roles?.includes('seller')) &&
      !usuario?.is_admin &&
      usuario?.role !== 'admin' &&
      usuario?.role !== 'consultant' &&
      !usuario?.roles?.includes('consultant')
    );

    return demandas
      .filter((d) => {
        const st = statusMap[d.status_id];
        const estaConcluido = Boolean(st?.concluido || d.completed_at);
        const estaNaFabrica =
          d.factory_status === 'aguardando' ||
          d.factory_status === 'em_impressao' ||
          d.factory_status === 'na_fila' ||
          d.factory_status === 'pausado';
        if (estaConcluido || !estaNaFabrica) return false;

        // Isolamento de Tenancy
        if (usuario?.company_id && d.company_id && String(d.company_id) !== String(usuario.company_id)) {
          return false;
        }

        // Vendedor restrito à sua revenda
        if (isVendedor && usuario?.revenda) {
          if ((d.revenda || '').toLowerCase().trim() !== usuario.revenda.toLowerCase().trim()) {
            return false;
          }
        }

        // Filtro pela Revenda ativa no topo
        if (!isVendedor && activeRevenda && activeRevenda !== '__all__') {
          if ((d.revenda || '').toLowerCase().trim() !== activeRevenda.toLowerCase().trim()) {
            return false;
          }
        }

        return true;
      })
      .map((d, index) => ({
        ...d,
        factory_position: d.factory_position !== undefined ? d.factory_position : index,
      }))
      .sort((a, b) => (a.factory_position ?? 0) - (b.factory_position ?? 0));
  }, [demandas, statusMap, usuario, activeRevenda]);

  const filtrando = Boolean(
    filtros.busca ||
    filtros.acabamento ||
    filtros.urgencia ||
    filtros.vendedor ||
    filtros.statusFabrica
  );

  // Filtragem que preserva os dados originais e suas posições globais da fila
  const visiveis = useMemo(() => {
    if (!filtrando) return ativasFabrica;
    return ativasFabrica.filter((d) => {
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!`${d.cliente} ${d.demanda || ''} ${d.revenda || ''} ${d.vendedor || ''} ${d.acabamento || ''}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filtros.acabamento && (d.acabamento || 'Autocolante').toLowerCase() !== filtros.acabamento.toLowerCase()) {
        return false;
      }
      if (filtros.urgencia && (d.etiqueta || '') !== filtros.urgencia) {
        return false;
      }
      if (filtros.vendedor && (d.vendedor || '') !== filtros.vendedor) {
        return false;
      }
      if (filtros.statusFabrica && (d.factory_status || 'aguardando') !== filtros.statusFabrica) {
        return false;
      }
      return true;
    });
  }, [ativasFabrica, filtros, filtrando]);

  const vendedores = useMemo(() => {
    if (vendedoresCadastrados && vendedoresCadastrados.length > 0) {
      return vendedoresCadastrados.map((v) => ({
        id: v.id,
        value: v.nome,
        label: v.nome,
        avatar_url: v.avatar_url,
      }));
    }
    return [...new Set(demandas.map((d) => d.vendedor).filter(Boolean))].sort().map((nome) => ({
      id: nome,
      value: nome,
      label: nome,
    }));
  }, [vendedoresCadastrados, demandas]);

  // Drag & drop da Fábrica (salva na fila factory_position, sem afetar design_position)
  async function onDragEnd(result) {
    if (!result.destination || result.source.index === result.destination.index) return;
    if (!can('factory_reorder')) return;

    const itens = [...ativasFabrica];
    const [movido] = itens.splice(result.source.index, 1);
    itens.splice(result.destination.index, 0, movido);

    const novos = itens.map((d, i) => ({ id: d.id, factory_position: i }));
    const posicaoMap = Object.fromEntries(itens.map((d, i) => [d.id, i]));

    setDemandas((prev) =>
      prev.map((d) =>
        posicaoMap[d.id] !== undefined ? { ...d, factory_position: posicaoMap[d.id] } : d
      )
    );

    try {
      await localClient.entities.Demanda.bulkUpdate(novos);
    } catch (err) {
      console.error('Erro ao reordenar fábrica:', err);
      carregar();
    }
  }

  // Atualização rápida de campos no card da fábrica
  async function quickUpdateDemanda(demanda, patch) {
    let historico = demanda.historico || [];
    if (patch.factory_status && patch.factory_status !== demanda.factory_status) {
      const entrada = entradaStatusFabrica(demanda.factory_status, patch.factory_status, usuario);
      historico = [entrada, ...historico];
      patch.historico = historico;
    }
    const updatedData = { ...demanda, ...patch };
    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? updatedData : d)));

    try {
      const atualizada = await localClient.entities.Demanda.update(demanda.id, patch);
      setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...updatedData, ...atualizada } : d)));
    } catch (err) {
      console.error('Erro ao atualizar demanda na fábrica:', err);
      carregar();
    }
  }

  // Registrar alteração textual
  async function registrarAlteracao(demanda, novoTexto) {
    const entrada = entradaSituacao(novoTexto, usuario);
    const historico = [entrada, ...(demanda.historico || [])];
    await quickUpdateDemanda(demanda, { demanda: novoTexto, historico });
  }

  // Ações de fluxo da fábrica
  async function iniciarImpressao(demanda) {
    const entrada = entradaStatusFabrica(demanda.factory_status, 'em_impressao', usuario);
    const historico = [entrada, ...(demanda.historico || [])];
    await quickUpdateDemanda(demanda, { factory_status: 'em_impressao', historico });

    emitirNotificacao({
      demanda: { ...demanda, factory_status: 'em_impressao' },
      autor: usuario,
      tipo: NOTIFICATION_TYPES.IMPRESSAO,
      titulo: 'Impressão iniciada',
      mensagem: `${usuario?.nome || 'Impressor'} iniciou a impressão de "${demanda.cliente}".`,
      link_path: '/impressao',
    });
  }

  async function pausarImpressao(demanda) {
    const entrada = entradaStatusFabrica(demanda.factory_status, 'pausado', usuario);
    const historico = [entrada, ...(demanda.historico || [])];
    await quickUpdateDemanda(demanda, { factory_status: 'pausado', historico });

    emitirNotificacao({
      demanda: { ...demanda, factory_status: 'pausado' },
      autor: usuario,
      tipo: NOTIFICATION_TYPES.IMPRESSAO,
      titulo: 'Impressão pausada',
      mensagem: `${usuario?.nome || 'Impressor'} pausou a impressão de "${demanda.cliente}".`,
      link_path: '/impressao',
    });
  }

  async function devolverParaPrioridade(demanda) {
    const entrada = {
      tipo: 'STATUS_CHANGE',
      data: new Date().toISOString(),
      autor: usuario?.nome || 'Impressor',
      descricao: `${usuario?.nome || 'Impressor'} devolveu a demanda para a fila de Prioridade`,
    };
    const historico = [entrada, ...(demanda.historico || [])];
    const patch = { factory_status: 'pendente_design', historico };
    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? { ...d, ...patch } : d)));
    try {
      await localClient.entities.Demanda.update(demanda.id, patch);
    } catch (err) {
      console.error('[Fabrica] Erro ao devolver para prioridade:', err);
      carregar();
    }
  }

  async function concluirImpressao(demanda) {
    const concluidoStatus = statuses.find((s) => s.concluido);
    const entrada = entradaConclusaoImpressao(usuario);
    const historico = [entrada, ...(demanda.historico || [])];
    const agora = new Date().toISOString();

    const patch = {
      factory_status: 'impresso',
      completed_at: agora,
      completed_by: usuario?.nome || 'Impressor',
      status_id: concluidoStatus ? concluidoStatus.id : demanda.status_id,
      historico,
    };

    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? { ...d, ...patch } : d)));

    try {
      await localClient.entities.Demanda.update(demanda.id, patch);
    } catch (err) {
      console.error('[Fabrica] Erro ao concluir impressão:', err);
      carregar();
    }
  }

  if (!can('factory_view')) {
    return <AcessoNegado mensagem="Você não possui permissão para visualizar a área de Fábrica." />;
  }

  return (
    <div>
      {/* Topo da Fábrica */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Printer size={16} />
          </span>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Fila de Impressão</h1>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {loading ? 'Carregando...' : `${ativasFabrica.length} pedido(s) na linha`}
          </span>

          {/* Seletor Lista / Grade */}
          <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 shrink-0">
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
      </div>

      {/* Painel de Filtros e Lotes de Acabamento */}
      <div className="mb-4">
        <FabricaFiltros
          filtros={filtros}
          setFiltros={setFiltros}
          vendedores={vendedores}
        />
      </div>

      {filtrando && (
        <p className="text-xs text-muted-foreground mb-3 italic">
          Filtros ativos — reordenação desativada. As numerações globais da fila são mantidas para referência das remessas.
        </p>
      )}

      {/* Listagem de Cards de Impressão */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground rounded-2xl border border-dashed border-border bg-card/40 p-8">
          {filtrando
            ? 'Nenhum pedido encontrado com os filtros selecionados.'
            : 'Nenhum pedido aguardando impressão no momento.'}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fila-fabrica">
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
                  <FabricaItem
                    key={d.id}
                    demanda={d}
                    index={i}
                    onQuickUpdate={quickUpdateDemanda}
                    onRegistrarAlteracao={registrarAlteracao}
                    onIniciarImpressao={iniciarImpressao}
                    onConcluirImpressao={concluirImpressao}
                    onPausarImpressao={pausarImpressao}
                    onDevolverParaPrioridade={devolverParaPrioridade}
                    dragDisabled={filtrando || !can('factory_reorder')}
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
    </div>
  );
}
