/**
 * Configurações de Acabamentos e Status da Fábrica
 * Fluxo de Clientes
 */

export const ACABAMENTOS = [
  { id: 'Autocolante', label: 'Autocolante', cor: '#0284c7', corBg: '#e0f2fe', corBorder: '#7dd3fc' }, // Sky
  { id: 'Textura', label: 'Textura', cor: '#d97706', corBg: '#fef3c7', corBorder: '#fcd34d' }, // Amber
  { id: 'No-woven', label: 'No-woven', cor: '#059669', corBg: '#d1fae5', corBorder: '#6ee7b7' }, // Emerald
  { id: 'Volpe', label: 'Volpe', cor: '#7c3aed', corBg: '#ede9fe', corBorder: '#c4b5fd' }, // Violet
];

export const STATUS_FABRICA = [
  { id: 'aguardando', label: 'Aguardando impressão', cor: '#64748b', corBg: '#f1f5f9', corBorder: '#cbd5e1' },
  { id: 'em_impressao', label: 'Em impressão', cor: '#2563eb', corBg: '#dbeafe', corBorder: '#93c5fd' },
  { id: 'impresso', label: 'Impresso', cor: '#16a34a', corBg: '#dcfce7', corBorder: '#86efac' },
  { id: 'pausado', label: 'Pausado', cor: '#ea580c', corBg: '#ffedd5', corBorder: '#fdba74' },
];

export function acabamentoConfig(nome) {
  if (!nome) return ACABAMENTOS[0];
  const found = ACABAMENTOS.find((a) => a.id.toLowerCase() === String(nome).toLowerCase());
  return found || { id: nome, label: nome, cor: '#475569', corBg: '#f8fafc', corBorder: '#e2e8f0' };
}

export function statusFabricaConfig(statusId) {
  if (!statusId) return STATUS_FABRICA[0];
  const found = STATUS_FABRICA.find((s) => s.id.toLowerCase() === String(statusId).toLowerCase());
  return found || { id: statusId, label: statusId, cor: '#64748b', corBg: '#f1f5f9', corBorder: '#cbd5e1' };
}
