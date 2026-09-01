export const PRESET_COLORS = [
  { nome: 'Vermelho', hex: '#ef4444' },
  { nome: 'Laranja', hex: '#f97316' },
  { nome: 'Âmbar', hex: '#f59e0b' },
  { nome: 'Amarelo', hex: '#eab308' },
  { nome: 'Verde', hex: '#22c55e' },
  { nome: 'Esmeralda', hex: '#10b981' },
  { nome: 'Ciano', hex: '#06b6d4' },
  { nome: 'Azul', hex: '#3b82f6' },
  { nome: 'Índigo', hex: '#6366f1' },
  { nome: 'Violeta', hex: '#8b5cf6' },
  { nome: 'Roxo', hex: '#a855f7' },
  { nome: 'Rosa', hex: '#ec4899' },
  { nome: 'Cinza', hex: '#64748b' },
];

const STATUS_NAME_COLOR_MAP = {
  parado: '#ef4444',
  travado: '#ef4444',
  bloqueado: '#ef4444',
  criacao: '#f59e0b',
  'criação': '#f59e0b',
  design: '#f59e0b',
  arte: '#f59e0b',
  revisao: '#f97316',
  'revisão': '#f97316',
  ajuste: '#f97316',
  amostra: '#06b6d4',
  prova: '#06b6d4',
  aprovacao: '#06b6d4',
  'aprovação': '#06b6d4',
  impressao: '#8b5cf6',
  'impressão': '#8b5cf6',
  producao: '#8b5cf6',
  'produção': '#8b5cf6',
  fabrica: '#8b5cf6',
  'fábrica': '#8b5cf6',
  concluido: '#22c55e',
  'concluído': '#22c55e',
  finalizado: '#22c55e',
};

export function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(100,116,139,${alpha})`;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(100,116,139,${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getStatusColor(status) {
  if (!status) return '#64748b';
  
  const nomeLower = (typeof status === 'string' ? status : status.nome || '').trim().toLowerCase();
  const idLower = (typeof status === 'object' && status.id ? status.id : '').trim().toLowerCase();
  
  // Se tiver cor explícita customizada no status e não for o cinza genérico padrão
  if (typeof status === 'object' && status.cor && status.cor !== '#64748b' && status.cor !== 'gray') {
    return status.cor;
  }
  
  // Buscar no mapa por nome
  if (STATUS_NAME_COLOR_MAP[nomeLower]) {
    return STATUS_NAME_COLOR_MAP[nomeLower];
  }
  
  // Buscar no mapa por ID
  for (const [key, color] of Object.entries(STATUS_NAME_COLOR_MAP)) {
    if (idLower.includes(key)) return color;
  }
  
  return typeof status === 'object' && status.cor ? status.cor : '#3b82f6';
}

export function getStatusBadgeStyle(status) {
  const cor = getStatusColor(status);
  return {
    backgroundColor: hexToRgba(cor, 0.12),
    color: cor,
    borderColor: hexToRgba(cor, 0.28),
  };
}