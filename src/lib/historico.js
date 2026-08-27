import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function agoraIso() {
  return new Date().toISOString();
}

export function formatarDataHistorico(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'dd/MM/yyyy · HH:mm', { locale: ptBR });
  } catch {
    return iso;
  }
}

export function entradaSituacao(texto, data = agoraIso()) {
  return { texto, data, tipo: 'situacao' };
}

export function entradaStatus(deNome, paraNome, data = agoraIso()) {
  return {
    texto: `Status alterado de "${deNome || '—'}" para "${paraNome || '—'}"`,
    data,
    tipo: 'status',
  };
}

export function entradaPrazo(de, para, data = agoraIso()) {
  const fmt = (v) =>
    v ? format(new Date(v), 'dd/MM/yyyy', { locale: ptBR }) : 'sem prazo';
  return { texto: `Prazo alterado de ${fmt(de)} para ${fmt(para)}`, data, tipo: 'prazo' };
}

export function gerarEntradasEdicao(antigo, novo, statusMap) {
  const entradas = [];
  const agora = agoraIso();
  if ((antigo.demanda || '') !== (novo.demanda || '') && novo.demanda) {
    entradas.push(entradaSituacao(novo.demanda, agora));
  }
  if ((antigo.status_id || '') !== (novo.status_id || '') && novo.status_id) {
    entradas.push(
      entradaStatus(statusMap[antigo.status_id]?.nome, statusMap[novo.status_id]?.nome, agora)
    );
  }
  if ((antigo.prazo || '') !== (novo.prazo || '')) {
    entradas.push(entradaPrazo(antigo.prazo, novo.prazo, agora));
  }
  return entradas;
}