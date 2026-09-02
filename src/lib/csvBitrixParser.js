/**
 * Utilitário para interpretar e mapear CSVs exportados do Bitrix24
 * para o formato de demandas do Fluxo de Clientes.
 */

/**
 * Converte linhas de CSV (com separador ';' ou ',') em array de objetos
 */
export function parseCSV(text) {
  if (!text) return [];

  // Limpar BOM UTF-8 se existir
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  // Determinar delimitador (; ou ,) pela primeira linha
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes(';') ? ';' : ',';

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // pular aspa escapada
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      lines.push(row);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    const item = {
      _criadoPorList: [],
    };
    headers.forEach((header, idx) => {
      const val = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
      const cleanHeader = header.trim();
      
      if (cleanHeader.toLowerCase() === 'criado por' && val) {
        item._criadoPorList.push(val);
      }
      
      // Armazena a primeira ocorrência não vazia
      if (!item[cleanHeader] && val) {
        item[cleanHeader] = val;
      } else if (item[cleanHeader] === undefined) {
        item[cleanHeader] = val;
      }
    });
    records.push(item);
  }

  return records;
}

/**
 * Converte data em formatos comuns (dd/MM/yyyy, dd/MM/yyyy HH:mm, yyyy-MM-dd) para yyyy-MM-dd
 */
export function normalizarData(val) {
  if (!val) return '';
  const str = String(val).trim();

  // Caso: dd/MM/yyyy ou dd/MM/yyyy HH:mm:ss
  const matchBr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchBr) {
    const [, dia, mes, ano] = matchBr;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // Caso: yyyy-MM-dd
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return matchIso[0];
  }

  return '';
}

/**
 * Extrai o nome limpo do cliente a partir do Nome do negócio ou Cliente
 * Exemplo: "O.S - 3618 - Thaise de Sousa Costa - Textura" -> "Thaise de Sousa Costa"
 */
export function extrairNomeCliente(row) {
  const clienteDireto = row['Cliente'] || row['Contato'] || '';
  if (clienteDireto && clienteDireto !== 'Sem título') {
    return clienteDireto.replace(/^Cliente:\s*/i, '').split(';')[0].trim();
  }

  const nomeNegocio = row['Nome do negócio'] || row['Nome do card'] || row['Titulo ipapel'] || '';
  if (!nomeNegocio) return '';

  // Padrão: "O.S - 3618 - Nome do Cliente - ..." ou "O.S. 3609 - Nome do Cliente - ..."
  const matchOs = nomeNegocio.match(/(?:O\.?S\.?\s*-?\s*\d+\s*-\s*)([^-]+)(?:-.*)?$/i);
  if (matchOs && matchOs[1]) {
    return matchOs[1].trim();
  }

  // Padrão: "Nome do Cliente - ..."
  const partes = nomeNegocio.split('-');
  if (partes.length > 1) {
    const primeiraParte = partes[0].trim();
    if (!/^(O\.?S|ORÇAMENTO|PEDIDO|\d+)/i.test(primeiraParte)) {
      return primeiraParte;
    }
    if (partes.length >= 2) {
      return partes[1].trim();
    }
  }

  return nomeNegocio.trim();
}

/**
 * Mapeia o acabamento do Bitrix para os acabamentos do sistema
 */
export function normalizarAcabamento(texto) {
  if (!texto) return 'Autocolante';
  const t = texto.toLowerCase();
  if (t.includes('textura') || t.includes('non woven') || t.includes('non-woven')) return 'Textura';
  if (t.includes('canvas')) return 'Canvas';
  if (t.includes('vinil') || t.includes('vinílic')) return 'Vinílico';
  if (t.includes('acrílico') || t.includes('acrilico')) return 'Acrílico';
  if (t.includes('pvc')) return 'PVC';
  if (t.includes('tecido')) return 'Tecido';
  if (t.includes('autocolante') || t.includes('adesivo')) return 'Autocolante';
  return 'Autocolante';
}

/**
 * Mapeia a urgência/prioridade do Bitrix
 */
export function normalizarEtiqueta(texto) {
  if (!texto) return '';
  const t = texto.toLowerCase();
  if (t.includes('extrema') || t.includes('urgent') || t.includes('altí')) return 'urgente';
  if (t.includes('alta') || t.includes('atenção')) return 'alta';
  return '';
}

/**
 * Mapeia e transforma os registros brutos do CSV do Bitrix
 * em objetos prontos para serem salvos como Demandas.
 */
export function mapearRegistrosBitrix(records, { statuses = [], revendas = [] }) {
  if (!Array.isArray(records)) return [];

  const revendasNomes = (revendas || [])
    .map((r) => (r && typeof r === 'object' ? r.nome : r))
    .filter((r) => typeof r === 'string' && r.trim().length > 0);

  return records
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null;
      const bitrixId = row['ID'] || '';
      const cliente = extrairNomeCliente(row);
      if (!cliente) return null;

      // Etapa / Descrição do que precisa ser feito
      const demandaEtapa =
        row['O que precisa: '] ||
        row['Fase'] ||
        row['Fase Atual'] ||
        row['Tipo de Produto'] ||
        '';

      // Prazo (tenta Prazo Final, Prazo de Criação, Previsão de entrega, Data de fechamento)
      const prazo =
        normalizarData(row['Prazo Final']) ||
        normalizarData(row['Prazo de Criação ']) ||
        normalizarData(row['Previsão de entrega']) ||
        normalizarData(row['Data de fechamento']) ||
        '';

      // Designer (Responsável no Bitrix)
      const designer = (row['Responsável'] || row['Artista'] || '').trim();

      // Vendedor / Vendedora:
      // Identifica quem realmente criou a lead no Bitrix.
      // Se houver múltiplos criadores/consultores, busca o vendedor (ex: Lucas Nunes, Joice Castro)
      // e evita colocar a consultora/gestora Grace Helen como vendedora da demanda.
      let vendedor = '';
      const criadores = Array.isArray(row._criadoPorList) ? row._criadoPorList : [];
      const outrosCriadores = [
        ...criadores,
        row['Criado por'],
        row['Modificado por'],
        row['Atualizado por'],
      ].filter(Boolean);

      // 1. Procura primeiro algum criador que NÃO seja 'Grace Helen'
      const vendedorNaoGrace = outrosCriadores.find(
        (nome) => nome && !nome.toLowerCase().includes('grace')
      );

      if (vendedorNaoGrace) {
        vendedor = vendedorNaoGrace.split(',')[0].trim();
      } else {
        // 2. Se não encontrou, checa em Consultor Responsável algum nome que não seja Grace
        const consultores = (row['Consultor Responsável'] || '').split(',').map((c) => c.trim());
        const consultorVendedor = consultores.find(
          (c) => c && !c.toLowerCase().includes('grace')
        );
        if (consultorVendedor) {
          vendedor = consultorVendedor;
        } else if (outrosCriadores[0]) {
          vendedor = outrosCriadores[0].split(',')[0].trim();
        } else if (consultores[0]) {
          vendedor = consultores[0];
        }
      }

      // Revenda (Loja, UEN, Empresa responsável, ou busca se contém 'Ipapel', etc.)
      let revenda = row['Loja'] || row['UEN'] || '';
      if (!revenda) {
        const textoGeral = `${row['Pipeline'] || ''} ${row['Nome do negócio'] || ''} ${row['Empresa responsável pelo negócio'] || ''}`.toLowerCase();
        const matchRev = revendasNomes.find((r) =>
          r && textoGeral.includes(r.toLowerCase())
        );
        if (matchRev) revenda = matchRev;
      }

      // Acabamento
      const acabamentoTexto = `${row['Base Autocolante (Papel de Parede)'] || ''} ${row['Tipo de Produto'] || ''} ${row['Composição da Demanda'] || ''} ${row['Nome do negócio'] || ''}`;
      const acabamento = normalizarAcabamento(acabamentoTexto);

      // Urgência
      const prioridadeTexto = `${row['Prioridade'] || ''} ${row['Nível de urgência'] || ''}`;
      const etiqueta = normalizarEtiqueta(prioridadeTexto);

      // Status
      let status_id = '';
      const faseBitrix = (row['Fase'] || row['STATUS'] || row['Status atual'] || '').toLowerCase();
      if (faseBitrix) {
        const statusMatch = statuses.find((s) => {
          const sNome = (s.nome || '').toLowerCase();
          if (faseBitrix.includes('revis') && sNome.includes('revis')) return true;
          if (faseBitrix.includes('amostra') && sNome.includes('amostra')) return true;
          if ((faseBitrix.includes('aprovad') || faseBitrix.includes('aprova')) && (sNome.includes('aprovad') || sNome.includes('aprova'))) return true;
          if (faseBitrix.includes('impress') && sNome.includes('impress')) return true;
          if (faseBitrix.includes('conclu') && s.concluido) return true;
          if (faseBitrix.includes('andamento') && sNome.includes('andamento')) return true;
          if (faseBitrix.includes('parado') && sNome.includes('parado')) return true;
          return sNome === faseBitrix;
        });
        if (statusMatch) status_id = statusMatch.id;
      }

      // Fallback para o primeiro status não concluído
      if (!status_id && statuses.length > 0) {
        const primeiro = statuses.find((s) => !s.concluido) || statuses[0];
        status_id = primeiro.id;
      }

      // Observações (Reúne links do Drive e comentários relevantes)
      const obsPartes = [];
      if (bitrixId) obsPartes.push(`ID Bitrix: ${bitrixId}`);
      if (row['Arquivos para criação']) obsPartes.push(`Arquivos: ${row['Arquivos para criação']}`);
      if (row['Informações Extras e Detalhamento']) obsPartes.push(`Detalhes: ${row['Informações Extras e Detalhamento']}`);
      if (row['Obs']) obsPartes.push(row['Obs']);

      const observacao = obsPartes.join(' | ');

      return {
        importId: `bitrix_${bitrixId || index}`,
        bitrix_id: bitrixId,
        cliente,
        demanda: demandaEtapa,
        prazo,
        designer,
        vendedor,
        revenda,
        acabamento,
        etiqueta,
        status_id,
        observacao,
        selecionado: true, // Selecionado por padrão para importação
      };
    })
    .filter(Boolean);
}
