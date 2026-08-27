import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, Pencil, Trash2, Calendar, Check } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EtiquetaBadge from './EtiquetaBadge';
import { labelPrazo, tipoAlertaPrazo } from '@/lib/datas';

const PRAZO_CLASSES = {
  vencido: 'text-red-700 bg-red-50 border-red-200',
  hoje: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
  amanha: 'text-sky-700 bg-sky-50 border-sky-200',
  null: 'text-muted-foreground bg-muted/40 border-border',
};

export default function DemandaItem({ demanda, status, index, onEdit, onDelete, onConcluir, dragDisabled, destaque }) {
  const alerta = tipoAlertaPrazo(demanda.prazo);
  const prazoClass = PRAZO_CLASSES[alerta];

  return (
    <Draggable draggableId={demanda.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative flex items-start gap-3 rounded-xl border bg-card p-3 transition ${
            destaque
              ? 'border-foreground ring-1 ring-foreground bg-foreground/[0.03]'
              : 'border-border hover:border-foreground/15'
          } ${snapshot.isDragging ? 'shadow-lg ring-1 ring-foreground/10' : ''}`}
        >
          {destaque && (
            <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
              Próxima tarefa
            </span>
          )}

          <button
            {...provided.dragHandleProps}
            disabled={dragDisabled}
            className="mt-0.5 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing disabled:cursor-default touch-none"
            aria-label="Arrastar"
          >
            <GripVertical size={18} />
          </button>

          <div
            className={`shrink-0 w-9 text-center font-semibold tabular-nums leading-none pt-1 ${
              destaque ? 'text-2xl text-foreground' : 'text-xl text-muted-foreground'
            }`}
          >
            {String(index + 1).padStart(2, '0')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold leading-tight truncate">{demanda.cliente}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onConcluir(demanda)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-input text-xs hover:bg-foreground hover:text-background transition"
                  title="Concluir rapidamente"
                >
                  <Check size={13} /> Concluir
                </button>
                <button
                  onClick={() => onEdit(demanda)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(demanda)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600"
                  aria-label="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {demanda.demanda && (
              <p className="text-sm text-foreground/80 mt-0.5">{demanda.demanda}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1.5">
              {demanda.vendedor && <span>{demanda.vendedor}</span>}
              {demanda.vendedor && demanda.revenda && <span>·</span>}
              {demanda.revenda && <span>Revenda {demanda.revenda}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {demanda.etiqueta && <EtiquetaBadge etiqueta={demanda.etiqueta} />}
              {demanda.prazo && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${prazoClass}`}
                >
                  <Calendar size={11} />
                  {labelPrazo(demanda.prazo)}
                </span>
              )}
              <StatusBadge status={status} />
            </div>

            {demanda.observacao && (
              <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                {demanda.observacao}
              </p>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}