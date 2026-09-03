import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function semHorario(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isStatusRevisao(statusOrDemanda, statusMap = {}) {
  if (!statusOrDemanda) return false;
  if (typeof statusOrDemanda === 'string') {
    const s = statusOrDemanda.toLowerCase();
    if (s === 'status_revisao' || s.includes('revis')) return true;
    if (statusMap[statusOrDemanda]) {
      const nome = (statusMap[statusOrDemanda].nome || '').toLowerCase();
      return nome.includes('revis');
    }
    return false;
  }
  if (statusOrDemanda.status_id) {
    if (statusOrDemanda.status_id === 'status_revisao') return true;
    const st = statusMap[statusOrDemanda.status_id];
    if (st && (st.id === 'status_revisao' || (st.nome || '').toLowerCase().includes('revis'))) return true;
  }
  const nome = (statusOrDemanda.nome || statusOrDemanda.status || statusOrDemanda.status_nome || '').toLowerCase();
  if (nome.includes('revis')) return true;
  if (statusOrDemanda.id === 'status_revisao') return true;
  return false;
}

export function isStatusAmostra(statusOrDemanda, statusMap = {}) {
  if (!statusOrDemanda) return false;
  if (typeof statusOrDemanda === 'string') {
    const s = statusOrDemanda.toLowerCase();
    if (s === 'status_amostra' || s.includes('amostra')) return true;
    if (statusMap[statusOrDemanda]) {
      const nome = (statusMap[statusOrDemanda].nome || '').toLowerCase();
      return nome.includes('amostra');
    }
    return false;
  }
  if (statusOrDemanda.status_id) {
    if (statusOrDemanda.status_id === 'status_amostra') return true;
    const st = statusMap[statusOrDemanda.status_id];
    if (st && (st.id === 'status_amostra' || (st.nome || '').toLowerCase().includes('amostra'))) return true;
  }
  const nome = (statusOrDemanda.nome || statusOrDemanda.status || statusOrDemanda.status_nome || '').toLowerCase();
  if (nome.includes('amostra')) return true;
  if (statusOrDemanda.id === 'status_amostra') return true;
  return false;
}

export function isStatusPausa(statusOrDemanda, statusMap = {}) {
  if (!statusOrDemanda) return false;
  if (typeof statusOrDemanda === 'string') {
    const s = statusOrDemanda.toLowerCase();
    if (
      s === 'status_parado' ||
      s.includes('parado') ||
      s.includes('pausa') ||
      s.includes('pendente') ||
      s.includes('travado') ||
      s.includes('bloqueado')
    ) {
      return true;
    }
    if (statusMap[statusOrDemanda]) {
      const nome = (statusMap[statusOrDemanda].nome || '').toLowerCase();
      return (
        nome.includes('parado') ||
        nome.includes('pausa') ||
        nome.includes('pendente') ||
        nome.includes('travado') ||
        nome.includes('bloqueado')
      );
    }
    return false;
  }
  if (statusOrDemanda.status_id) {
    if (statusOrDemanda.status_id === 'status_parado') return true;
    const st = statusMap[statusOrDemanda.status_id];
    if (st) {
      const n = (st.nome || '').toLowerCase();
      if (
        st.id === 'status_parado' ||
        n.includes('parado') ||
        n.includes('pausa') ||
        n.includes('pendente') ||
        n.includes('travado') ||
        n.includes('bloqueado')
      ) {
        return true;
      }
    }
  }
  const nome = (statusOrDemanda.nome || statusOrDemanda.status || statusOrDemanda.status_nome || '').toLowerCase();
  if (
    nome.includes('parado') ||
    nome.includes('pausa') ||
    nome.includes('pendente') ||
    nome.includes('travado') ||
    nome.includes('bloqueado')
  ) {
    return true;
  }
  if (statusOrDemanda.id === 'status_parado') return true;
  return false;
}

export function isStatusCriacao(statusOrDemanda, statusMap = {}) {
  if (!statusOrDemanda) return false;
  if (typeof statusOrDemanda === 'string') {
    const s = statusOrDemanda.toLowerCase();
    if (s === 'status_criacao' || s.includes('cria') || s === 'design' || s === 'arte') return true;
    if (statusMap[statusOrDemanda]) {
      const nome = (statusMap[statusOrDemanda].nome || '').toLowerCase();
      return nome.includes('cria') || nome === 'design' || nome === 'arte';
    }
    return false;
  }
  if (statusOrDemanda.status_id) {
    if (statusOrDemanda.status_id === 'status_criacao') return true;
    const st = statusMap[statusOrDemanda.status_id];
    if (st) {
      const n = (st.nome || '').toLowerCase();
      if (st.id === 'status_criacao' || n.includes('cria') || n === 'design' || n === 'arte') return true;
    }
  }
  const nome = (statusOrDemanda.nome || statusOrDemanda.status || statusOrDemanda.status_nome || '').toLowerCase();
  if (nome.includes('cria') || nome === 'design' || nome === 'arte') return true;
  if (statusOrDemanda.id === 'status_criacao') return true;
  return false;
}

/**
 * Calcula novo prazo somando N dias úteis a partir de uma data base (padrão: hoje).
 * Regras de Fim de Semana:
 * - Sábados e domingos não contam como prazo de entrega.
 * - De segunda a quinta: o prazo vence no dia seguinte (+1 dia).
 * - Na sexta-feira: o prazo pula o final de semana e vence na segunda-feira (+3 dias).
 * - No sábado ou domingo: o prazo vence na terça-feira (segunda-feira + 1 dia útil).
 */
export function calcularPrazoDiasUteis(diasUteis = 1, dataBase = new Date()) {
  const d = new Date(dataBase);
  // Normalizar para o meio-dia para neutralizar oscilações de fuso horário / horário de verão
  d.setHours(12, 0, 0, 0);

  // Se a data de retorno/início cair no fim de semana, avança para a segunda-feira antes de contar
  if (d.getDay() === 6) {
    // Sábado -> avança 2 dias para Segunda
    d.setDate(d.getDate() + 2);
  } else if (d.getDay() === 0) {
    // Domingo -> avança 1 dia para Segunda
    d.setDate(d.getDate() + 1);
  }

  // Adiciona os dias úteis sequencialmente
  let adicionados = 0;
  const qtdParaAdicionar = Math.max(1, Number(diasUteis) || 1);
  while (adicionados < qtdParaAdicionar) {
    d.setDate(d.getDate() + 1);
    const diaSemana = d.getDay();
    // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      adicionados++;
    }
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calcularPrazoFuturo(dias = 1, dataBase = new Date()) {
  return calcularPrazoDiasUteis(dias, dataBase);
}

export function tipoAlertaPrazo(dataStr, statusOrDemanda = null, statusMap = {}) {
  if (statusOrDemanda && isStatusRevisao(statusOrDemanda, statusMap)) {
    return 'entregue';
  }
  if (statusOrDemanda && isStatusPausa(statusOrDemanda, statusMap)) {
    return 'congelado';
  }
  if (!dataStr) return null;
  let d;
  try {
    d = parseISO(dataStr);
  } catch {
    return null;
  }
  if (isNaN(d.getTime())) return null;
  const hoje = semHorario(new Date());
  const data = semHorario(d);
  if (data.getTime() === hoje.getTime()) return 'hoje';
  if (data.getTime() === hoje.getTime() + 86400000) return 'amanha';
  if (data < hoje) return 'vencido';
  return null;
}

export function formatarPrazo(dataStr) {
  if (!dataStr) return '';
  try {
    return format(parseISO(dataStr), 'dd/MM', { locale: ptBR });
  } catch {
    return dataStr;
  }
}

export function formatarPrazoCompleto(dataStr) {
  if (!dataStr) return '';
  try {
    return format(parseISO(dataStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dataStr;
  }
}

export function labelPrazo(dataStr, statusOrDemanda = null, statusMap = {}) {
  const t = tipoAlertaPrazo(dataStr, statusOrDemanda, statusMap);
  if (t === 'entregue') return `Entregue · ${formatarPrazo(dataStr) || 'Em revisão'}`;
  if (t === 'congelado') return `Congelado · ${formatarPrazo(dataStr) || 'Pausado'}`;
  if (t === 'hoje') return 'Hoje';
  if (t === 'amanha') return 'Amanhã';
  if (t === 'vencido') return `Vencido · ${formatarPrazo(dataStr)}`;
  return formatarPrazo(dataStr);
}

export function calcularScorePrazoProximo(dataStr, statusOrDemanda = null, statusMap = {}) {
  if (statusOrDemanda && (isStatusRevisao(statusOrDemanda, statusMap) || isStatusPausa(statusOrDemanda, statusMap))) {
    // Demandas em revisão ou pausa/congeladas não furam a fila como atrasadas críticas
    return 50000;
  }
  if (!dataStr) return 999999999;
  let d;
  try {
    d = parseISO(dataStr);
  } catch {
    return 999999999;
  }
  if (isNaN(d.getTime())) return 999999999;

  const hoje = semHorario(new Date());
  const data = semHorario(d);
  const diffDays = Math.round((data.getTime() - hoje.getTime()) / 86400000);

  if (diffDays >= 0) {
    // 0 = Hoje, 1 = Amanhã, 2 = Em 2 dias... vêm primeiro do mais próximo ao mais distante
    return diffDays;
  } else {
    // Vencidos: vêm em seguida, do mais recente (ex: ontem) para o mais antigo (ex: meses atrás)
    return 10000 + Math.abs(diffDays);
  }
}