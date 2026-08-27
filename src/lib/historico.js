import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function agoraIso() {
  return new Date().toISOString();
}

export function formatarDataHistorico(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function entradaCriacao(usuario, data = agoraIso()) {
  return {
    texto: 'Demanda criada',
    data,
    tipo: 'criacao',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaSituacao(texto, usuario, data = agoraIso()) {
  return {
    texto,
    data,
    tipo: 'situacao',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaStatus(deNome, paraNome, usuario, data = agoraIso()) {
  return {
    texto: `Status alterado de "${deNome || '—'}" para "${paraNome || '—'}"`,
    data,
    tipo: 'status',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaPrazo(de, para, usuario, data = agoraIso()) {
  const fmt = (v) =>
    v ? format(new Date(v), 'dd/MM/yyyy', { locale: ptBR }) : 'sem prazo';
  return {
    texto: `Prazo alterado de ${fmt(de)} para ${fmt(para)}`,
    data,
    tipo: 'prazo',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaDesigner(de, para, usuario, data = agoraIso()) {
  return {
    texto: `Designer alterado de "${de || '—'}" para "${para || '—'}"`,
    data,
    tipo: 'designer',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaVendedor(de, para, usuario, data = agoraIso()) {
  return {
    texto: `Vendedor alterado de "${de || '—'}" para "${para || '—'}"`,
    data,
    tipo: 'vendedor',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaRevenda(de, para, usuario, data = agoraIso()) {
  return {
    texto: `Revenda alterada de "${de || '—'}" para "${para || '—'}"`,
    data,
    tipo: 'revenda',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaFaseArte(de, para, usuario, data = agoraIso()) {
  const mapLabel = {
    iniciando: 'Iniciando arte',
    no_meio: 'No meio da arte',
    finalizando: 'Finalizando arte',
  };
  const deTxt = de ? (mapLabel[de] || de) : 'Não iniciada';
  const paraTxt = para ? (mapLabel[para] || para) : 'Não iniciada';
  return {
    texto: `Fase da arte alterada de "${deTxt}" para "${paraTxt}"`,
    data,
    tipo: 'fase_arte',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaAcabamento(de, para, usuario, data = agoraIso()) {
  return {
    texto: `Acabamento alterado de "${de || '—'}" para "${para || '—'}"`,
    data,
    tipo: 'acabamento',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaStatusFabrica(de, para, usuario, data = agoraIso()) {
  const labels = {
    aguardando: 'Aguardando impressão',
    em_impressao: 'Em impressão',
    impresso: 'Impresso',
    pausado: 'Pausado',
  };
  const deTxt = labels[de] || de || 'Aguardando';
  const paraTxt = labels[para] || para || 'Aguardando';
  return {
    texto: `Status de fábrica alterado de "${deTxt}" para "${paraTxt}"`,
    data,
    tipo: 'status_fabrica',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaInicioImpressao(usuario, data = agoraIso()) {
  return {
    texto: 'Iniciou a impressão',
    data,
    tipo: 'inicio_impressao',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaConclusaoImpressao(usuario, data = agoraIso()) {
  return {
    texto: 'Concluiu a impressão na fábrica',
    data,
    tipo: 'conclusao_impressao',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaReordenacaoPrioridade(deOrdem, paraOrdem, usuario, data = agoraIso()) {
  const deNum = String(deOrdem + 1).padStart(2, '0');
  const paraNum = String(paraOrdem + 1).padStart(2, '0');
  return {
    texto: `Alterou a prioridade de ${deNum} para ${paraNum}`,
    data,
    tipo: 'reordenacao',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaReordenacaoFabrica(deOrdem, paraOrdem, usuario, data = agoraIso()) {
  const deNum = String(deOrdem + 1).padStart(2, '0');
  const paraNum = String(paraOrdem + 1).padStart(2, '0');
  return {
    texto: `Alterou a ordem de impressão de ${deNum} para ${paraNum}`,
    data,
    tipo: 'reordenacao_fabrica',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaConclusao(usuario, data = agoraIso()) {
  return {
    texto: 'Demanda concluída',
    data,
    tipo: 'conclusao',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function entradaReabertura(usuario, data = agoraIso()) {
  return {
    texto: 'Demanda reaberta',
    data,
    tipo: 'reabertura',
    usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null,
  };
}

export function gerarEntradasEdicao(antigo, novo, statusMap, usuario) {
  const entradas = [];
  const agora = agoraIso();
  if ((antigo.demanda || '') !== (novo.demanda || '') && novo.demanda) {
    entradas.push(entradaSituacao(novo.demanda, usuario, agora));
  }
  if ((antigo.status_id || '') !== (novo.status_id || '') && novo.status_id) {
    entradas.push(
      entradaStatus(statusMap[antigo.status_id]?.nome, statusMap[novo.status_id]?.nome, usuario, agora)
    );
  }
  if ((antigo.prazo || '') !== (novo.prazo || '')) {
    entradas.push(entradaPrazo(antigo.prazo, novo.prazo, usuario, agora));
  }
  if ((antigo.designer || '') !== (novo.designer || '')) {
    entradas.push(entradaDesigner(antigo.designer, novo.designer, usuario, agora));
  }
  if ((antigo.vendedor || '') !== (novo.vendedor || '')) {
    entradas.push(entradaVendedor(antigo.vendedor, novo.vendedor, usuario, agora));
  }
  if ((antigo.revenda || '') !== (novo.revenda || '')) {
    entradas.push(entradaRevenda(antigo.revenda, novo.revenda, usuario, agora));
  }
  if ((antigo.fase_arte || '') !== (novo.fase_arte || '')) {
    entradas.push(entradaFaseArte(antigo.fase_arte, novo.fase_arte, usuario, agora));
  }
  if ((antigo.acabamento || '') !== (novo.acabamento || '') && novo.acabamento) {
    entradas.push(entradaAcabamento(antigo.acabamento, novo.acabamento, usuario, agora));
  }
  if ((antigo.factory_status || '') !== (novo.factory_status || '') && novo.factory_status) {
    entradas.push(entradaStatusFabrica(antigo.factory_status, novo.factory_status, usuario, agora));
  }
  return entradas;
}