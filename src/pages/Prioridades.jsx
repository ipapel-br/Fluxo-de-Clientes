import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, List, LayoutGrid, FileSpreadsheet } from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Button } from '@/components/ui/button';
import DemandaItem from '@/components/demanda/DemandaItem';
import DemandaForm from '@/components/demanda/DemandaForm';
import ImportCsvDialog from '@/components/demanda/ImportCsvDialog';
import Filtros from '@/components/demanda/Filtros';
import StatusForm from '@/components/demanda/StatusForm';
import StatusManager from '@/components/demanda/StatusManager';
import ExcluirDemandaDialog from '@/components/demanda/ExcluirDemandaDialog';
import { toast } from '@/components/ui/use-toast';
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
import { emitirNotificacao, NOTIFICATION_TYPES } from '@/lib/notificationService';

export default function Prioridades() {
  const {
    usuario,
    can,
    configuracao,
    designers: designersCadastrados,
    vendedores: vendedoresCadastrados,
    revendas: revendasCadastradas,
  } = useAuth();
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', vendedor: '', revenda: '', designer: '', status: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [demandaParaExcluir, setDemandaParaExcluir] = useState(null);
  const [excluindoDemanda, setExcluindoDemanda] = useState(false);
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

  // Demandas ativas na fila de prioridade (exclui demandas já enviadas para impressão ou concluídas)
  const ativas = useMemo(() => {
    let list = demandas.filter((d) => {
      const st = statusMap[d.status_id];
      const estaConcluido = Boolean(st?.concluido || d.completed_at);
      const estaNaFabrica =
        d.factory_status === 'aguardando' ||
        d.factory_status === 'em_impressao' ||
        d.factory_status === 'na_fila' ||
        d.factory_status === 'pausado';
      return !estaConcluido && !estaNaFabrica;
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

  const designers = useMemo(() => {
    if (designersCadastrados && designersCadastrados.length > 0) {
      return designersCadastrados.map((d) => ({
        id: d.id,
        value: d.nome,
        label: d.nome,
        avatar_url: d.avatar_url,
      }));
    }
    return [...new Set(demandas.map((d) => d.designer).filter(Boolean))].sort().map((nome) => ({
      id: nome,
      value: nome,
      label: nome,
    }));
  }, [designersCadastrados, demandas]);

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

  const revendas = useMemo(() => {
    if (revendasCadastradas && revendasCadastradas.length > 0) {
      return revendasCadastradas.map((r) => ({
        id: r.id,
        value: r.nome,
        label: r.nome,
        avatar_url: r.logo_url,
      }));
    }
    return [...new Set(demandas.map((d) => d.revenda).filter(Boolean))].sort().map((nome) => ({
      id: nome,
      value: nome,
      label: nome,
    }));
  }, [revendasCadastradas, demandas]);

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

      // Notificar se designer ou vendedor foram atribuídos ou alterados
      if ((editando.designer || '') !== (data.designer || '') && data.designer) {
        emitirNotificacao({
          demanda: { ...editando, ...data },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.ATRIBUICAO,
          titulo: 'Você foi atribuído a uma demanda',
          mensagem: `${usuario?.nome || 'Alguém'} atribuiu a demanda de "${data.cliente}" para você como Designer.`,
          link_path: '/',
        });
      }
      if ((editando.vendedor || '') !== (data.vendedor || '') && data.vendedor) {
        emitirNotificacao({
          demanda: { ...editando, ...data },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.ATRIBUICAO,
          titulo: 'Demanda vinculada a você',
          mensagem: `${usuario?.nome || 'Alguém'} definiu você como Vendedor da demanda de "${data.cliente}".`,
          link_path: '/',
        });
      }
      // Notificar se houve mudança no briefing/etapa da demanda
      if ((editando.demanda || '') !== (data.demanda || '') && data.demanda) {
        emitirNotificacao({
          demanda: { ...editando, ...data },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.ALTERACAO,
          titulo: 'Alteração na demanda',
          mensagem: `${usuario?.nome || 'Alguém'} alterou o briefing/etapa de "${data.cliente}": ${data.demanda}`,
          link_path: '/',
        });
      }

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
        factory_status: 'pendente_design',
      });
      setDemandas((prev) => [...prev, nova]);

      // Notificar responsáveis da nova demanda criada
      emitirNotificacao({
        demanda: nova,
        autor: usuario,
        tipo: NOTIFICATION_TYPES.ATRIBUICAO,
        titulo: 'Nova demanda cadastrada',
        mensagem: `${usuario?.nome || 'Alguém'} criou a demanda para "${nova.cliente}" (${nova.demanda || 'Sem descrição'}).`,
        link_path: '/',
      });
    }
    setFormOpen(false);
  }

  function abrirModalExcluir(demanda) {
    if (!can('priority_edit')) return;
    setDemandaParaExcluir(demanda);
  }

  async function confirmarExcluirDemanda(demanda) {
    if (!demanda || !can('priority_edit')) return;
    setExcluindoDemanda(true);
    try {
      await localClient.entities.Demanda.delete(demanda.id);
      setDemandas((prev) => prev.filter((d) => d.id !== demanda.id));
      toast({
        title: 'Demanda excluída',
        description: `A demanda de "${demanda.cliente}" foi excluída com sucesso.`,
      });
      setDemandaParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir demanda:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a demanda. Tente novamente.',
      });
    } finally {
      setExcluindoDemanda(false);
    }
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

    // Emitir notificação de conclusão
    emitirNotificacao({
      demanda: atualizada,
      autor: usuario,
      tipo: NOTIFICATION_TYPES.CONCLUSAO,
      titulo: 'Demanda concluída',
      mensagem: `${usuario?.nome || 'Alguém'} marcou a demanda de "${demanda.cliente}" como Concluída.`,
      link_path: '/concluidos',
    });
  }

  async function enviarParaImpressao(demanda) {
    const entradaImp = {
      tipo: 'IMPRESSAO_ENVIO',
      data: new Date().toISOString(),
      autor: usuario?.nome || 'Usuário',
      descricao: `${usuario?.nome || 'Usuário'} enviou para a Fila de Impressão`,
    };
    const historico = [entradaImp, ...(demanda.historico || [])];
    const patch = {
      factory_status: 'aguardando',
      fase_arte: 'Arte aprovada',
      historico,
    };

    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? { ...d, ...patch } : d)));

    try {
      const atualizada = await localClient.entities.Demanda.update(demanda.id, patch);

      // Notificar envio para impressão
      emitirNotificacao({
        demanda: { ...demanda, ...patch },
        autor: usuario,
        tipo: NOTIFICATION_TYPES.IMPRESSAO,
        titulo: 'Arte enviada para Impressão',
        mensagem: `${usuario?.nome || 'Designer'} enviou a demanda de "${demanda.cliente}" para a fila de impressão.`,
        link_path: '/impressao',
      });
    } catch (err) {
      console.error('Erro ao enviar para impressão:', err);
      carregar();
    }
  }

  async function registrarAlteracao(demanda, novoTexto) {
    const entrada = entradaSituacao(novoTexto, usuario);
    const historico = [entrada, ...(demanda.historico || [])];
    const atualizada = await localClient.entities.Demanda.update(demanda.id, {
      demanda: novoTexto,
      historico,
    });
    setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...atualizada } : d)));

    // Disparar notificação de nova alteração registrada (ex: "Vendedora Grace registrou alteração")
    emitirNotificacao({
      demanda: atualizada,
      autor: usuario,
      tipo: NOTIFICATION_TYPES.ALTERACAO,
      titulo: 'Nova alteração registrada',
      mensagem: `${usuario?.nome || 'Colaborador'} registrou uma alteração em "${demanda.cliente}": ${novoTexto}`,
      link_path: '/',
    });
  }

  async function quickUpdateDemanda(demanda, patch) {
    // Sincronizar factory_status se o status geral for alterado para Impressão
    if (patch.status_id && patch.status_id !== demanda.status_id) {
      const stObj = statusMap[patch.status_id];
      if (stObj && (stObj.id === 'status_impressao' || (stObj.nome || '').toLowerCase().includes('impress'))) {
        patch.factory_status = 'aguardando';
        if (!patch.fase_arte && !demanda.fase_arte) {
          patch.fase_arte = 'Arte aprovada';
        }
      }
    }

    const entradas = gerarEntradasEdicao(demanda, { ...demanda, ...patch }, statusMap, usuario);
    const historico = entradas.length > 0 ? [...entradas, ...(demanda.historico || [])] : (demanda.historico || []);
    const updatedData = { ...demanda, ...patch, historico };
    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? updatedData : d)));

    try {
      const atualizada = await localClient.entities.Demanda.update(demanda.id, { ...patch, historico });
      setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...updatedData, ...atualizada } : d)));

      // Notificar sobre mudanças pontuais relevantes
      if (patch.fase_arte && patch.fase_arte !== demanda.fase_arte) {
        const faseNomes = { iniciando: 'Iniciando arte', no_meio: 'No meio da arte', finalizando: 'Finalizando arte' };
        emitirNotificacao({
          demanda: { ...demanda, ...patch },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.FASE_ARTE,
          titulo: 'Fase da arte atualizada',
          mensagem: `${usuario?.nome || 'Designer'} alterou o progresso da arte de "${demanda.cliente}" para "${faseNomes[patch.fase_arte] || patch.fase_arte}".`,
          link_path: '/',
        });
      } else if (patch.status_id && patch.status_id !== demanda.status_id) {
        const nomeStatus = statusMap[patch.status_id]?.nome || 'Novo Status';
        emitirNotificacao({
          demanda: { ...demanda, ...patch },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.STATUS,
          titulo: 'Status alterado',
          mensagem: `${usuario?.nome || 'Alguém'} alterou o status de "${demanda.cliente}" para "${nomeStatus}".`,
          link_path: '/',
        });
      } else if (patch.designer && patch.designer !== demanda.designer) {
        emitirNotificacao({
          demanda: { ...demanda, ...patch },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.ATRIBUICAO,
          titulo: 'Você foi atribuído como Designer',
          mensagem: `${usuario?.nome || 'Alguém'} definiu você como Designer de "${demanda.cliente}".`,
          link_path: '/',
        });
      } else if (patch.vendedor && patch.vendedor !== demanda.vendedor) {
        emitirNotificacao({
          demanda: { ...demanda, ...patch },
          autor: usuario,
          tipo: NOTIFICATION_TYPES.ATRIBUICAO,
          titulo: 'Você foi atribuído como Vendedor',
          mensagem: `${usuario?.nome || 'Alguém'} definiu você como Vendedor de "${demanda.cliente}".`,
          link_path: '/',
        });
      }
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

  async function importarCsvDemandas(itensImportados) {
    if (!Array.isArray(itensImportados) || itensImportados.length === 0) return;

    let maxOrdem = ativas.reduce((m, d) => Math.max(m, d.ordem ?? 0), -1);
    let maxFactoryOrdem = demandas.reduce((m, d) => Math.max(m, d.factory_position ?? 0), -1);

    const novasDemandas = [];

    for (const item of itensImportados) {
      maxOrdem++;
      maxFactoryOrdem++;

      const historico = [
        entradaCriacao(usuario),
        ...(item.demanda ? [entradaSituacao(item.demanda, usuario)] : []),
        ...(item.observacao ? [{ tipo: 'OBSERVACAO', data: new Date().toISOString(), autor: 'Bitrix CRM', descricao: item.observacao }] : []),
      ];

      const payload = {
        cliente: item.cliente,
        demanda: item.demanda || '',
        prazo: item.prazo || '',
        designer: item.designer || '',
        vendedor: item.vendedor || '',
        revenda: item.revenda || '',
        acabamento: item.acabamento || 'Autocolante',
        etiqueta: item.etiqueta || '',
        status_id: item.status_id || (statuses[0]?.id || ''),
        observacao: item.observacao || '',
        bitrix_id: item.bitrix_id || '',
        historico,
        ordem: maxOrdem,
        design_position: maxOrdem,
        factory_position: maxFactoryOrdem,
        factory_status: 'pendente_design',
      };

      const nova = await localClient.entities.Demanda.create(payload);
      novasDemandas.push(nova);
    }

    setDemandas((prev) => [...prev, ...novasDemandas]);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4">
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
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

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          {can('priority_create') && (
            <Button
              variant="outline"
              onClick={() => setCsvImportOpen(true)}
              className="font-medium shadow-2xs text-xs sm:text-sm h-9 justify-center"
            >
              <FileSpreadsheet size={15} className="mr-1.5 text-emerald-600 shrink-0" /> Importar CSV
            </Button>
          )}

          {can('priority_create') && (
            <Button onClick={abrirNovo} className="font-semibold shadow-xs text-xs sm:text-sm h-9 justify-center">
              <Plus size={16} className="mr-1.5 shrink-0" /> Nova demanda
            </Button>
          )}
        </div>
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
                    onDelete={abrirModalExcluir}
                    onConcluir={concluirDemanda}
                    onEnviarParaImpressao={enviarParaImpressao}
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
        onDelete={abrirModalExcluir}
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

      <ImportCsvDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImport={importarCsvDemandas}
        statuses={statuses}
        revendas={revendas}
        vendedores={vendedores}
        designers={designers}
        demandasExistentes={demandas}
      />

      <ExcluirDemandaDialog
        open={Boolean(demandaParaExcluir)}
        onClose={() => !excluindoDemanda && setDemandaParaExcluir(null)}
        onConfirm={confirmarExcluirDemanda}
        demanda={demandaParaExcluir}
        status={demandaParaExcluir ? statusMap[demandaParaExcluir.status_id] : null}
        loading={excluindoDemanda}
      />
    </div>
  );
}
