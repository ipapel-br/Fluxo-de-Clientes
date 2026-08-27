import { hexToRgba } from '@/lib/statusColors';
import { etiquetaConfig } from '@/lib/etiquetas';

export default function EtiquetaBadge({ etiqueta }) {
  const cfg = etiquetaConfig(etiqueta);
  if (!cfg) return null;
  return (
    <span
      style={{
        backgroundColor: hexToRgba(cfg.cor, 0.16),
        color: cfg.cor,
        borderColor: hexToRgba(cfg.cor, 0.38),
      }}
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
    >
      {cfg.label}
    </span>
  );
}