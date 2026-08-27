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

export function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(100,116,139,${alpha})`;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}