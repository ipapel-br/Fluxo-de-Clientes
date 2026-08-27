import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function BorderBeam({
  className,
  size = 140,
  duration = 6,
  borderWidth = 2,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  reverse = false,
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, rx: 16 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({
          width: offsetWidth,
          height: offsetHeight,
          rx: 16,
        });
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const perimeter = dimensions.width && dimensions.height
    ? (dimensions.width + dimensions.height) * 2
    : 1000;

  const beamId = useRef(`beam-gradient-${Math.random().toString(36).slice(2, 9)}`).current;

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden', className)}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          width="100%"
          height="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={beamId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorFrom} stopOpacity="1" />
              <stop offset="60%" stopColor={colorTo} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colorTo} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect
            x={borderWidth / 2}
            y={borderWidth / 2}
            width={Math.max(0, dimensions.width - borderWidth)}
            height={Math.max(0, dimensions.height - borderWidth)}
            rx={dimensions.rx}
            ry={dimensions.rx}
            fill="none"
            stroke={`url(#${beamId})`}
            strokeWidth={borderWidth}
            strokeDasharray={`${size} ${perimeter}`}
            strokeLinecap="round"
            style={{
              animation: `border-beam-svg ${duration}s linear infinite ${reverse ? 'reverse' : 'normal'}`,
            }}
          />
        </svg>
      )}
    </div>
  );
}

export default BorderBeam;
