import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { PRESET_COLORS } from '@/lib/statusColors';
import { localClient } from '@/api/localClient';

export default function StatusManager({ open, onClose, statuses, demandas, onChange }) {
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('#64748b');
  const [editConcluido, setEditConcluido] = useState(false);
  const [excluir, setExcluir] = useState(null); // status em processo de exclusão
  const [migrarPara, setMigrarPara] = useState('');

  const sorted = [...statuses].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  function startEdit(s) {
    setEditId(s.id);
    setEditNome(s.nome);
    setEditCor(s.cor || '#64748b');
    setEditConcluido(!!s.concluido);
  }

  async function saveEdit() {
    if (!editNome.trim()) return;
    await localClient.entities.Status.update(editId, {
      nome: editNome.trim(),
      cor: editCor,
      concluido: editConcluido,
    });
    setEditId(null);
    onChange();
  }

  async function mover(s, dir) {
    const i = sorted.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const b = sorted[j];
    await localClient.entities.Status.bulkUpdate([
      { id: s.id, ordem: b.ordem },
      { id: b.id, ordem: s.ordem },
    ]);
    onChange();
  }

  function pedirExcluir(s) {
    const usadas = demandas.filter((d) => d.status_id === s.id).length;
    if (usadas === 0) {
      setExcluir({ status: s, usadas: 0 });
      setMigrarPara('');
    } else {
      setExcluir({ status: s, usadas });
      setMigrarPara('');
    }
  }

  async function confirmarExcluir() {
    const s = excluir.status;
    if (excluir.usadas > 0) {
      if (!migrarPara) return;
      await localClient.entities.Demanda.updateMany({ status_id: s.id }, { $set: { status_id: migrarPara } });
    }
    await localClient.entities.Status.delete(s.id);
    setExcluir(null);
    setMigrarPara('');
    onChange();
  }

  const outros = sorted.filter((s) => !excluir || s.id !== excluir.status.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar status</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto py-1">
          {sorted.map((s, idx) => (
            <div key={s.id} className="border rounded-lg p-3">
              {editId === s.id ? (
                <div className="space-y-3">
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setEditCor(c.hex)}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          editCor === c.hex ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editConcluido}
                      onChange={(e) => setEditConcluido(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>Considerar como concluído</span>
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      <Check size={15} className="mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                      <X size={15} className="mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.cor || '#64748b' }}
                    />
                    <span className="font-medium text-sm truncate">{s.nome}</span>
                    {s.concluido && (
                      <span className="text-xs text-muted-foreground">(concluído)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => mover(s, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      onClick={() => mover(s, 1)}
                      disabled={idx === sorted.length - 1}
                      className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-muted">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => pedirExcluir(s)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {excluir && (
          <div className="mt-3 border rounded-lg p-3 bg-red-50/50">
            {excluir.usadas > 0 ? (
              <>
                <p className="text-sm text-red-700 mb-2">
                  Existem {excluir.usadas} demanda(s) usando este status. Escolha para qual status
                  deseja mover essas demandas antes de excluir.
                </p>
                <select
                  value={migrarPara}
                  onChange={(e) => setMigrarPara(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm mb-2"
                >
                  <option value="">Selecione um status...</option>
                  {outros.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={confirmarExcluir} disabled={!migrarPara}>
                    Mover e excluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(null)}>
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-2">Excluir o status "{excluir.status.nome}"?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={confirmarExcluir}>
                    Excluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(null)}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onChange('novo')}>
            <Plus size={15} className="mr-1" /> Criar novo status
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
