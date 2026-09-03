export const FASES_ARTE = [
  {
    valor: 'parado',
    label: 'Arte parada',
    curto: 'Parado',
    cor: '#ef4444', // Red
    descricao: 'Aguardando início do designer',
    icone: '0/4',
  },
  {
    valor: 'iniciando',
    label: 'Iniciando arte',
    curto: 'Iniciando',
    cor: '#0284c7', // Sky blue
    descricao: 'Briefing e layout inicial',
    icone: '1/4',
  },
  {
    valor: 'no_meio',
    label: 'No meio da arte',
    curto: 'No meio',
    cor: '#f97316', // Laranja
    descricao: 'Desenvolvimento e composição',
    icone: '2/4',
  },
  {
    valor: 'finalizando',
    label: 'Finalizando arte',
    curto: 'Finalizando',
    cor: '#eab308', // Amarelo
    descricao: 'Ajustes finais e fechamento',
    icone: '3/4',
  },
  {
    valor: 'concluido',
    label: 'Arte concluída',
    curto: 'Concluído',
    cor: '#10b981', // Verde
    descricao: 'Arte finalizada e pronta',
    icone: '4/4',
  },
  {
    valor: 'alteracao',
    label: 'Alteração',
    curto: 'Alteração',
    cor: '#8b5cf6', // Roxo / Violeta
    descricao: 'Alterando o arquivo da arte',
    icone: '✏️',
  },
];

export function faseArteConfig(valor) {
  if (!valor) return null;
  const v = String(valor).toLowerCase().trim();
  if (v === 'concluido' || v === 'concluído' || v === 'arte aprovada') {
    return FASES_ARTE.find((f) => f.valor === 'concluido') || null;
  }
  if (v === 'alteracao' || v === 'alteração' || v.includes('altera')) {
    return FASES_ARTE.find((f) => f.valor === 'alteracao') || null;
  }
  return FASES_ARTE.find((f) => f.valor === v) || null;
}
