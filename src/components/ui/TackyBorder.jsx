import { cn } from '@/lib/utils';

/**
 * TackyBorder - Efeito de borda luminosa (estilo tacky-borders) estritamente contido no traço da borda.
 * Utiliza máscara CSS de exclusão para que o gradiente e o glow existam apenas no contorno do card.
 */
export function TackyBorder({
  className = '',
  borderWidth = 2,
  borderRadius = '1.25rem',
  duration = 6,
  glow = true,
  colors = ['#00f2fe', '#4facfe', '#7f00ff', '#e100ff', '#ff0844', '#ffb199', '#00f2fe'],
  children,
}) {
  const gradientStops = colors.join(', ');

  return (
    <div
      className={cn('relative group', className)}
      style={{
        borderRadius,
      }}
    >
      {/* 1. Camada de Borda Nítida Animada (confinada ao contorno) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
        style={{
          padding: `${borderWidth}px`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          filter: glow
            ? 'drop-shadow(0 0 5px rgba(79, 172, 254, 0.8)) drop-shadow(0 0 10px rgba(127, 0, 255, 0.5))'
            : 'none',
        }}
        aria-hidden="true"
      >
        <div
          className="absolute -inset-[100%] w-[300%] h-[300%] top-[-100%] left-[-100%] animate-[spin_6s_linear_infinite]"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, ${gradientStops})`,
            animationDuration: `${duration}s`,
          }}
        />
      </div>

      {/* 2. Camada de Glow Externo Suave (confinada a 2px ao redor da borda) */}
      {glow && (
        <div
          className="pointer-events-none absolute -inset-[2px] rounded-[inherit] overflow-hidden opacity-80"
          style={{
            padding: `${borderWidth + 2}px`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            filter: 'blur(4px)',
          }}
          aria-hidden="true"
        >
          <div
            className="absolute -inset-[100%] w-[300%] h-[300%] top-[-100%] left-[-100%] animate-[spin_6s_linear_infinite]"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, ${gradientStops})`,
              animationDuration: `${duration}s`,
            }}
          />
        </div>
      )}

      {/* 3. Conteúdo Interno do Card */}
      <div className="relative z-10 rounded-[inherit] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default TackyBorder;
