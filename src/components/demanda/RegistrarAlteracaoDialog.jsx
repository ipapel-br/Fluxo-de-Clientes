import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function RegistrarAlteracaoDialog({ open, onClose, onConfirm }) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (open) setTexto('');
  }, [open]);

  function confirmar() {
    if (!texto.trim()) return;
    onConfirm(texto.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova situação / alteração</DialogTitle>
        </DialogHeader>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Descreva a nova orientação..."
          rows={3}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmar();
          }}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!texto.trim()}>
            Registrar alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}