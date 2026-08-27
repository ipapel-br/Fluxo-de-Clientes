import { hexToRgba } from '@/lib/statusColors';

export default function StatusBadge({ status }) {
  if (!status) {
    return <span className="text-xs text-muted-foreground italic">Sem status</span>;
  }
  const cor = status.cor || '#64748b';
  return (
    <span
      style={{
        backgroundColor: hexToRgba(cor, 0.14),
        color: cor,
        borderColor: hexToRgba(cor, 0.28),
      }}
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    >
      {status.nome}
    </span>
  );
}