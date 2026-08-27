import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PRESET_COLORS } from '@/lib/statusColors';

export default function StatusForm({ open, onClose, onSave }) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(PRESET_COLORS[7].hex);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (open) {
      setNome('');
      setCor(PRESET_COLORS[7].hex);
      setConcluido(false);
    }
  }, [open]);

  async function salvar() {
    if (!nome.trim()) return;
    await onSave({ nome: nome.trim(), cor, concluido });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="st-nome">Nome do status</Label>
            <Input
              id="st-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Aguardando arquivo"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && salvar()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor do status</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setCor(c.hex)}
                  title={c.nome}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    cor === c.hex ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={concluido}
              onChange={(e) => setConcluido(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Considerar como concluído (sai da fila ativa)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!nome.trim()}>
            Criar status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}