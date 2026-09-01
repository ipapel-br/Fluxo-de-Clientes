import { getStatusColor, getStatusBadgeStyle } from '@/lib/statusColors';

export default function StatusBadge({ status, size = 'sm', className = '' }) {
  if (!status) {
    return <span className="text-xs text-muted-foreground italic">Sem status</span>;
  }
  const cor = getStatusColor(status);
  const style = getStatusBadgeStyle(status);
  const nome = typeof status === 'string' ? status : status.nome || 'Status';

  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap shadow-xs transition-all ${
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      } ${className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
        style={{ backgroundColor: cor }}
      />
      <span className="truncate">{nome}</span>
    </span>
  );
}