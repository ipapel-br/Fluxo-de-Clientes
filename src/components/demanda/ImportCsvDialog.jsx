import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { parseCSV, mapearRegistrosBitrix } from '@/lib/csvBitrixParser';

export default function ImportCsvDialog({
  open,
  onClose,
  onImport,
  statuses = [],
  revendas = [],
  vendedores = [],
  designers = [],
  usuarios = [],
  demandasExistentes = [],
}) {
  const fileInputRef = useRef(null);
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [vendedorEmMassa, setVendedorEmMassa] = useState('');
  const [designerEmMassa, setDesignerEmMassa] = useState('');

  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));

  // Lista combinada de sugestões de vendedores (cadastrados + encontrados no CSV)
  const listaOpcoesVendedores = useMemo(() => {
    const nomes = new Set();
    vendedores.forEach((v) => {
      const n = typeof v === 'object' ? (v.nome || v.value) : v;
      if (n) nomes.add(n.trim());
    });
    usuarios.forEach((u) => {
      if (u.nome) nomes.add(u.nome.trim());
    });
    itens.forEach((it) => {
      if (it.vendedor) nomes.add(it.vendedor.trim());
    });
    return Array.from(nomes).sort();
  }, [vendedores, usuarios, itens]);

  // Lista de designers cadastrados
  const listaOpcoesDesigners = useMemo(() => {
    const nomes = new Set();
    designers.forEach((d) => {
      const n = typeof d === 'object' ? (d.nome || d.value) : d;
      if (n) nomes.add(n.trim());
    });
    usuarios.forEach((u) => {
      if (u.nome) nomes.add(u.nome.trim());
    });
    itens.forEach((it) => {
      if (it.designer) nomes.add(it.designer.trim());
    });
    return Array.from(nomes).sort();
  }, [designers, usuarios, itens]);

  function handleReset() {
    setArquivo(null);
    setItens([]);
    setErro('');
    setVendedorEmMassa('');
    setDesignerEmMassa('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setCarregando(true);
    setErro('');

    try {
      const text = await file.text();
      const rawRecords = parseCSV(text);

      if (rawRecords.length === 0) {
        setErro('Não foi possível identificar registros válidos no arquivo CSV.');
        setItens([]);
        return;
      }

      const mapeados = mapearRegistrosBitrix(rawRecords, { statuses, revendas, usuarios });

      if (mapeados.length === 0) {
        setErro('Nenhum cliente ou negócio válido pôde ser extraído do CSV.');
        setItens([]);
        return;
      }

      // Identifica itens existentes por nome ou por ID do bitrix
      const existentesNomes = new Set(
        demandasExistentes.map((d) => (d.cliente || '').trim().toLowerCase())
      );
      const existentesBitrixIds = new Set(
        demandasExistentes.map((d) => String(d.bitrix_id || '').trim()).filter(Boolean)
      );

      const itensComStatus = mapeados.map((item) => {
        const clienteNorm = (item.cliente || '').trim().toLowerCase();
        const bitrixNorm = String(item.bitrix_id || '').trim();
        const jaExiste = existentesNomes.has(clienteNorm) || (bitrixNorm && existentesBitrixIds.has(bitrixNorm));

        return {
          ...item,
          jaExiste,
          // Se já está no fluxo, fica DESMARCADO automaticamente!
          selecionado: !jaExiste,
        };
      });

      setItens(itensComStatus);
    } catch (err) {
      console.error('Erro ao ler CSV:', err);
      setErro('Erro ao processar o arquivo CSV. Verifique a codificação do arquivo.');
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }

  function toggleSelecionarTodos(marcar) {
    setItens((prev) => prev.map((it) => ({ ...it, selecionado: marcar })));
  }

  function toggleItem(importId) {
    setItens((prev) =>
      prev.map((it) => (it.importId === importId ? { ...it, selecionado: !it.selecionado } : it))
    );
  }

  function atualizarCampoItem(importId, campo, valor) {
    setItens((prev) =>
      prev.map((it) => {
        if (it.importId !== importId) return it;
        const patch = { [campo]: valor };
        // Se atualizou vendedor ou designer, tenta mapear o ID respectivo
        if (campo === 'vendedor') {
          const uMatch = usuarios.find((u) => (u.nome || '').toLowerCase().trim() === (valor || '').toLowerCase().trim());
          patch.seller_id = uMatch ? uMatch.id : null;
        }
        if (campo === 'designer') {
          const uMatch = usuarios.find((u) => (u.nome || '').toLowerCase().trim() === (valor || '').toLowerCase().trim());
          patch.designer_id = uMatch ? uMatch.id : null;
        }
        return { ...it, ...patch };
      })
    );
  }

  function aplicarVendedorEmMassa() {
    if (!vendedorEmMassa.trim()) return;
    const uMatch = usuarios.find((u) => (u.nome || '').toLowerCase().trim() === vendedorEmMassa.toLowerCase().trim());
    setItens((prev) =>
      prev.map((it) =>
        it.selecionado
          ? { ...it, vendedor: vendedorEmMassa.trim(), seller_id: uMatch ? uMatch.id : it.seller_id }
          : it
      )
    );
  }

  function aplicarDesignerEmMassa() {
    if (!designerEmMassa.trim()) return;
    const uMatch = usuarios.find((u) => (u.nome || '').toLowerCase().trim() === designerEmMassa.toLowerCase().trim());
    setItens((prev) =>
      prev.map((it) =>
        it.selecionado
          ? { ...it, designer: designerEmMassa.trim(), designer_id: uMatch ? uMatch.id : it.designer_id }
          : it
      )
    );
  }

  async function handleConfirmarImportacao() {
    const selecionados = itens.filter((it) => it.selecionado);
    if (selecionados.length === 0) return;

    setProcessando(true);
    try {
      await onImport(selecionados);
      handleReset();
      onClose();
    } catch (err) {
      console.error('Erro na importação:', err);
      setErro('Erro ao salvar demandas no sistema.');
    } finally {
      setProcessando(false);
    }
  }

  const selecionadosCount = itens.filter((it) => it.selecionado).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="text-primary" size={20} /> Importar Leads do Bitrix (CSV)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione o arquivo CSV exportado do Bitrix24. O sistema identificará automaticamente apenas as informações necessárias para preencher os cards no fluxo.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {erro && (
            <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive font-medium border border-destructive/20 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Área de Upload */}
          {!arquivo ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Clique para selecionar o arquivo CSV</p>
                <p className="text-xs text-muted-foreground mt-0.5">Exportado do Bitrix24 (.csv com delimitador ponto e vírgula ou vírgula)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  CSV
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">{arquivo.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {itens.length} lead(s) identificada(s)
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 text-xs">
                <RefreshCw size={13} className="mr-1" /> Trocar arquivo
              </Button>
            </div>
          )}

          {/* Tabela de Pré-visualização e Seleção */}
          {itens.length > 0 && (
            <div className="space-y-3">
              {/* Barra de Ações em Massa (Atribuir Vendedor) */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-muted/40 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selecionadosCount === itens.length}
                    onCheckedChange={(checked) => toggleSelecionarTodos(Boolean(checked))}
                  />
                  <label htmlFor="select-all" className="text-xs font-semibold text-foreground cursor-pointer">
                    Selecionar todos ({selecionadosCount}/{itens.length})
                  </label>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Definir Vendedor em Massa */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Vendedor:</span>
                    <input
                      list="sugestoes-vendedores"
                      value={vendedorEmMassa}
                      onChange={(e) => setVendedorEmMassa(e.target.value)}
                      placeholder="Ex: Lucas Nunes..."
                      className="h-8 px-2.5 text-xs rounded-lg border border-input bg-background w-32 sm:w-40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={aplicarVendedorEmMassa}
                      disabled={!vendedorEmMassa.trim() || selecionadosCount === 0}
                      className="h-8 text-xs font-medium cursor-pointer"
                    >
                      <UserCheck size={13} className="mr-1" /> Aplicar
                    </Button>
                  </div>

                  {/* Definir Designer em Massa */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Designer:</span>
                    <input
                      list="sugestoes-designers"
                      value={designerEmMassa}
                      onChange={(e) => setDesignerEmMassa(e.target.value)}
                      placeholder="Ex: Alan Santos..."
                      className="h-8 px-2.5 text-xs rounded-lg border border-input bg-background w-32 sm:w-40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={aplicarDesignerEmMassa}
                      disabled={!designerEmMassa.trim() || selecionadosCount === 0}
                      className="h-8 text-xs font-medium cursor-pointer"
                    >
                      <UserCheck size={13} className="mr-1" /> Aplicar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Datalist para autocomplete de vendedores e designers */}
              <datalist id="sugestoes-vendedores">
                {listaOpcoesVendedores.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
              <datalist id="sugestoes-designers">
                {listaOpcoesDesigners.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>

              <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden max-h-[55vh] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border sticky top-0 uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3 min-w-[220px]">Cliente</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Etapa / O que precisa</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Vendedor</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Designer</th>
                      <th className="py-2.5 px-3 min-w-[100px]">Prazo</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Status inicial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {itens.map((it) => {
                      const st = statusMap[it.status_id];
                      const vendedorEncontrado = Boolean(it.seller_id || usuarios.some((u) => (u.nome || '').toLowerCase().trim() === (it.vendedor || '').toLowerCase().trim()));
                      const designerEncontrado = Boolean(it.designer_id || usuarios.some((u) => (u.nome || '').toLowerCase().trim() === (it.designer || '').toLowerCase().trim()));

                      return (
                        <tr
                          key={it.importId}
                          onClick={() => toggleItem(it.importId)}
                          className={`hover:bg-muted/40 transition cursor-pointer ${
                            it.selecionado ? 'bg-primary/5' : 'opacity-50'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <Checkbox
                              checked={it.selecionado}
                              onCheckedChange={() => toggleItem(it.importId)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground" title={it.cliente}>
                                {it.cliente}
                              </span>
                              {it.jaExiste && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0.5 px-1.5 font-medium whitespace-nowrap shrink-0 text-amber-600 border-amber-400/50 bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/40"
                                >
                                  Já no fluxo (desmarcado)
                                </Badge>
                              )}
                            </div>
                            {it.revenda && (
                              <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                Revenda: {it.revenda}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                            {it.demanda || <span className="italic text-muted-foreground/50">Sem descrição</span>}
                          </td>
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <input
                                list="sugestoes-vendedores"
                                value={it.vendedor || ''}
                                onChange={(e) => atualizarCampoItem(it.importId, 'vendedor', e.target.value)}
                                placeholder="Selecione vendedor..."
                                className={`h-7 w-full px-2 text-xs rounded-md border bg-background/80 hover:bg-background focus:bg-background focus:outline-none focus:ring-1 font-medium ${
                                  it.vendedor && !vendedorEncontrado
                                    ? 'border-amber-500/60 focus:ring-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'border-input/60 focus:ring-primary text-foreground'
                                }`}
                              />
                              {it.vendedor && !vendedorEncontrado && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <span>⚠️ Não cadastrado</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <input
                                list="sugestoes-designers"
                                value={it.designer || ''}
                                onChange={(e) => atualizarCampoItem(it.importId, 'designer', e.target.value)}
                                placeholder="Selecione designer..."
                                className={`h-7 w-full px-2 text-xs rounded-md border bg-background/80 hover:bg-background focus:bg-background focus:outline-none focus:ring-1 font-medium ${
                                  it.designer && !designerEncontrado
                                    ? 'border-amber-500/60 focus:ring-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'border-input/60 focus:ring-primary text-foreground'
                                }`}
                              />
                              {it.designer && !designerEncontrado && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <span>⚠️ Não cadastrado</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {it.prazo ? (
                              <span className="font-medium text-foreground">
                                {it.prazo.split('-').reverse().join('/')}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {st ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{
                                  backgroundColor: `${st.cor}20`,
                                  color: st.cor,
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.cor }} />
                                {st.nome}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarImportacao}
            disabled={processando || selecionadosCount === 0}
            className="font-semibold shadow-xs"
          >
            {processando ? (
              'Importando...'
            ) : (
              <>
                <CheckCircle2 size={15} className="mr-1.5" /> Importar {selecionadosCount} lead(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
