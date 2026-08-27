export const ETIQUETAS = [
  { valor: 'urgente', label: 'Urgente', cor: '#ef4444' },
  { valor: 'alta', label: 'Alta Prioridade', cor: '#f97316' },
  { valor: 'rotina', label: 'Rotina', cor: '#3b82f6' },
];

export function etiquetaConfig(valor) {
  return ETIQUETAS.find((e) => e.valor === valor);
}