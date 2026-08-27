export const FASES_ARTE = [
  {
    valor: 'iniciando',
    label: 'Iniciando arte',
    curto: 'Iniciando',
    cor: '#0284c7', // Sky blue
    descricao: 'Briefing e layout inicial',
    icone: '1/3',
  },
  {
    valor: 'no_meio',
    label: 'No meio da arte',
    curto: 'No meio',
    cor: '#8b5cf6', // Violet
    descricao: 'Desenvolvimento e composição',
    icone: '2/3',
  },
  {
    valor: 'finalizando',
    label: 'Finalizando arte',
    curto: 'Finalizando',
    cor: '#10b981', // Emerald
    descricao: 'Ajustes finais e fechamento',
    icone: '3/3',
  },
];

export function faseArteConfig(valor) {
  if (!valor) return null;
  return FASES_ARTE.find((f) => f.valor === valor) || null;
}
