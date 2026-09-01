import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Button } from '@/components/ui/button';
import DemandaItem from '@/components/demanda/DemandaItem';
import DemandaDrawer from '@/components/demanda/DemandaDrawer';
import DemandaForm from '@/components/demanda/DemandaForm';
import ImportCsvDialog from '@/components/demanda/ImportCsvDialog';
import Filtros from '@/components/demanda/Filtros';
import StatusForm from '@/components/demanda/StatusForm';
import StatusManager from '@/components/demanda/StatusManager';
import ExcluirDemandaDialog from '@/components/demanda/ExcluirDemandaDialog';
import RegistrarAlteracaoDialog from '@/components/demanda/RegistrarAlteracaoDialog';
import HistoricoPainel from '@/components/demanda/HistoricoPainel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  entradaAlteracaoPrazo,
} from '@/lib/historico';
import { emitirNotificacao, NOTIFICATION_TYPES } from '@/lib/notificationService';
import { tipoAlertaPrazo } from '@/lib/datas';

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
  const [demandaSelecionadaId, setDemandaSelecionadaId] = useState('demanda_04_lenara');
  const [drawerTab, setDrawerTab] = useState('detalhes');
  const [drawerSubTab, setDrawerSubTab] = useState('todas');
  const [filtros, setFiltros] = useState({
    busca: '',
    aba: 'todas', // 'todas' | 'minhas' | 'hoje' | 'atrasadas' | 'alta_prioridade' | 'pendente'
    vendedor: '',
    revenda: '',
    designer: '',
    status: '',
    prioridade: '',
    etapa: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'ordem', direction: 'asc' });
  const [ordenacao, setOrdenacao] = useState('prioridade');
  const [formOpen, setFormOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [demandaParaExcluir, setDemandaParaExcluir] = useState(null);
  const [excluindoDemanda, setExcluindoDemanda] = useState(false);
  const [historicoModalDemanda, setHistoricoModalDemanda] = useState(null);
  const [alteracaoModalDemanda, setAlteracaoModalDemanda] = useState(null);
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

  // Contadores para as abas rápidas
  const contadores = useMemo(() => {
    const userName = (usuario?.nome || '').toLowerCase().trim();
    let minhas = 0;
    let hoje = 0;
    let atrasadas = 0;
    let altaPrioridade = 0;
    let pendente = 0;

    ativas.forEach((d) => {
      // Minhas (Designer ou Vendedor atribuído)
      if (
        userName &&
        ((d.designer || '').toLowerCase().trim() === userName ||
          (d.vendedor || '').toLowerCase().trim() === userName ||
          d.seller_id === usuario?.id)
      ) {
        minhas++;
      }

      // Alerta de prazo
      const alerta = tipoAlertaPrazo(d.prazo);
      if (alerta === 'hoje') hoje++;
      if (alerta === 'vencido') atrasadas++;

      // Alta prioridade / Urgente
      const et = (d.etiqueta || '').toLowerCase();
      if (et === 'alta' || et === 'urgente') altaPrioridade++;

      // Pendente (Status ou Demanda/Etapa com 'amostra' ou 'revisão'/'revisao')
      const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
      const demTexto = (d.demanda || '').toLowerCase();
      const isPendente =
        stNome.includes('amostra') ||
        stNome.includes('revis') ||
        demTexto.includes('amostra') ||
        demTexto.includes('revis');
      if (isPendente) pendente++;
    });

    return {
      todas: ativas.length,
      minhas,
      hoje,
      atrasadas,
      altaPrioridade,
      pendente,
    };
  }, [ativas, statusMap, usuario]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: 'ordem', direction: 'asc' }; // Volta para a ordenação natural da fila
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0 ml-0.5" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={12} className="text-primary shrink-0 ml-0.5" />
    ) : (
      <ArrowDown size={12} className="text-primary shrink-0 ml-0.5" />
    );
  };

  const filtrando = Boolean(
    filtros.busca ||
    filtros.aba !== 'todas' ||
    filtros.vendedor ||
    filtros.revenda ||
    filtros.designer ||
    filtros.status ||
    filtros.prioridade ||
    filtros.etapa ||
    sortConfig.key !== 'ordem'
  );

  const visiveis = useMemo(() => {
    let result = ativas;
    const userName = (usuario?.nome || '').toLowerCase().trim();

    // Filtro por Aba Rápida
    if (filtros.aba === 'minhas') {
      result = result.filter(
        (d) =>
          (d.designer || '').toLowerCase().trim() === userName ||
          (d.vendedor || '').toLowerCase().trim() === userName ||
          d.seller_id === usuario?.id
      );
    } else if (filtros.aba === 'hoje') {
      result = result.filter((d) => tipoAlertaPrazo(d.prazo) === 'hoje');
    } else if (filtros.aba === 'atrasadas') {
      result = result.filter((d) => tipoAlertaPrazo(d.prazo) === 'vencido');
    } else if (filtros.aba === 'alta_prioridade') {
      result = result.filter((d) => {
        const et = (d.etiqueta || '').toLowerCase();
        return et === 'alta' || et === 'urgente';
      });
    } else if (filtros.aba === 'pendente') {
      result = result.filter((d) => {
        const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
        const demTexto = (d.demanda || '').toLowerCase();
        return (
          stNome.includes('amostra') ||
          stNome.includes('revis') ||
          demTexto.includes('amostra') ||
          demTexto.includes('revis')
        );
      });
    }

    // Filtros secundários
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      result = result.filter((d) =>
        `${d.cliente} ${d.demanda || ''} ${d.revenda || ''} ${d.vendedor || ''} ${d.designer || ''} ${d.bitrix_id || ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (filtros.designer && filtros.designer !== '__all__') {
      result = result.filter((d) => d.designer === filtros.designer);
    }
    if (filtros.vendedor && filtros.vendedor !== '__all__') {
      result = result.filter((d) => d.vendedor === filtros.vendedor);
    }
    if (filtros.revenda && filtros.revenda !== '__all__') {
      result = result.filter((d) => d.revenda === filtros.revenda);
    }
    if (filtros.status && filtros.status !== '__all__') {
      if (filtros.status === 'abertas') {
        // Já filtrado em ativas
      } else {
        result = result.filter((d) => d.status_id === filtros.status);
      }
    }
    if (filtros.prioridade && filtros.prioridade !== '__all__') {
      if (filtros.prioridade === 'alta_urgente') {
        result = result.filter((d) => ['alta', 'urgente'].includes((d.etiqueta || '').toLowerCase()));
      } else {
        result = result.filter((d) => (d.etiqueta || '').toLowerCase() === filtros.prioridade.toLowerCase());
      }
    }
    if (filtros.etapa && filtros.etapa !== '__all__') {
      result = result.filter((d) => d.fase_arte === filtros.etapa);
    }

    // Ordenação por colunas da tabela
    if (sortConfig.key === 'prioridade') {
      const prioWeight = { urgente: 3, alta: 2, rotina: 1 };
      result = [...result].sort((a, b) => {
        const pA = prioWeight[(a.etiqueta || '').toLowerCase()] || 0;
        const pB = prioWeight[(b.etiqueta || '').toLowerCase()] || 0;
        const diff = pB - pA;
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    } else if (sortConfig.key === 'cliente') {
      result = [...result].sort((a, b) => {
        const diff = (a.cliente || '').localeCompare(b.cliente || '', 'pt-BR', { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    } else if (sortConfig.key === 'prazo') {
      result = [...result].sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        const diff = new Date(a.prazo) - new Date(b.prazo);
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    } else if (sortConfig.key === 'etapa') {
      const etapaIdx = { iniciando: 1, no_meio: 2, finalizando: 3 };
      result = [...result].sort((a, b) => {
        const eA = etapaIdx[a.fase_arte] || 0;
        const eB = etapaIdx[b.fase_arte] || 0;
        const diff = eA - eB;
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    } else if (sortConfig.key === 'status') {
      result = [...result].sort((a, b) => {
        const sA = statusMap[a.status_id]?.ordem ?? 99;
        const sB = statusMap[b.status_id]?.ordem ?? 99;
        const diff = sA - sB;
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    } else if (sortConfig.key === 'responsavel') {
      result = [...result].sort((a, b) => {
        const respA = `${a.designer || ''} ${a.vendedor || ''}`;
        const respB = `${b.designer || ''} ${b.vendedor || ''}`;
        const diff = respA.localeCompare(respB, 'pt-BR', { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    } else {
      // Ordem padrão da fila
      result = [...result].sort((a, b) => {
        const diff = (a.ordem ?? 0) - (b.ordem ?? 0);
        return sortConfig.direction === 'asc' ? diff : -diff;
      });
    }

    return result;
  }, [ativas, filtros, sortConfig, statusMap, usuario]);

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

  // Demanda selecionada para o Drawer lateral
  const demandaSelecionadaObj = useMemo(() => {
    if (!demandaSelecionadaId) return null;
    const index = visiveis.findIndex((d) => d.id === demandaSelecionadaId);
    if (index >= 0) {
      return { demanda: visiveis[index], index };
    }
    const fallbackIndex = ativas.findIndex((d) => d.id === demandaSelecionadaId);
    if (fallbackIndex >= 0) {
      return { demanda: ativas[fallbackIndex], index: fallbackIndex };
    }
    return null;
  }, [demandaSelecionadaId, visiveis, ativas]);

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

    setFormOpen(false);
  }

  function abrirNovo() {
    setFormOpen(true);
  }

  function abrirEdicao(demanda) {
    if (!demanda) return;
    setDemandaSelecionadaId(demanda.id);
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

  async function registrarAlteracao(demanda, novoTexto, opcoes = {}) {
    const { novoPrazo, diasAjustados } = opcoes;
    const entradas = [];
    const agora = new Date().toISOString();

    // Entrada da nova alteração/pedido
    entradas.push(entradaSituacao(novoTexto, usuario, agora));

    // Se houve ajuste de prazo na alteração
    if (novoPrazo && novoPrazo !== demanda.prazo) {
      entradas.push(
        entradaAlteracaoPrazo({
          de: demanda.prazo,
          para: novoPrazo,
          dias: diasAjustados || 0,
          motivo: novoTexto,
          usuario,
          data: agora,
        })
      );
    }

    const historico = [...entradas, ...(demanda.historico || [])];
    const updatePayload = {
      demanda: novoTexto,
      historico,
      ...(novoPrazo ? { prazo: novoPrazo } : {}),
    };

    const atualizada = await localClient.entities.Demanda.update(demanda.id, updatePayload);
    setDemandas((prev) => prev.map((d) => (d.id === atualizada.id ? { ...d, ...updatePayload, ...atualizada } : d)));

    // Disparar notificação de nova alteração registrada
    const detalhePrazo = novoPrazo && novoPrazo !== demanda.prazo
      ? ` (Prazo prorrogado para ${novoPrazo.split('-').reverse().join('/')})`
      : '';

    emitirNotificacao({
      demanda: atualizada,
      autor: usuario,
      tipo: NOTIFICATION_TYPES.ALTERACAO,
      titulo: 'Nova alteração registrada',
      mensagem: `${usuario?.nome || 'Colaborador'} registrou alteração em "${demanda.cliente}"${detalhePrazo}: ${novoTexto}`,
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

  async function duplicarDemanda(demanda) {
    let maxOrdem = ativas.reduce((m, d) => Math.max(m, d.ordem ?? 0), -1);
    let maxFactoryOrdem = demandas.reduce((m, d) => Math.max(m, d.factory_position ?? 0), -1);

    const historico = [
      entradaCriacao(usuario),
      ...(demanda.demanda ? [entradaSituacao(`Cópia: ${demanda.demanda}`, usuario)] : []),
    ];

    const novaDemanda = {
      ...demanda,
      cliente: `${demanda.cliente} (Cópia)`,
      ordem: maxOrdem + 1,
      design_position: maxOrdem + 1,
      factory_position: maxFactoryOrdem + 1,
      historico,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    delete novaDemanda.id;

    try {
      const criada = await localClient.entities.Demanda.create(novaDemanda);
      setDemandas((prev) => [...prev, criada]);
      toast({ title: 'Demanda duplicada com sucesso!' });
    } catch (err) {
      console.error('Erro ao duplicar demanda:', err);
    }
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
    <div className="flex flex-col lg:flex-row items-start gap-6">
      {/* Coluna Principal da Esquerda: Header, Filtros, Tabela e Paginação */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">
              Demandas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {loading ? 'Carregando demandas...' : `${ativas.length} demandas ativas`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:self-center">
            {can('priority_create') && (
              <Button
                variant="outline"
                onClick={() => setCsvImportOpen(true)}
                className="border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground font-medium text-xs sm:text-sm h-9 px-3.5 rounded-lg transition"
              >
                <FileSpreadsheet size={15} className="mr-1.5 shrink-0 opacity-80" /> Importar CSV
              </Button>
            )}

            {can('priority_create') && (
              <Button
                onClick={abrirNovo}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm h-9 px-3.5 rounded-lg shadow-sm transition"
              >
                <Plus size={16} className="mr-1 shrink-0 stroke-[2.5]" /> Nova demanda
              </Button>
            )}
          </div>
        </div>

        {/* Faixa de Navegação Rápida, Busca e Filtros */}
        <div>
          <Filtros
            filtros={filtros}
            setFiltros={setFiltros}
            vendedores={vendedores}
            revendas={revendas}
            designers={designers}
            statuses={statuses}
            ordenacao={ordenacao}
            setOrdenacao={setOrdenacao}
            contadores={contadores}
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
          /* Tabela Principal */
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              {/* 1. Cabeçalho da tabela com colunas alinhadas: #, PRIORIDADE, CLIENTE / DEMANDA, PRAZO, ETAPA, STATUS, D / V, AÇÕES */}
              <div className="w-full grid grid-cols-12 items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider select-none">
                <div
                  onClick={() => handleSort('ordem')}
                  className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Ordenar por Posição na Fila"
                >
                  <span>#</span>
                  {getSortIcon('ordem')}
                </div>
                <div
                  onClick={() => handleSort('prioridade')}
                  className="col-span-2 sm:col-span-1 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Ordenar por Prioridade (Urgente > Alta > Rotina)"
                >
                  <span>PRIORIDADE</span>
                  {getSortIcon('prioridade')}
                </div>
                <div
                  onClick={() => handleSort('cliente')}
                  className="col-span-4 sm:col-span-3 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Ordenar por Cliente / Demanda"
                >
                  <span>CLIENTE / DEMANDA</span>
                  {getSortIcon('cliente')}
                </div>
                <div
                  onClick={() => handleSort('prazo')}
                  className="col-span-2 sm:col-span-1 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Ordenar por Prazo"
                >
                  <span>PRAZO</span>
                  {getSortIcon('prazo')}
                </div>
                <div
                  onClick={() => handleSort('etapa')}
                  className="hidden md:flex md:col-span-3 lg:col-span-2 xl:col-span-2 items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Ordenar por Etapa"
                >
                  <span>ETAPA</span>
                  {getSortIcon('etapa')}
                </div>
                <div
                  onClick={() => handleSort('status')}
                  className="hidden lg:flex lg:col-span-2 xl:col-span-2 items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Ordenar por Status"
                >
                  <span>STATUS</span>
                  {getSortIcon('status')}
                </div>
                <div
                  onClick={() => handleSort('responsavel')}
                  className="hidden lg:flex lg:col-span-1 items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                  title="Designer / Vendedor (D / V)"
                >
                  <span>D / V</span>
                  {getSortIcon('responsavel')}
                </div>
                <div className="col-span-3 sm:col-span-3 md:col-span-2 lg:col-span-1 xl:col-span-1 text-right pr-1">
                  AÇÕES
                </div>
              </div>

              {/* 2. Linhas de demandas */}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="fila">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y divide-border/60"
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
                          onEdit={(dem) => {
                            setDemandaSelecionadaId(dem.id);
                            setDrawerTab('detalhes');
                          }}
                          onDelete={abrirModalExcluir}
                          onConcluir={concluirDemanda}
                          onEnviarParaImpressao={enviarParaImpressao}
                          onQuickUpdate={quickUpdateDemanda}
                          onRegistrarAlteracao={(dem) => {
                            setDemandaSelecionadaId(dem.id);
                            setDrawerTab('alteracoes');
                            setDrawerSubTab('todas');
                          }}
                          onDuplicar={duplicarDemanda}
                          onVerHistorico={(dem) => {
                            setDemandaSelecionadaId(dem.id);
                            setDrawerTab('alteracoes');
                            setDrawerSubTab('todas');
                          }}
                          onSelectRow={(dem) => {
                            setDemandaSelecionadaId((prev) => (prev === dem.id ? null : dem.id));
                            setDrawerTab('detalhes');
                          }}
                          isSelected={demandaSelecionadaId === d.id}
                          dragDisabled={filtrando || !can('priority_reorder')}
                          destaque={i === 0 && !filtrando}
                          viewMode="lista"
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* 4. Rodapé da Tabela: Informação de contagem e Paginação compacta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-muted-foreground select-none">
              {/* Texto à esquerda: Mostrando 5 de 14 demandas */}
              <div className="font-medium text-muted-foreground/90">
                Mostrando {visiveis.length} de {ativas.length} demandas
              </div>

              {/* Paginação compacta à direita: anterior | 1 | 2 | 3 | próxima */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
                  title="Página anterior"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border text-foreground font-semibold text-xs shadow-xs"
                >
                  1
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
                >
                  3
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
                  title="Próxima página"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coluna da Direita: Drawer Lateral de Detalhes da Demanda Selecionada */}
      {demandaSelecionadaObj && (
        <div className="w-full lg:w-[410px] shrink-0 rounded-xl border border-border overflow-hidden shadow-xl sticky top-20 bg-card">
          <DemandaDrawer
            demanda={demandaSelecionadaObj.demanda}
            index={demandaSelecionadaObj.index}
            status={statusMap[demandaSelecionadaObj.demanda.status_id]}
            statuses={statuses}
            designers={designers}
            vendedores={vendedores}
            revendas={revendas}
            initialTab={drawerTab}
            initialSubTab={drawerSubTab}
            onClose={() => setDemandaSelecionadaId(null)}
            onConcluir={concluirDemanda}
            onEnviarParaImpressao={enviarParaImpressao}
            onDelete={abrirModalExcluir}
            onDuplicar={duplicarDemanda}
            onRegistrarAlteracao={async (dem, texto, opcoes) => {
              await registrarAlteracao(dem, texto, opcoes);
              toast({
                title: 'Alteração registrada',
                description: `Nova orientação salva no histórico de "${dem.cliente}".`,
              });
            }}
            onQuickUpdate={quickUpdateDemanda}
          />
        </div>
      )}

      {/* Modal de Registro de Nova Alteração */}
      {alteracaoModalDemanda && (
        <RegistrarAlteracaoDialog
          open={Boolean(alteracaoModalDemanda)}
          demanda={alteracaoModalDemanda}
          onClose={() => setAlteracaoModalDemanda(null)}
          onConfirm={(texto, opcoes) => {
            registrarAlteracao(alteracaoModalDemanda, texto, opcoes);
            setAlteracaoModalDemanda(null);
            toast({
              title: 'Alteração registrada',
              description: `Nova orientação salva no histórico de "${alteracaoModalDemanda.cliente}".`,
            });
          }}
        />
      )}

      {/* Modal de Histórico */}
      {historicoModalDemanda && (
        <Dialog open={Boolean(historicoModalDemanda)} onOpenChange={(o) => !o && setHistoricoModalDemanda(null)}>
          <DialogContent className="max-w-lg bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Histórico · {historicoModalDemanda.cliente}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Linha do tempo e atividades registradas para esta demanda.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <HistoricoPainel historico={historicoModalDemanda.historico} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DemandaForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={salvarDemanda}
        onDelete={abrirModalExcluir}
        demanda={null}
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
