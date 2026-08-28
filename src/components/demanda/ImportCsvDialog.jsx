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
  demandasExistentes = [],
}) {
  const fileInputRef = useRef(null);
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [vendedorEmMassa, setVendedorEmMassa] = useState('');

  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));

  // Lista combinada de sugestões de vendedores (cadastrados + encontrados no CSV)
  const listaOpcoesVendedores = useMemo(() => {
    const nomes = new Set();
    vendedores.forEach((v) => {
      const n = typeof v === 'object' ? (v.nome || v.value) : v;
      if (n) nomes.add(n.trim());
    });
    itens.forEach((it) => {
      if (it.vendedor) nomes.add(it.vendedor.trim());
    });
    return Array.from(nomes).sort();
  }, [vendedores, itens]);

  function handleReset() {
    setArquivo(null);
    setItens([]);
    setErro('');
    setVendedorEmMassa('');
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

      const mapeados = mapearRegistrosBitrix(rawRecords, { statuses, revendas });

      if (mapeados.length === 0) {
        setErro('Nenhum cliente ou negócio válido pôde ser extraído do CSV.');
        setItens([]);
        return;
      }

      // Marcar se já existe no sistema (por nome do cliente ou ID do Bitrix)
      const existentesMap = new Set(
        demandasExistentes.map((d) => (d.cliente || '').trim().toLowerCase())
      );

      const itensComStatus = mapeados.map((item) => ({
        ...item,
        jaExiste: existentesMap.has((item.cliente || '').trim().toLowerCase()),
      }));

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
      prev.map((it) => (it.importId === importId ? { ...it, [campo]: valor } : it))
    );
  }

  function aplicarVendedorEmMassa() {
    if (!vendedorEmMassa.trim()) return;
    setItens((prev) =>
      prev.map((it) => (it.selecionado ? { ...it, vendedor: vendedorEmMassa.trim() } : it))
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

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Definir vendedor nos selecionados:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      list="sugestoes-vendedores"
                      value={vendedorEmMassa}
                      onChange={(e) => setVendedorEmMassa(e.target.value)}
                      placeholder="Ex: Lucas Nunes..."
                      className="h-8 px-2.5 text-xs rounded-lg border border-input bg-background w-36 sm:w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={aplicarVendedorEmMassa}
                      disabled={!vendedorEmMassa.trim() || selecionadosCount === 0}
                      className="h-8 text-xs font-medium"
                    >
                      <UserCheck size={13} className="mr-1" /> Aplicar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Datalist para autocomplete de vendedores */}
              <datalist id="sugestoes-vendedores">
                {listaOpcoesVendedores.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>

              <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden max-h-[55vh] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border sticky top-0 uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3 min-w-[240px]">Cliente</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Etapa / O que precisa</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Vendedor</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Designer</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Prazo</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Status inicial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {itens.map((it) => {
                      const st = statusMap[it.status_id];
                      return (
                        <tr
                          key={it.importId}
                          onClick={() => toggleItem(it.importId)}
                          className={`hover:bg-muted/40 transition cursor-pointer ${
                            it.selecionado ? 'bg-primary/5' : 'opacity-60'
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
                                  Já no fluxo
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
                            <input
                              list="sugestoes-vendedores"
                              value={it.vendedor || ''}
                              onChange={(e) => atualizarCampoItem(it.importId, 'vendedor', e.target.value)}
                              placeholder="Nome do vendedor..."
                              className="h-7 w-full px-2 text-xs rounded-md border border-input/60 bg-background/80 hover:bg-background focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {it.designer ? (
                              <strong className="text-foreground">{it.designer}</strong>
                            ) : (
                              '—'
                            )}
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
