import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function semHorario(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function tipoAlertaPrazo(dataStr) {
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

export function labelPrazo(dataStr) {
  const t = tipoAlertaPrazo(dataStr);
  if (t === 'hoje') return 'Hoje';
  if (t === 'amanha') return 'Amanhã';
  if (t === 'vencido') return `Vencido · ${formatarPrazo(dataStr)}`;
  return formatarPrazo(dataStr);
}