/**
 * Configuração dos Tipos de Demanda (Briefing / Escopo do Projeto de Design)
 * 
 * Abreviação para visualização compacta na lista:
 * - A. COR -> ALTERAÇÃO DE COR
 * - REDIMENSIONAR -> REDIMENSIONAR
 * - P. DO ZERO -> PERSONALIZAÇÃO DO ZERO
 * - SHUTTER/BANCO -> PERSONALIZAÇÃO COM BANCO/SHUTTER
 */

export const TIPOS_DEMANDA = [
  {
    valor: 'alteracao_cor',
    curto: 'A. COR',
    nomeCompleto: 'ALTERAÇÃO DE COR',
    cor: '#3b82f6', // Blue
    bgClass: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    descricao: 'Alteração e ajuste na paleta de cores da arte',
  },
  {
    valor: 'redimensionar',
    curto: 'REDIMENSIONAR',
    nomeCompleto: 'REDIMENSIONAR',
    cor: '#8b5cf6', // Purple/Violet
    bgClass: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    descricao: 'Ajuste de medidas, proporções e sangrias',
  },
  {
    valor: 'personalizacao_zero',
    curto: 'P. DO ZERO',
    nomeCompleto: 'PERSONALIZAÇÃO DO ZERO',
    cor: '#f97316', // Orange
    bgClass: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    descricao: 'Criação e ilustração autoral desenvolvida do zero',
  },
  {
    valor: 'shutter_banco',
    curto: 'SHUTTER/BANCO',
    nomeCompleto: 'PERSONALIZAÇÃO COM BANCO/SHUTTER',
    cor: '#10b981', // Emerald
    bgClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    descricao: 'Composição de arte utilizando elementos de bancos de imagens (Shutterstock, Freepik, etc)',
  },
];

/**
 * Retorna o objeto de configuração do tipo de demanda
 * @param {string} valor 
 */
export function tipoDemandaConfig(valor) {
  if (!valor) return null;
  const v = String(valor).toLowerCase().trim();

  // Match direto por chave
  const direto = TIPOS_DEMANDA.find((t) => t.valor === v);
  if (direto) return direto;

  // Match por abreviação ou nome completo
  const porNome = TIPOS_DEMANDA.find(
    (t) =>
      t.curto.toLowerCase() === v ||
      t.nomeCompleto.toLowerCase() === v ||
      v.includes(t.curto.toLowerCase()) ||
      v.includes(t.nomeCompleto.toLowerCase())
  );
  if (porNome) return porNome;

  // Detecção inteligente em textos livres (ex: vindos do Bitrix)
  if (v.includes('cor') || v.includes('color') || v.includes('paleta')) {
    return TIPOS_DEMANDA[0]; // alteracao_cor
  }
  if (v.includes('redimension') || v.includes('medida') || v.includes('escala') || v.includes('tamanho')) {
    return TIPOS_DEMANDA[1]; // redimensionar
  }
  if (v.includes('zero') || v.includes('autoral') || v.includes('ilustra')) {
    return TIPOS_DEMANDA[2]; // personalizacao_zero
  }
  if (v.includes('shutter') || v.includes('banco') || v.includes('freepik') || v.includes('stock')) {
    return TIPOS_DEMANDA[3]; // shutter_banco
  }

  return null;
}
