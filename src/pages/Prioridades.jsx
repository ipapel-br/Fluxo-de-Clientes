import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import {
  Plus,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Palette,
  ShoppingBag,
  Building2,
  Calendar,
  Flame,
  AlertTriangle,
  Layers,
  Search,
  Clock,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import UserAvatar from '@/components/ui/UserAvatar';
import { getStatusColor } from '@/lib/statusColors';
import DemandaItem from '@/components/demanda/DemandaItem';
import DemandaDrawer from '@/components/demanda/DemandaDrawer';
import DemandaForm from '@/components/demanda/DemandaForm';
import ImportCsvDialog from '@/components/demanda/ImportCsvDialog';
import Filtros from '@/components/demanda/Filtros';
import StatusForm from '@/components/demanda/StatusForm';
import StatusManager from '@/components/demanda/StatusManager';
import PrioridadesKanban from '@/components/demanda/PrioridadesKanban';
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
import { PERFIS, userHasRole } from '@/lib/permissoes';
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
import {
  tipoAlertaPrazo,
  calcularScorePrazoProximo,
  isStatusAmostra,
  isStatusCriacao,
  isStatusRevisao,
  isStatusPausa,
  isStatusSemBriefing,
  calcularPrazoFuturo,
} from '@/lib/datas';
import { COMPLEXIDADES, complexidadeConfig } from '@/lib/complexidade';
import { TIPOS_DEMANDA, tipoDemandaConfig } from '@/lib/tiposDemanda';

export default function Prioridades() {
  const {
    usuario,
    usuarios,
    can,
    configuracao,
    designers: designersCadastrados,
    vendedores: vendedoresCadastrados,
    revendas: revendasCadastradas,
    activeRevenda,
    adminViewMode,
  } = useAuth();
  const [demandas, setDemandas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demandaSelecionadaId, setDemandaSelecionadaId] = useState('demanda_04_lenara');
  const [drawerTab, setDrawerTab] = useState('detalhes');
  const [drawerSubTab, setDrawerSubTab] = useState('todas');
  const [filtros, setFiltros] = useState({
    busca: '',
    aba: 'todas', // 'todas' | 'minhas' | 'hoje' | 'atrasadas' | 'alta_prioridade' | 'pendente' | 'amostra' | 'revisao' | 'amostra_revisao'
    vendedor: '',
    revenda: '',
    designer: '',
    status: '',
    tipo_demanda: '',
    prioridade: '',
    complexidade: '',
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
  const [selecionadosIds, setSelecionadosIds] = useState(() => new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [modalLoteRevendaOpen, setModalLoteRevendaOpen] = useState(false);
  const [revendaLoteSelecionada, setRevendaLoteSelecionada] = useState('');
  const [modalLoteStatusOpen, setModalLoteStatusOpen] = useState(false);
  const [statusLoteSelecionado, setStatusLoteSelecionado] = useState('');
  const [modalLoteDesignerOpen, setModalLoteDesignerOpen] = useState(false);
  const [designerLoteSelecionado, setDesignerLoteSelecionado] = useState('');
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

  const carregarHistoricoDemanda = async (d) => {
    try {
      const logs = await localClient.entities.AuditLog.list('created_at', 50);
      const filtrados = logs.filter(
        (l) => l.entity_id === d.id || l.details?.includes(d.cliente)
      );
      setHistoricoModalDemanda({ ...d, audit_logs: filtrados });
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

  // Demandas ativas na fila de prioridade aplicando as regras de Tenancy e RBAC
  const ativas = useMemo(() => {
    const userName = (usuario?.nome || '').toLowerCase().trim();
    const isAdmin = Boolean(usuario?.is_admin || usuario?.role === PERFIS.ADMIN);
    const isDesigner = Boolean(
      (usuario?.role === PERFIS.DESIGNER || userHasRole(usuario, PERFIS.DESIGNER)) &&
      !isAdmin &&
      usuario?.role !== PERFIS.CONSULTANT &&
      !userHasRole(usuario, PERFIS.CONSULTANT)
    );
    const isVendedor = Boolean(
      (usuario?.role === PERFIS.SELLER || userHasRole(usuario, PERFIS.SELLER)) &&
      !isAdmin &&
      usuario?.role !== PERFIS.CONSULTANT &&
      !userHasRole(usuario, PERFIS.CONSULTANT)
    );

    let list = demandas.filter((d) => {
      // 1. Não exibir concluídas nem demandas em produção/fábrica na fila de arte
      const st = statusMap[d.status_id];
      const estaConcluido = Boolean(st?.concluido || d.completed_at);
      const estaNaFabrica =
        d.factory_status === 'aguardando' ||
        d.factory_status === 'em_impressao' ||
        d.factory_status === 'na_fila' ||
        d.factory_status === 'pausado';
      if (estaConcluido || estaNaFabrica) return false;

      // 2. Isolamento Multi-tenant (Tenancy de Empresa)
      if (usuario?.company_id && d.company_id) {
        if (String(d.company_id) !== String(usuario.company_id)) {
          return false;
        }
      }

      // 3. Regras de Permissão por Perfil (RBAC):
      // - Designer: apenas demandas atribuídas a ele próprio
      if (isDesigner) {
        const designerDemanda = (d.designer || '').toLowerCase().trim();
        if (designerDemanda !== userName && d.designer_id !== usuario?.id) {
          return false;
        }
      }

      // - Vendedor: restrito à sua revenda/loja designada
      if (isVendedor) {
        if (usuario?.revenda) {
          const revendaDemanda = (d.revenda || '').toLowerCase().trim();
          const revendaUsuario = (usuario.revenda || '').toLowerCase().trim();
          if (revendaDemanda !== revendaUsuario) {
            return false;
          }
        }
        // Se configurado no modo próprio, vendedor vê apenas suas demandas
        if (configuracao?.seller_view_mode === 'own') {
          const vendedorDemanda = (d.vendedor || '').toLowerCase().trim();
          if (vendedorDemanda !== userName && d.seller_id !== usuario?.id) {
            return false;
          }
        }
      }

      // - Admin: Alternador de visão do cabeçalho (olho)
      if (isAdmin) {
        if (adminViewMode === 'pessoal') {
          const dDesigner = (d.designer || '').toLowerCase().trim();
          const dVendedor = (d.vendedor || '').toLowerCase().trim();
          const eMinha = dDesigner === userName || dVendedor === userName || d.seller_id === usuario?.id;
          if (!eMinha) return false;
        }
      }

      // 4. Filtro pelo Seletor Global de Revenda (Dropdown do topo)
      // Válido para Admin e Consultor quando não for '__all__'
      if (!isVendedor && activeRevenda && activeRevenda !== '__all__') {
        const revendaDemanda = (d.revenda || '').toLowerCase().trim();
        const revendaFiltro = activeRevenda.toLowerCase().trim();
        if (revendaDemanda !== revendaFiltro) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [demandas, statusMap, configuracao, usuario, activeRevenda, adminViewMode]);

  // Contadores para as abas rápidas
  const contadores = useMemo(() => {
    const userName = (usuario?.nome || '').toLowerCase().trim();
    let minhas = 0;
    let hoje = 0;
    let atrasadas = 0;
    let altaPrioridade = 0;
    let pendente = 0;
    let amostra = 0;
    let revisao = 0;

    ativas.forEach((d) => {
      const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
      const demTexto = (d.demanda || '').toLowerCase();

      // Identificação precisa de Amostra e Revisão
      const isAmostra =
        isStatusAmostra(d, statusMap) ||
        d.status_id === 'status_amostra' ||
        stNome.includes('amostra');

      const isRevisao =
        isStatusRevisao(d, statusMap) ||
        d.status_id === 'status_revisao' ||
        stNome.includes('revis');

      if (isAmostra) amostra++;
      if (isRevisao) revisao++;

      // Se for Amostra ou Revisão, NÃO conta nas abas principais da fila regular
      if (isAmostra || isRevisao) {
        return;
      }

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
      const alerta = tipoAlertaPrazo(d.prazo, d, statusMap);
      if (alerta === 'hoje') hoje++;
      if (alerta === 'vencido') atrasadas++;

      // Alta prioridade / Urgente
      const et = (d.etiqueta || '').toLowerCase();
      if (et === 'alta' || et === 'urgente') altaPrioridade++;

      // Pendente da fila geral
      const isPendente =
        stNome.includes('pendente') ||
        demTexto.includes('pendente');
      if (isPendente) pendente++;
    });

    const totalFilaRegular = ativas.filter((d) => {
      const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
      const isAmostra = isStatusAmostra(d, statusMap) || d.status_id === 'status_amostra' || stNome.includes('amostra');
      const isRevisao = isStatusRevisao(d, statusMap) || d.status_id === 'status_revisao' || stNome.includes('revis');
      return !isAmostra && !isRevisao;
    }).length;

    return {
      todas: totalFilaRegular,
      minhas,
      hoje,
      atrasadas,
      altaPrioridade,
      pendente,
      amostra,
      revisao,
      amostraRevisao: amostra + revisao,
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
    filtros.tipo_demanda ||
    filtros.prioridade ||
    filtros.etapa ||
    filtros.prazo ||
    ordenacao !== 'prioridade' ||
    sortConfig.key !== 'ordem'
  );

  const visiveis = useMemo(() => {
    let result = ativas;
    const userName = (usuario?.nome || '').toLowerCase().trim();

    // Filtro por Aba Rápida
    if (filtros.aba === 'amostra') {
      result = result.filter((d) => {
        const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
        return (
          isStatusAmostra(d, statusMap) ||
          d.status_id === 'status_amostra' ||
          stNome.includes('amostra')
        );
      });
    } else if (filtros.aba === 'revisao') {
      result = result.filter((d) => {
        const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
        return (
          isStatusRevisao(d, statusMap) ||
          d.status_id === 'status_revisao' ||
          stNome.includes('revis')
        );
      });
    } else if (filtros.aba === 'amostra_revisao') {
      result = result.filter((d) => {
        const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
        return (
          isStatusAmostra(d, statusMap) ||
          isStatusRevisao(d, statusMap) ||
          d.status_id === 'status_amostra' ||
          d.status_id === 'status_revisao' ||
          stNome.includes('amostra') ||
          stNome.includes('revis')
        );
      });
    } else {
      // Em TODAS as outras abas (Todas, Minhas, Hoje, Atrasadas, Alta Prioridade, Pendente):
      // NENHUMA demanda em Amostra ou Revisão deve aparecer, ficando exclusivamente nas suas abas!
      result = result.filter((d) => {
        const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
        const isAmostra = isStatusAmostra(d, statusMap) || d.status_id === 'status_amostra' || stNome.includes('amostra');
        const isRevisao = isStatusRevisao(d, statusMap) || d.status_id === 'status_revisao' || stNome.includes('revis');
        return !isAmostra && !isRevisao;
      });

      if (filtros.aba === 'minhas') {
        result = result.filter(
          (d) =>
            (d.designer || '').toLowerCase().trim() === userName ||
            (d.vendedor || '').toLowerCase().trim() === userName ||
            d.seller_id === usuario?.id
        );
      } else if (filtros.aba === 'hoje') {
        result = result.filter((d) => tipoAlertaPrazo(d.prazo, d, statusMap) === 'hoje');
      } else if (filtros.aba === 'atrasadas') {
        result = result.filter((d) => tipoAlertaPrazo(d.prazo, d, statusMap) === 'vencido');
      } else if (filtros.aba === 'alta_prioridade') {
        result = result.filter((d) => {
          const et = (d.etiqueta || '').toLowerCase();
          return et === 'alta' || et === 'urgente';
        });
      } else if (filtros.aba === 'pendente') {
        result = result.filter((d) => {
          const stNome = (statusMap[d.status_id]?.nome || '').toLowerCase();
          const demTexto = (d.demanda || '').toLowerCase();
          return stNome.includes('pendente') || demTexto.includes('pendente');
        });
      }
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
      if (filtros.designer === '__none__') {
        result = result.filter((d) => !d.designer || d.designer.trim() === '');
      } else {
        result = result.filter((d) => (d.designer || '').toLowerCase().trim() === filtros.designer.toLowerCase().trim());
      }
    }
    if (filtros.vendedor && filtros.vendedor !== '__all__') {
      if (filtros.vendedor === '__none__') {
        result = result.filter((d) => !d.vendedor || d.vendedor.trim() === '');
      } else {
        result = result.filter((d) => (d.vendedor || '').toLowerCase().trim() === filtros.vendedor.toLowerCase().trim());
      }
    }
    if (filtros.revenda && filtros.revenda !== '__all__') {
      if (filtros.revenda === '__none__') {
        result = result.filter((d) => !d.revenda || d.revenda.trim() === '');
      } else {
        result = result.filter((d) => (d.revenda || '').toLowerCase().trim() === filtros.revenda.toLowerCase().trim());
      }
    }
    if (filtros.status && filtros.status !== '__all__') {
      if (filtros.status === 'abertas') {
        // Já filtrado em ativas
      } else {
        result = result.filter((d) => d.status_id === filtros.status);
      }
    }
    if (filtros.tipo_demanda && filtros.tipo_demanda !== '__all__') {
      result = result.filter((d) => {
        const cfg = tipoDemandaConfig(d.tipo_demanda || d.demanda);
        return cfg && cfg.valor === filtros.tipo_demanda.toLowerCase();
      });
    }
    if (filtros.prioridade && filtros.prioridade !== '__all__') {
      if (filtros.prioridade === 'alta_urgente') {
        result = result.filter((d) => ['alta', 'urgente'].includes((d.etiqueta || '').toLowerCase()));
      } else {
        result = result.filter((d) => (d.etiqueta || '').toLowerCase() === filtros.prioridade.toLowerCase());
      }
    }
    if (filtros.complexidade && filtros.complexidade !== '__all__') {
      result = result.filter((d) => {
        const compCfg = complexidadeConfig(d.complexidade);
        const val = compCfg ? compCfg.valor : (d.complexidade || 'normal').toLowerCase();
        return val === filtros.complexidade.toLowerCase();
      });
    }
    if (filtros.etapa && filtros.etapa !== '__all__') {
      result = result.filter((d) => (d.fase_arte || '').toLowerCase() === filtros.etapa.toLowerCase());
    }
    if (filtros.prazo && filtros.prazo !== '__all__') {
      if (filtros.prazo === 'hoje') {
        result = result.filter((d) => tipoAlertaPrazo(d.prazo, d, statusMap) === 'hoje');
      } else if (filtros.prazo === 'atrasadas' || filtros.prazo === 'vencido') {
        result = result.filter((d) => tipoAlertaPrazo(d.prazo, d, statusMap) === 'vencido');
      } else if (filtros.prazo === 'entregue') {
        result = result.filter((d) => tipoAlertaPrazo(d.prazo, d, statusMap) === 'entregue');
      } else if (filtros.prazo === 'congelado') {
        result = result.filter((d) => tipoAlertaPrazo(d.prazo, d, statusMap) === 'congelado');
      } else if (filtros.prazo === 'esta_semana') {
        result = result.filter((d) => {
          const t = tipoAlertaPrazo(d.prazo, d, statusMap);
          return t === 'hoje' || t === 'proximo';
        });
      } else if (filtros.prazo === 'com_data') {
        result = result.filter((d) => Boolean(d.prazo || d.data_especifica));
      } else if (filtros.prazo === 'sem_data') {
        result = result.filter((d) => !d.prazo && !d.data_especifica);
      }
    }

    // Ordenação (por colunas da tabela ou pelo dropdown de Ordenação)
    if (sortConfig.key !== 'ordem') {
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
          const scoreA = calcularScorePrazoProximo(a.prazo, a, statusMap);
          const scoreB = calcularScorePrazoProximo(b.prazo, b, statusMap);
          const diff = scoreA - scoreB;
          return sortConfig.direction === 'asc' ? diff : -diff;
        });
      } else if (sortConfig.key === 'etapa') {
        const etapaIdx = { parado: 0, iniciando: 1, no_meio: 2, finalizando: 3, concluido: 4, alteracao: 5 };
        result = [...result].sort((a, b) => {
          const eA = etapaIdx[a.fase_arte] ?? 0;
          const eB = etapaIdx[b.fase_arte] ?? 0;
          const diff = eA - eB;
          return sortConfig.direction === 'asc' ? diff : -diff;
        });
      } else if (sortConfig.key === 'complexidade') {
        const compWeight = { facil: 1, normal: 2, dificil: 3, complexo: 4 };
        result = [...result].sort((a, b) => {
          const cA = compWeight[complexidadeConfig(a.complexidade)?.valor || 'normal'] || 2;
          const cB = compWeight[complexidadeConfig(b.complexidade)?.valor || 'normal'] || 2;
          const diff = cA - cB;
          return sortConfig.direction === 'asc' ? diff : -diff;
        });
      } else if (sortConfig.key === 'status') {
        result = [...result].sort((a, b) => {
          const sA = statusMap[a.status_id]?.ordem ?? 99;
          const sB = statusMap[b.status_id]?.ordem ?? 99;
          const diff = sA - sB;
          return sortConfig.direction === 'asc' ? diff : -diff;
        });
      } else if (sortConfig.key === 'tipo_demanda') {
        result = [...result].sort((a, b) => {
          const cfgA = tipoDemandaConfig(a.tipo_demanda || a.demanda)?.curto || '';
          const cfgB = tipoDemandaConfig(b.tipo_demanda || b.demanda)?.curto || '';
          const diff = cfgA.localeCompare(cfgB, 'pt-BR', { sensitivity: 'base' });
          return sortConfig.direction === 'asc' ? diff : -diff;
        });
      } else if (sortConfig.key === 'responsavel') {
        result = [...result].sort((a, b) => {
          const respA = `${a.designer || ''} ${a.vendedor || ''}`;
          const respB = `${b.designer || ''} ${b.vendedor || ''}`;
          const diff = respA.localeCompare(respB, 'pt-BR', { sensitivity: 'base' });
          return sortConfig.direction === 'asc' ? diff : -diff;
        });
      }
    } else {
      // Ordenação selecionada no dropdown
      if (ordenacao === 'recentes') {
        result = [...result].sort((a, b) => {
          const timeA = new Date(a.created_date || a.created_at || a.data_criacao || 0).getTime() || 0;
          const timeB = new Date(b.created_date || b.created_at || b.data_criacao || 0).getTime() || 0;
          if (timeB !== timeA) return timeB - timeA;
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
      } else if (ordenacao === 'prazo') {
        result = [...result].sort((a, b) => {
          const scoreA = calcularScorePrazoProximo(a.prazo, a, statusMap);
          const scoreB = calcularScorePrazoProximo(b.prazo, b, statusMap);
          return scoreA - scoreB;
        });
      } else if (ordenacao === 'cliente') {
        result = [...result].sort((a, b) => {
          return (a.cliente || '').localeCompare(b.cliente || '', 'pt-BR', { sensitivity: 'base' });
        });
      } else {
        // 'prioridade' -> Ordem natural manual da fila
        result = [...result].sort((a, b) => {
          const diff = (a.ordem ?? 0) - (b.ordem ?? 0);
          return diff;
        });
      }
    }

    return result;
  }, [ativas, filtros, ordenacao, sortConfig, statusMap, usuario]);

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

  const [dvTab, setDvTab] = useState('designer');

  // Contadores de demandas por categoria para os Popovers de filtro no cabeçalho
  const designerDemandCounts = useMemo(() => {
    const map = {};
    ativas.forEach((d) => {
      const k = (d.designer || '').toLowerCase().trim();
      if (k) map[k] = (map[k] || 0) + 1;
      else map['__none__'] = (map['__none__'] || 0) + 1;
    });
    return map;
  }, [ativas]);

  const vendedorDemandCounts = useMemo(() => {
    const map = {};
    ativas.forEach((d) => {
      const k = (d.vendedor || '').toLowerCase().trim();
      if (k) map[k] = (map[k] || 0) + 1;
      else map['__none__'] = (map['__none__'] || 0) + 1;
    });
    return map;
  }, [ativas]);

  const statusDemandCounts = useMemo(() => {
    const map = {};
    ativas.forEach((d) => {
      if (d.status_id) map[d.status_id] = (map[d.status_id] || 0) + 1;
    });
    return map;
  }, [ativas]);

  const tipoDemandaDemandCounts = useMemo(() => {
    const map = { alteracao_cor: 0, redimensionar: 0, personalizacao_zero: 0, shutter_banco: 0 };
    ativas.forEach((d) => {
      const cfg = tipoDemandaConfig(d.tipo_demanda || d.demanda);
      if (cfg && map[cfg.valor] !== undefined) {
        map[cfg.valor]++;
      }
    });
    return map;
  }, [ativas]);

  const prioridadeDemandCounts = useMemo(() => {
    const map = { urgente: 0, alta: 0, rotina: 0 };
    ativas.forEach((d) => {
      const k = (d.etiqueta || 'rotina').toLowerCase();
      if (map[k] !== undefined) map[k]++;
      else map.rotina++;
    });
    return map;
  }, [ativas]);

  const etapaDemandCounts = useMemo(() => {
    const map = { parado: 0, iniciando: 0, no_meio: 0, finalizando: 0, concluido: 0, alteracao: 0 };
    ativas.forEach((d) => {
      let k = (d.fase_arte || 'parado').toLowerCase().trim();
      if (k === 'concluído' || k === 'arte aprovada') k = 'concluido';
      if (k === 'alteração') k = 'alteracao';
      if (map[k] !== undefined) map[k]++;
      else map.parado++;
    });
    return map;
  }, [ativas]);

  const complexidadeDemandCounts = useMemo(() => {
    const map = { facil: 0, normal: 0, dificil: 0, complexo: 0 };
    ativas.forEach((d) => {
      const cfg = complexidadeConfig(d.complexidade);
      const k = cfg ? cfg.valor : (d.complexidade || 'normal').toLowerCase();
      if (map[k] !== undefined) map[k]++;
      else map.normal++;
    });
    return map;
  }, [ativas]);

  const prazoDemandCounts = useMemo(() => {
    const map = { hoje: 0, atrasadas: 0, entregue: 0, congelado: 0, esta_semana: 0, com_data: 0, sem_data: 0 };
    ativas.forEach((d) => {
      const t = tipoAlertaPrazo(d.prazo, d, statusMap);
      if (t === 'hoje') map.hoje++;
      if (t === 'vencido') map.atrasadas++;
      if (t === 'entregue') map.entregue++;
      if (t === 'congelado') map.congelado++;
      if (t === 'hoje' || t === 'proximo') map.esta_semana++;
      if (d.prazo || d.data_especifica) map.com_data++;
      else map.sem_data++;
    });
    return map;
  }, [ativas, statusMap]);

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
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (!can('priority_reorder')) return;

    // Caso 1: Arrastando entre colunas do Kanban (droppableId = "coluna_status_id")
    if (source.droppableId.startsWith('coluna_') || destination.droppableId.startsWith('coluna_')) {
      const novoStatusId = destination.droppableId.replace('coluna_', '');
      const demandaMovida = ativas.find((d) => d.id === draggableId);
      if (!demandaMovida) return;

      // Se mudou de coluna/status
      if (demandaMovida.status_id !== novoStatusId) {
        await quickUpdateDemanda(demandaMovida, { status_id: novoStatusId });
      }
      return;
    }

    // Caso 2: Reordenação na lista principal (droppableId = "fila")
    const itens = [...ativas];
    const [movido] = itens.splice(source.index, 1);
    itens.splice(destination.index, 0, movido);

    // Atualiza ordem e design_position sem alterar factory_position
    const novos = itens.map((d, i) => ({ id: d.id, ordem: i, design_position: i }));
    const ordemMap = Object.fromEntries(itens.map((d, i) => [d.id, i]));

    setDemandas((prev) =>
      prev.map((d) => (ordemMap[d.id] !== undefined ? { ...d, ordem: ordemMap[d.id], design_position: ordemMap[d.id] } : d))
    );

    // Registra alteração de prioridade no histórico do card movido
    const entradaHist = entradaReordenacaoPrioridade(source.index, destination.index, usuario);
    const movidoAtualizado = {
      ...movido,
      ordem: destination.index,
      design_position: destination.index,
      historico: [entradaHist, ...(movido.historico || [])],
    };

    try {
      await localClient.entities.Demanda.bulkUpdate(novos);
      await localClient.entities.Demanda.update(movido.id, { historico: movidoAtualizado.historico });
    } catch {
      carregar();
    }
  }

  async function definirComoPrioridade(demanda) {
    if (!demanda) return;
    if (!can('priority_reorder')) return;

    const todasAtivas = [...ativas];
    const indexAtual = todasAtivas.findIndex((d) => d.id === demanda.id);
    if (indexAtual === -1) return;

    // Se já estiver no topo e sem filtros, apenas seleciona
    if (indexAtual === 0 && !filtrando) {
      setDemandaSelecionadaId(demanda.id);
      return;
    }

    // Remove da posição atual e insere no topo (#01)
    const [movido] = todasAtivas.splice(indexAtual, 1);
    todasAtivas.unshift(movido);

    const novos = todasAtivas.map((d, i) => ({ id: d.id, ordem: i, design_position: i }));
    const ordemMap = Object.fromEntries(todasAtivas.map((d, i) => [d.id, i]));

    setDemandas((prev) =>
      prev.map((d) => (ordemMap[d.id] !== undefined ? { ...d, ordem: ordemMap[d.id], design_position: ordemMap[d.id] } : d))
    );

    // Reseta filtros e ordenação para que a fila fique limpa e o destaque laranja apareça no topo
    setFiltros({
      busca: '',
      aba: 'todas',
      vendedor: '',
      revenda: '',
      designer: '',
      status: '',
      prioridade: '',
      complexidade: '',
      etapa: '',
    });
    setOrdenacao('prioridade');
    setSortConfig({ key: 'ordem', direction: 'asc' });
    setDemandaSelecionadaId(demanda.id);

    const entradaHist = entradaReordenacaoPrioridade(indexAtual, 0, usuario);
    const movidoAtualizado = {
      ...movido,
      ordem: 0,
      design_position: 0,
      historico: [entradaHist, ...(movido.historico || [])],
    };

    try {
      await localClient.entities.Demanda.bulkUpdate(novos);
      await localClient.entities.Demanda.update(movido.id, { historico: movidoAtualizado.historico });

      emitirNotificacao({
        demanda: movido,
        autor: usuario,
        tipo: NOTIFICATION_TYPES.PRIORIDADE,
        titulo: 'Definida como Prioridade 1',
        mensagem: `${usuario?.nome || 'Alguém'} definiu "${demanda.cliente}" como a Prioridade nº 1 da fila.`,
        link_path: '/',
      });

      toast({
        title: 'Prioridade definida',
        description: `"${demanda.cliente}" foi definida como a Prioridade nº 1 da fila.`,
      });
    } catch (err) {
      console.error('Erro ao definir como prioridade:', err);
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

    const statusIdFinal = data.status_id || statuses[0]?.id || null;

    const nova = await localClient.entities.Demanda.create({
      ...data,
      status_id: statusIdFinal,
      fase_arte: data.fase_arte || 'parado',
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
    const { novoPrazo, diasAjustados, novoStatusId } = opcoes;
    const entradas = [];
    const agora = new Date().toISOString();

    // Entrada da nova alteração/pedido
    entradas.push(entradaSituacao(novoTexto, usuario, agora));

    // Se houve mudança de status
    if (novoStatusId && novoStatusId !== demanda.status_id) {
      entradas.push(
        entradaStatus(statusMap[demanda.status_id]?.nome, statusMap[novoStatusId]?.nome, usuario, agora)
      );
    }

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
      ...(novoStatusId ? { status_id: novoStatusId } : {}),
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

      // Sem Briefing: NÃO MEXE NO PRAZO! Mantém o prazo original (alteração de prazo é exclusivamente manual)
      const ehSemBriefingDestino = isStatusSemBriefing(patch.status_id, statusMap);
      const eraSemBriefingOrigem = isStatusSemBriefing(demanda.status_id, statusMap);

      if (!ehSemBriefingDestino && !eraSemBriefingOrigem) {
        // Se voltar ou mudar para Amostra ou Criação: desmarca entregue_em se houver, sem alterar o prazo original
        if (isStatusAmostra(patch.status_id, statusMap) || isStatusCriacao(patch.status_id, statusMap)) {
          patch.entregue_em = null;
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
        const faseNomes = { parado: 'Arte parada', iniciando: 'Iniciando arte', no_meio: 'No meio da arte', finalizando: 'Finalizando arte', concluido: 'Arte concluída', alteracao: 'Alteração' };
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
      fase_arte: 'parado',
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
        tipo_demanda: item.tipo_demanda || '',
        fase_arte: item.fase_arte || 'parado',
        prazo: item.prazo || '',
        designer: item.designer || '',
        designer_id: item.designer_id || null,
        vendedor: item.vendedor || '',
        seller_id: item.seller_id || null,
        revenda: item.revenda || '',
        company_id: item.company_id || usuario?.company_id || null,
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
    toast({
      title: 'Importação concluída!',
      description: `${novasDemandas.length} demanda(s) importada(s) com sucesso.`,
    });
  }

  async function criarStatus(data) {
    const maxOrdem = statuses.reduce((m, s) => Math.max(m, s.ordem ?? 0), -1);
    const novo = await localClient.entities.Status.create({ ...data, ordem: maxOrdem + 1 });
    setStatuses((prev) => [...prev, novo]);
    setStatusFormOpen(false);
    return novo;
  }

  // --- CONTROLE DE SELEÇÃO EM MASSA (COM SUPORTE A SHIFT) ---
  const toggleSelectDemanda = useCallback(
    (id, checked, isShiftPressed = false) => {
      setSelecionadosIds((prev) => {
        const next = new Set(prev);

        if (isShiftPressed && lastSelectedId && lastSelectedId !== id) {
          const indexAtual = visiveis.findIndex((d) => d.id === id);
          const indexAnterior = visiveis.findIndex((d) => d.id === lastSelectedId);

          if (indexAtual !== -1 && indexAnterior !== -1) {
            const inicio = Math.min(indexAtual, indexAnterior);
            const fim = Math.max(indexAtual, indexAnterior);
            for (let i = inicio; i <= fim; i++) {
              if (checked) {
                next.add(visiveis[i].id);
              } else {
                next.delete(visiveis[i].id);
              }
            }
            return next;
          }
        }

        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });

      setLastSelectedId(id);
    },
    [lastSelectedId, visiveis]
  );

  const todosVisiveisSelecionados = useMemo(() => {
    if (visiveis.length === 0) return false;
    return visiveis.every((d) => selecionadosIds.has(d.id));
  }, [visiveis, selecionadosIds]);

  const algunsVisiveisSelecionados = useMemo(() => {
    return visiveis.some((d) => selecionadosIds.has(d.id)) && !todosVisiveisSelecionados;
  }, [visiveis, selecionadosIds, todosVisiveisSelecionados]);

  const toggleSelectTodos = useCallback(() => {
    setSelecionadosIds((prev) => {
      const next = new Set(prev);
      if (todosVisiveisSelecionados) {
        visiveis.forEach((d) => next.delete(d.id));
      } else {
        visiveis.forEach((d) => next.add(d.id));
      }
      return next;
    });
  }, [todosVisiveisSelecionados, visiveis]);

  const limparSelecao = useCallback(() => {
    setSelecionadosIds(new Set());
    setLastSelectedId(null);
  }, []);

  // --- AÇÕES EM MASSA ---
  const handleAplicarRevendaEmLote = async (novaRevenda) => {
    const ids = Array.from(selecionadosIds);
    if (ids.length === 0 || !novaRevenda) return;

    try {
      const updates = ids.map((id) => ({
        id,
        revenda: novaRevenda,
      }));
      await localClient.entities.Demanda.bulkUpdate(updates);

      // Registrar auditoria para cada uma
      ids.forEach((id) => {
        const d = demandas.find((item) => item.id === id);
        registrarAuditoria('Demanda', id, 'update', {
          campo: 'revenda',
          valor_novo: novaRevenda,
          mensagem: `Revenda definida em lote como "${novaRevenda}" para ${d?.cliente || 'demanda'}.`,
        });
      });

      setDemandas((prev) =>
        prev.map((d) => (selecionadosIds.has(d.id) ? { ...d, revenda: novaRevenda } : d))
      );
      toast({
        title: 'Revenda atualizada em lote!',
        description: `Revenda "${novaRevenda}" aplicada a ${ids.length} ${ids.length === 1 ? 'demanda' : 'demandas'}.`,
      });
      setModalLoteRevendaOpen(false);
      setRevendaLoteSelecionada('');
      limparSelecao();
    } catch (err) {
      toast({
        title: 'Erro ao atualizar revenda em lote',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleAplicarStatusEmLote = async (novoStatusId) => {
    const ids = Array.from(selecionadosIds);
    if (ids.length === 0 || !novoStatusId) return;

    try {
      const updates = ids.map((id) => ({
        id,
        status_id: novoStatusId,
      }));
      await localClient.entities.Demanda.bulkUpdate(updates);

      const stObj = statuses.find((s) => s.id === novoStatusId);
      ids.forEach((id) => {
        registrarAuditoria('Demanda', id, 'update', {
          campo: 'status_id',
          valor_novo: novoStatusId,
          mensagem: `Status atualizado em lote para "${stObj?.nome || novoStatusId}".`,
        });
      });

      setDemandas((prev) =>
        prev.map((d) => (selecionadosIds.has(d.id) ? { ...d, status_id: novoStatusId } : d))
      );
      toast({
        title: 'Status atualizado em lote!',
        description: `${ids.length} ${ids.length === 1 ? 'demanda alterada' : 'demandas alteradas'}.`,
      });
      setModalLoteStatusOpen(false);
      setStatusLoteSelecionado('');
      limparSelecao();
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleAplicarDesignerEmLote = async (novoDesigner) => {
    const ids = Array.from(selecionadosIds);
    if (ids.length === 0) return;

    try {
      const updates = ids.map((id) => ({
        id,
        designer: novoDesigner,
      }));
      await localClient.entities.Demanda.bulkUpdate(updates);

      setDemandas((prev) =>
        prev.map((d) => (selecionadosIds.has(d.id) ? { ...d, designer: novoDesigner } : d))
      );
      toast({
        title: 'Designer atribuído em lote!',
        description: `${ids.length} ${ids.length === 1 ? 'demanda atualizada' : 'demandas atualizadas'}.`,
      });
      setModalLoteDesignerOpen(false);
      setDesignerLoteSelecionado('');
      limparSelecao();
    } catch (err) {
      toast({
        title: 'Erro ao atribuir designer',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleConcluirEmLote = async () => {
    const ids = Array.from(selecionadosIds);
    if (ids.length === 0) return;

    try {
      const agora = new Date().toISOString();
      const updates = ids.map((id) => ({
        id,
        concluida: true,
        data_conclusao: agora,
      }));
      await localClient.entities.Demanda.bulkUpdate(updates);

      setDemandas((prev) =>
        prev.map((d) => (selecionadosIds.has(d.id) ? { ...d, concluida: true, data_conclusao: agora } : d))
      );
      toast({
        title: 'Demandas concluídas em lote!',
        description: `${ids.length} ${ids.length === 1 ? 'demanda marcada como concluída' : 'demandas marcadas como concluídas'}.`,
      });
      limparSelecao();
    } catch (err) {
      toast({
        title: 'Erro ao concluir demandas',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleExcluirEmLote = async () => {
    const ids = Array.from(selecionadosIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${ids.length} demandas selecionadas?`)) return;

    try {
      await Promise.all(ids.map((id) => localClient.entities.Demanda.delete(id)));
      setDemandas((prev) => prev.filter((d) => !selecionadosIds.has(d.id)));
      toast({
        title: 'Demandas excluídas',
        description: `${ids.length} demandas foram removidas.`,
      });
      limparSelecao();
    } catch (err) {
      toast({
        title: 'Erro ao excluir demandas',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  if (!can('priority_view')) {
    return <AcessoNegado mensagem="Você não possui permissão para visualizar a área de Prioridades." />;
  }

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6">
      {/* Coluna Principal da Esquerda: Header, Filtros, Tabela e Paginação */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        
        {/* Faixa de Navegação Rápida, Busca, Filtros e Ações */}
        <div>
          <Filtros
            filtros={filtros}
            setFiltros={setFiltros}
            vendedores={vendedores}
            revendas={revendas}
            designers={designers}
            statuses={statuses}
            ordenacao={ordenacao}
            setOrdenacao={(op) => {
              setOrdenacao(op);
              setSortConfig({ key: 'ordem', direction: 'asc' });
            }}
            contadores={contadores}
            viewMode={filtros.aba === 'todas' ? viewMode : 'lista'}
            onViewModeChange={handleSetViewMode}
            acoesExtras={
              (can('priority_import_csv') || can('priority_create')) && (
                <>
                  {can('priority_import_csv') && (
                    <Button
                      variant="outline"
                      onClick={() => setCsvImportOpen(true)}
                      className="border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground font-medium text-xs sm:text-sm h-10 px-3.5 rounded-lg transition cursor-pointer"
                    >
                      <FileSpreadsheet size={15} className="mr-1.5 shrink-0 opacity-80" /> Importar CSV
                    </Button>
                  )}

                  {can('priority_create') && (
                    <Button
                      onClick={abrirNovo}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm h-10 px-3.5 rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <Plus size={16} className="mr-1 shrink-0 stroke-[2.5]" /> Nova demanda
                    </Button>
                  )}
                </>
              )
            }
          />
        </div>

        {filtrando && (
          <p className="text-xs text-muted-foreground mb-3 italic">
            Filtros ativos — reordenação desativada. Limpe os filtros para arrastar.
          </p>
        )}

        {(filtros.aba === 'amostra' || filtros.aba === 'revisao' || filtros.aba === 'amostra_revisao') && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl border border-border/70 bg-card/70 shadow-xs backdrop-blur-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {filtros.aba === 'amostra' ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0 shadow-xs" />
                    Amostras em andamento
                  </>
                ) : filtros.aba === 'revisao' ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 shadow-xs" />
                    Revisões em andamento
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 shrink-0 shadow-xs" />
                    Amostras e Revisões
                  </>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({visiveis.length} {visiveis.length === 1 ? 'demanda' : 'demandas'})
              </span>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setFiltros((prev) => ({ ...prev, aba: 'amostra' }))}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 text-xs ${
                  filtros.aba === 'amostra'
                    ? 'bg-card text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Amostra</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold">
                  {contadores.amostra ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltros((prev) => ({ ...prev, aba: 'revisao' }))}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 text-xs ${
                  filtros.aba === 'revisao'
                    ? 'bg-card text-orange-600 dark:text-orange-400 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Revisão</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold">
                  {contadores.revisao ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltros((prev) => ({ ...prev, aba: 'amostra_revisao' }))}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 text-xs ${
                  filtros.aba === 'amostra_revisao'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Exibir ambas simultaneamente"
              >
                <span>Ambas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted-foreground/20 text-foreground font-bold">
                  {contadores.amostraRevisao ?? ((contadores.amostra ?? 0) + (contadores.revisao ?? 0))}
                </span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
          </div>
        ) : visiveis.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground rounded-2xl border border-dashed border-border bg-card/40 p-8">
            {filtrando ? 'Nenhuma demanda encontrada com os filtros.' : 'Nenhuma demanda ativa. Clique em "+ Nova demanda" para começar.'}
          </div>
        ) : (viewMode === 'kanban' && filtros.aba === 'todas') ? (
          /* Visualização em Kanban por Status (apenas na aba "Todas") */
          <DragDropContext onDragEnd={onDragEnd}>
            <PrioridadesKanban
              statuses={statuses}
              demandas={visiveis}
              statusMap={statusMap}
              vendedores={vendedores}
              designers={designers}
              revendas={revendas}
              onSelectDemanda={(dem) => {
                setDemandaSelecionadaId((prev) => (prev === dem.id ? null : dem.id));
                setDrawerTab('detalhes');
              }}
              demandaSelecionadaId={demandaSelecionadaId}
              onQuickUpdate={quickUpdateDemanda}
              onEdit={(dem) => {
                setDemandaSelecionadaId(dem.id);
                setDrawerTab('detalhes');
              }}
              onDelete={abrirModalExcluir}
              onConcluir={concluirDemanda}
              onEnviarParaImpressao={enviarParaImpressao}
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
              onDefinirComoPrioridade={definirComoPrioridade}
              canEdit={can('priority_edit')}
              canReorder={can('priority_reorder')}
              filtrando={filtrando}
            />
          </DragDropContext>
        ) : (
          /* Tabela Principal (Lista) */
          <div className="space-y-3">
            {/* Barra Flutuante / Destaque de Ações em Massa */}
            {selecionadosIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-xl shadow-sm text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 px-2 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[11px]">
                    {selecionadosIds.size}
                  </span>
                  <span className="font-semibold text-foreground">
                    {selecionadosIds.size === 1 ? 'demanda selecionada' : 'demandas selecionadas'}
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRevendaLoteSelecionada('');
                      setModalLoteRevendaOpen(true);
                    }}
                    className="h-7.5 px-2.5 text-xs font-semibold border-primary/30 bg-card hover:bg-primary hover:text-primary-foreground transition cursor-pointer"
                  >
                    <Building2 size={13} className="mr-1.5 opacity-80" />
                    Definir Revenda
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStatusLoteSelecionado('');
                      setModalLoteStatusOpen(true);
                    }}
                    className="h-7.5 px-2.5 text-xs font-medium border-border bg-card hover:bg-muted transition cursor-pointer"
                  >
                    <Sparkles size={13} className="mr-1.5 opacity-70" />
                    Alterar Status
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDesignerLoteSelecionado('');
                      setModalLoteDesignerOpen(true);
                    }}
                    className="h-7.5 px-2.5 text-xs font-medium border-border bg-card hover:bg-muted transition cursor-pointer"
                  >
                    <Palette size={13} className="mr-1.5 opacity-70" />
                    Atribuir Designer
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConcluirEmLote}
                    className="h-7.5 px-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    <Check size={13} className="mr-1.5 stroke-[2.5]" />
                    Concluir
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleExcluirEmLote}
                    className="h-7.5 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Excluir selecionadas"
                  >
                    Excluir
                  </Button>

                  <button
                    type="button"
                    onClick={limparSelecao}
                    className="h-7.5 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 ml-1"
                    title="Desmarcar seleção"
                  >
                    <X size={13} />
                    Limpar
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              {/* 1. Cabeçalho da tabela com colunas e menus de filtro interativos: #, PRIORIDADE, CLIENTE, PRAZO, STATUS, DEMANDA, ETAPA, COMPLEXIDADE, D / V, AÇÕES */}
              <div className="w-full grid grid-cols-12 items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider select-none">
                {/* 1. # (Ordem + Seleção Todos) */}
                <div className="col-span-1 flex items-center gap-1.5 min-w-0">
                  <Checkbox
                    checked={todosVisiveisSelecionados ? true : algunsVisiveisSelecionados ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectTodos}
                    className="h-3.5 w-3.5 rounded border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    title={todosVisiveisSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
                  />
                  <div
                    onClick={() => handleSort('ordem')}
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group"
                    title="Ordenar por Posição na Fila"
                  >
                    <span>#</span>
                    {getSortIcon('ordem')}
                  </div>
                </div>

                {/* 2. PRIORIDADE */}
                <Popover>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.prioridade ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Prioridade"
                      >
                        <span>PRIORIDADE</span>
                        {filtros.prioridade ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            1
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('prioridade'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por prioridade"
                    >
                      {getSortIcon('prioridade')}
                    </button>
                  </div>
                  <PopoverContent className="w-60 p-2.5 text-xs space-y-2 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Flame size={13} className="text-primary" /> Filtrar Prioridade
                      </span>
                      {filtros.prioridade && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, prioridade: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prioridade: '' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          !filtros.prioridade ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span>Todas as prioridades</span>
                        <span className="text-[10px] opacity-70">({ativas.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prioridade: 'urgente' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prioridade === 'urgente' ? 'bg-destructive/15 text-destructive font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Urgente
                        </span>
                        <span className="text-[10px] opacity-70">({prioridadeDemandCounts.urgente || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prioridade: 'alta' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prioridade === 'alta' ? 'bg-amber-500/15 text-amber-600 font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> Alta Prioridade
                        </span>
                        <span className="text-[10px] opacity-70">({prioridadeDemandCounts.alta || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prioridade: 'rotina' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prioridade === 'rotina' ? 'bg-muted font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Rotina
                        </span>
                        <span className="text-[10px] opacity-70">({prioridadeDemandCounts.rotina || 0})</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 3. CLIENTE */}
                <Popover>
                  <div className="col-span-3 sm:col-span-3 flex items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.busca || filtros.revenda ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Cliente ou Revenda"
                      >
                        <span>CLIENTE</span>
                        {filtros.busca || filtros.revenda ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            {Boolean(filtros.busca) + Boolean(filtros.revenda)}
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('cliente'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por cliente A-Z"
                    >
                      {getSortIcon('cliente')}
                    </button>
                  </div>
                  <PopoverContent className="w-72 p-2.5 text-xs space-y-2.5 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Search size={13} className="text-primary" /> Filtrar Cliente / Demanda
                      </span>
                      {(filtros.busca || filtros.revenda) && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, busca: '', revenda: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>

                    {/* Busca rápida */}
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        value={filtros.busca}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, busca: e.target.value }))}
                        placeholder="Buscar por cliente ou pedido..."
                        className="h-8 pl-7 text-xs"
                      />
                    </div>

                    {/* Filtro por Revenda */}
                    {revendas.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Building2 size={11} /> Revenda Parceira
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                          <button
                            type="button"
                            onClick={() => setFiltros((prev) => ({ ...prev, revenda: '' }))}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition ${
                              !filtros.revenda ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                            }`}
                          >
                            <span>Todas as revendas</span>
                            {!filtros.revenda && <Check size={11} className="text-primary" />}
                          </button>
                          {revendas.map((r) => {
                            const rNome = r.nome || r.value || r.label;
                            const isSel = (filtros.revenda || '').toLowerCase().trim() === rNome.toLowerCase().trim();
                            return (
                              <button
                                key={r.id || rNome}
                                type="button"
                                onClick={() => setFiltros((prev) => ({ ...prev, revenda: isSel ? '' : rNome }))}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition ${
                                  isSel ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <UserAvatar name={rNome} src={r.logo_url} size="xs" />
                                  <span className="truncate">{rNome}</span>
                                </div>
                                {isSel && <Check size={11} className="text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* 4. PRAZO */}
                <Popover>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.prazo ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Prazo de Entrega"
                      >
                        <span>PRAZO</span>
                        {filtros.prazo ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            1
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('prazo'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por prazo"
                    >
                      {getSortIcon('prazo')}
                    </button>
                  </div>
                  <PopoverContent className="w-60 p-2.5 text-xs space-y-2 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Clock size={13} className="text-primary" /> Filtrar Prazo
                      </span>
                      {filtros.prazo && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, prazo: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: '' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          !filtros.prazo ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span>Todos os prazos</span>
                        <span className="text-[10px] opacity-70">({ativas.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: 'atrasadas' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prazo === 'atrasadas' ? 'bg-destructive/15 text-destructive font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-destructive" /> Atrasadas / Vencidas
                        </span>
                        <span className="text-[10px] opacity-70">({prazoDemandCounts.atrasadas || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: 'entregue' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prazo === 'entregue' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500" /> Entregues (Revisão)
                        </span>
                        <span className="text-[10px] opacity-70">({prazoDemandCounts.entregue || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: 'congelado' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prazo === 'congelado' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <PauseCircle size={12} className="text-amber-500" /> Pausados / Congelados
                        </span>
                        <span className="text-[10px] opacity-70">({prazoDemandCounts.congelado || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: 'hoje' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prazo === 'hoje' ? 'bg-amber-500/15 text-amber-600 font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Flame size={12} className="text-amber-500" /> Vencem Hoje
                        </span>
                        <span className="text-[10px] opacity-70">({prazoDemandCounts.hoje || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: 'esta_semana' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prazo === 'esta_semana' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary" /> Esta Semana
                        </span>
                        <span className="text-[10px] opacity-70">({prazoDemandCounts.esta_semana || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, prazo: 'com_data' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.prazo === 'com_data' ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>Com data definida</span>
                        <span className="text-[10px] opacity-70">({prazoDemandCounts.com_data || 0})</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 5. STATUS */}
                <Popover>
                  <div className="hidden lg:flex lg:col-span-1 items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.status ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Status"
                      >
                        <span>STATUS</span>
                        {filtros.status ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            1
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('status'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por status"
                    >
                      {getSortIcon('status')}
                    </button>
                  </div>
                  <PopoverContent className="w-68 p-2.5 text-xs space-y-2 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles size={13} className="text-primary" /> Filtrar Status
                      </span>
                      {filtros.status && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, status: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, status: '' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          !filtros.status ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span>Todos os status</span>
                        <span className="text-[10px] opacity-70">({ativas.length})</span>
                      </button>
                      {statuses.map((st) => {
                        const cor = getStatusColor(st);
                        const isSel = filtros.status === st.id;
                        const count = statusDemandCounts[st.id] || 0;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            title={st.descricao || (st.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : st.nome)}
                            onClick={() => setFiltros((prev) => ({ ...prev, status: isSel ? '' : st.id }))}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                              isSel ? 'bg-primary/10 text-foreground font-bold border border-primary/20' : 'hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                              <span className="truncate">{st.nome}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] opacity-70">({count})</span>
                              {isSel && <Check size={11} className="text-primary" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 6. DEMANDA (Tipo / Briefing do Projeto) */}
                <Popover>
                  <div className="hidden lg:flex lg:col-span-1 items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.tipo_demanda ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Demanda (Escopo / Criação)"
                      >
                        <span>DEMANDA</span>
                        {filtros.tipo_demanda ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            1
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('tipo_demanda'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por demanda"
                    >
                      {getSortIcon('tipo_demanda')}
                    </button>
                  </div>
                  <PopoverContent className="w-68 p-2.5 text-xs space-y-2 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Layers size={13} className="text-primary" /> Filtrar Demanda
                      </span>
                      {filtros.tipo_demanda && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, tipo_demanda: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 cursor-pointer"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, tipo_demanda: '' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                          !filtros.tipo_demanda ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span>Todas as demandas</span>
                        <span className="text-[10px] opacity-70">({ativas.length})</span>
                      </button>
                      {TIPOS_DEMANDA.map((t) => {
                        const isSel = (filtros.tipo_demanda || '').toLowerCase() === t.valor;
                        const count = tipoDemandaDemandCounts[t.valor] || 0;
                        return (
                          <button
                            key={t.valor}
                            type="button"
                            onClick={() => setFiltros((prev) => ({ ...prev, tipo_demanda: isSel ? '' : t.valor }))}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer group/opt ${
                              isSel ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'hover:bg-muted/60 text-foreground'
                            }`}
                            title={t.nomeCompleto}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                              <span className="font-semibold text-xs tracking-wide">{t.curto}</span>
                              <span className="text-[10px] text-muted-foreground truncate hidden group-hover/opt:inline">
                                ({t.nomeCompleto})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] opacity-70">({count})</span>
                              {isSel && <Check size={11} className="text-primary" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 7. ETAPA */}
                <Popover>
                  <div className="hidden md:flex md:col-span-2 lg:col-span-1 items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.etapa ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Etapa da Arte"
                      >
                        <span>ETAPA</span>
                        {filtros.etapa ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            1
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('etapa'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por etapa"
                    >
                      {getSortIcon('etapa')}
                    </button>
                  </div>
                  <PopoverContent className="w-60 p-2.5 text-xs space-y-2 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Layers size={13} className="text-primary" /> Filtrar Etapa
                      </span>
                      {filtros.etapa && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, etapa: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: '' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          !filtros.etapa ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span>Todas as etapas</span>
                        <span className="text-[10px] opacity-70">({ativas.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: 'parado' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.etapa === 'parado' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>⏸️ Arte parada</span>
                        <span className="text-[10px] opacity-70">({etapaDemandCounts.parado || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: 'iniciando' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.etapa === 'iniciando' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>🎨 Fase 1 (Iniciando)</span>
                        <span className="text-[10px] opacity-70">({etapaDemandCounts.iniciando || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: 'no_meio' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.etapa === 'no_meio' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>✏️ Fase 2 (Ajustes)</span>
                        <span className="text-[10px] opacity-70">({etapaDemandCounts.no_meio || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: 'finalizando' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.etapa === 'finalizando' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>✨ Fase 3 (Finalizando)</span>
                        <span className="text-[10px] opacity-70">({etapaDemandCounts.finalizando || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: 'concluido' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.etapa === 'concluido' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>✅ Concluído</span>
                        <span className="text-[10px] opacity-70">({etapaDemandCounts.concluido || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, etapa: 'alteracao' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          filtros.etapa === 'alteracao' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span>🔄 Alteração</span>
                        <span className="text-[10px] opacity-70">({etapaDemandCounts.alteracao || 0})</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 7. COMPLEXIDADE */}
                <Popover>
                  <div className="hidden md:flex md:col-span-2 lg:col-span-1 items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.complexidade ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Complexidade"
                      >
                        <span>COMPLEXIDADE</span>
                        {filtros.complexidade ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            1
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('complexidade'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por complexidade"
                    >
                      {getSortIcon('complexidade')}
                    </button>
                  </div>
                  <PopoverContent className="w-60 p-2.5 text-xs space-y-2 bg-popover border-border shadow-md" align="start">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <SlidersHorizontal size={13} className="text-primary" /> Filtrar Complexidade
                      </span>
                      {filtros.complexidade && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, complexidade: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setFiltros((prev) => ({ ...prev, complexidade: '' }))}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                          !filtros.complexidade ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <span>Todas as complexidades</span>
                        <span className="text-[10px] opacity-70">({ativas.length})</span>
                      </button>
                      {COMPLEXIDADES.map((c) => {
                        const isSel = (filtros.complexidade || '').toLowerCase() === c.valor;
                        const count = complexidadeDemandCounts[c.valor] || 0;
                        return (
                          <button
                            key={c.valor}
                            type="button"
                            onClick={() => setFiltros((prev) => ({ ...prev, complexidade: isSel ? '' : c.valor }))}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                              isSel ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} /> {c.label}
                            </span>
                            <span className="text-[10px] opacity-70">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 8. D / V (DESIGNER / VENDEDOR) */}
                <Popover>
                  <div className="hidden lg:flex lg:col-span-1 items-center justify-between gap-1 group">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground cursor-pointer ${
                          filtros.designer || filtros.vendedor ? 'text-primary font-extrabold' : 'text-muted-foreground/80'
                        }`}
                        title="Filtrar por Designer ou Vendedor"
                      >
                        <span>D / V</span>
                        {filtros.designer || filtros.vendedor ? (
                          <span className="flex h-4 px-1 items-center justify-center rounded text-[9px] bg-primary text-primary-foreground font-extrabold">
                            {Boolean(filtros.designer) + Boolean(filtros.vendedor)}
                          </span>
                        ) : (
                          <Filter size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSort('responsavel'); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ordenar por responsáveis"
                    >
                      {getSortIcon('responsavel')}
                    </button>
                  </div>
                  <PopoverContent className="w-76 p-2.5 text-xs space-y-2.5 bg-popover border-border shadow-md" align="end">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        Filtrar Responsável
                      </span>
                      {(filtros.designer || filtros.vendedor) && (
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, designer: '', vendedor: '' }))}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                        >
                          <X size={11} /> Limpar
                        </button>
                      )}
                    </div>

                    {/* Alternância de Abas Designer / Vendedor */}
                    <div className="grid grid-cols-2 p-0.5 bg-muted rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setDvTab('designer')}
                        className={`py-1 px-2 rounded-md transition flex items-center justify-center gap-1.5 ${
                          dvTab === 'designer' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Palette size={12} className={dvTab === 'designer' ? 'text-primary' : ''} />
                        <span>Designer</span>
                        {filtros.designer && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDvTab('vendedor')}
                        className={`py-1 px-2 rounded-md transition flex items-center justify-center gap-1.5 ${
                          dvTab === 'vendedor' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <ShoppingBag size={12} className={dvTab === 'vendedor' ? 'text-primary' : ''} />
                        <span>Vendedor</span>
                        {filtros.vendedor && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                    </div>

                    {/* Conteúdo da aba selecionada */}
                    {dvTab === 'designer' ? (
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, designer: '' }))}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                            !filtros.designer ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span>Todos os designers</span>
                          {!filtros.designer && <Check size={11} className="text-primary" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, designer: '__none__' }))}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                            filtros.designer === '__none__' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span className="italic text-muted-foreground">Sem designer atribuído</span>
                          <span className="text-[10px] opacity-70">({designerDemandCounts['__none__'] || 0})</span>
                        </button>

                        {designers.map((d) => {
                          const dNome = d.nome || d.value || d.label;
                          const isSel = (filtros.designer || '').toLowerCase().trim() === dNome.toLowerCase().trim();
                          const count = designerDemandCounts[dNome.toLowerCase().trim()] || 0;
                          return (
                            <button
                              key={d.id || dNome}
                              type="button"
                              onClick={() => setFiltros((prev) => ({ ...prev, designer: isSel ? '' : dNome }))}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                                isSel ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'hover:bg-muted/60 text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <UserAvatar name={dNome} src={d.avatar_url} size="xs" />
                                <span className="truncate">{dNome}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] opacity-70">({count})</span>
                                {isSel && <Check size={11} className="text-primary" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, vendedor: '' }))}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                            !filtros.vendedor ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span>Todos os vendedores</span>
                          {!filtros.vendedor && <Check size={11} className="text-primary" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setFiltros((prev) => ({ ...prev, vendedor: '__none__' }))}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                            filtros.vendedor === '__none__' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span className="italic text-muted-foreground">Sem vendedor atribuído</span>
                          <span className="text-[10px] opacity-70">({vendedorDemandCounts['__none__'] || 0})</span>
                        </button>

                        {vendedores.map((v) => {
                          const vNome = v.nome || v.value || v.label;
                          const isSel = (filtros.vendedor || '').toLowerCase().trim() === vNome.toLowerCase().trim();
                          const count = vendedorDemandCounts[vNome.toLowerCase().trim()] || 0;
                          return (
                            <button
                              key={v.id || vNome}
                              type="button"
                              onClick={() => setFiltros((prev) => ({ ...prev, vendedor: isSel ? '' : vNome }))}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                                isSel ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'hover:bg-muted/60 text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <UserAvatar name={vNome} src={v.avatar_url} size="xs" />
                                <span className="truncate">{vNome}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] opacity-70">({count})</span>
                                {isSel && <Check size={11} className="text-primary" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* 8. AÇÕES */}
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
                          onDefinirComoPrioridade={definirComoPrioridade}
                          onSelectRow={(dem) => {
                            setDemandaSelecionadaId((prev) => (prev === dem.id ? null : dem.id));
                            setDrawerTab('detalhes');
                          }}
                          isSelected={demandaSelecionadaId === d.id}
                          isBulkSelected={selecionadosIds.has(d.id)}
                          onToggleBulkSelect={toggleSelectDemanda}
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
        <div className="w-full lg:w-[470px] shrink-0 rounded-xl border border-border overflow-hidden shadow-xl sticky top-20 h-[calc(100vh-6.5rem)] max-h-[calc(100vh-6.5rem)] bg-card flex flex-col mb-4">
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
            onDefinirComoPrioridade={definirComoPrioridade}
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
        usuarios={usuarios}
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

      {/* Modal: Definir Revenda em Massa */}
      <Dialog open={modalLoteRevendaOpen} onOpenChange={setModalLoteRevendaOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              Definir Revenda em Massa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione uma revenda existente ou digite o nome para aplicar a todas as {selecionadosIds.size} demandas selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Escolher revenda:
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {revendas.map((r) => {
                  const rNome = r.nome || r.value || r.label;
                  const isSel = revendaLoteSelecionada.toLowerCase().trim() === rNome.toLowerCase().trim();
                  return (
                    <button
                      key={r.id || rNome}
                      type="button"
                      onClick={() => setRevendaLoteSelecionada(rNome)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                        isSel
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <UserAvatar name={rNome} src={r.logo_url} size="xs" />
                      <span className="truncate">{rNome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Ou digite uma revenda personalizada:
              </label>
              <Input
                placeholder="Ex: iPapel, Grafica X..."
                value={revendaLoteSelecionada}
                onChange={(e) => setRevendaLoteSelecionada(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalLoteRevendaOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!revendaLoteSelecionada.trim()}
              onClick={() => handleAplicarRevendaEmLote(revendaLoteSelecionada.trim())}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Aplicar a {selecionadosIds.size} {selecionadosIds.size === 1 ? 'demanda' : 'demandas'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Status em Massa */}
      <Dialog open={modalLoteStatusOpen} onOpenChange={setModalLoteStatusOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              Alterar Status em Massa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha o novo status para aplicar a {selecionadosIds.size} demandas selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 max-h-60 overflow-y-auto">
            {statuses.map((st) => {
              const isSel = statusLoteSelecionado === st.id;
              const cor = getStatusColor(st);
              return (
                <button
                  key={st.id}
                  type="button"
                  title={st.descricao || (st.nome === 'C/ Arquivo' ? 'Colocar arquivo impressão' : st.nome)}
                  onClick={() => setStatusLoteSelecionado(st.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                    isSel
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                    <span>{st.nome}</span>
                  </span>
                  {isSel && <Check size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalLoteStatusOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!statusLoteSelecionado}
              onClick={() => handleAplicarStatusEmLote(statusLoteSelecionado)}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Atribuir Designer em Massa */}
      <Dialog open={modalLoteDesignerOpen} onOpenChange={setModalLoteDesignerOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Palette size={18} className="text-primary" />
              Atribuir Designer em Massa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione o designer para atribuir às {selecionadosIds.size} demandas selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => setDesignerLoteSelecionado('')}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                designerLoteSelecionado === ''
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
              }`}
            >
              <span className="italic text-muted-foreground">Sem designer (desatribuir)</span>
              {designerLoteSelecionado === '' && <Check size={14} className="text-primary" />}
            </button>

            {designers.map((des) => {
              const dNome = des.nome || des.value || des.label;
              const isSel = designerLoteSelecionado.toLowerCase().trim() === dNome.toLowerCase().trim();
              return (
                <button
                  key={des.id || dNome}
                  type="button"
                  onClick={() => setDesignerLoteSelecionado(dNome)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                    isSel
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar name={dNome} src={des.avatar_url} size="xs" />
                    <span>{dNome}</span>
                  </div>
                  {isSel && <Check size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalLoteDesignerOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => handleAplicarDesignerEmLote(designerLoteSelecionado)}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
