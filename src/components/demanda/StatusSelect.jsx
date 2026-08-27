import { Select, SelectTrigger, SelectContent, SelectItem, SelectSeparator } from '@/components/ui/select';
import { Plus, Settings2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

const NOVO = '__novo__';
const GERENCIAR = '__gerenciar__';

export default function StatusSelect({ statuses, value, onChange, onCriarNovo, onGerenciar }) {
  const atual = statuses.find((s) => s.id === value);
  const sorted = [...statuses].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  function handle(v) {
    if (v === NOVO) {
      onCriarNovo?.();
      return;
    }
    if (v === GERENCIAR) {
      onGerenciar?.();
      return;
    }
    onChange(v);
  }

  return (
    <Select value={value || undefined} onValueChange={handle}>
      <SelectTrigger className="w-full h-9">
        {atual ? (
          <StatusBadge status={atual} />
        ) : (
          <span className="text-sm text-muted-foreground">Selecione...</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {sorted.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum status criado.</div>
        )}
        {sorted.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.cor || '#64748b' }}
              />
              {s.nome}
            </span>
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={NOVO}>
          <span className="flex items-center gap-2 text-primary">
            <Plus size={14} /> Criar novo status
          </span>
        </SelectItem>
        <SelectItem value={GERENCIAR}>
          <span className="flex items-center gap-2">
            <Settings2 size={14} /> Gerenciar status
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}