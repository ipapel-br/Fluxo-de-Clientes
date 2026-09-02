export const COMPLEXIDADES = [
  {
    valor: 'facil',
    label: 'Fácil',
    cor: '#10b981', // Emerald / Verde
    bgClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    peso: 1,
  },
  {
    valor: 'normal',
    label: 'Normal',
    cor: '#0284c7', // Sky / Azul
    bgClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    peso: 2,
  },
  {
    valor: 'dificil',
    label: 'Difícil',
    cor: '#f97316', // Laranja
    bgClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    peso: 3,
  },
  {
    valor: 'complexo',
    label: 'Complexo',
    cor: '#8b5cf6', // Roxo / Violeta
    bgClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    peso: 4,
  },
];

export function complexidadeConfig(valor) {
  if (!valor) return null;
  const normalizado = String(valor).toLowerCase().trim().replace('í', 'i');
  return COMPLEXIDADES.find(
    (c) => c.valor === normalizado || c.label.toLowerCase() === normalizado
  ) || null;
}
