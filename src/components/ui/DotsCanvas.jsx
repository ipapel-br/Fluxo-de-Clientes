import { useEffect, useRef } from 'react';

export default function DotsCanvas({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let targetX = width / 2;
    let targetY = height / 2;
    let currentX = targetX;
    let currentY = targetY;
    const ease = 0.08;

    const SPACING = 20;
    const BASE_RADIUS = 0.6;
    const MAX_RADIUS = 2.0;
    const INFLUENCE_RADIUS = 180;
    const LIFT_STRENGTH = 8;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      ctx.clearRect(0, 0, width, height);

      // 1. Glow suave no fundo
      const glow = ctx.createRadialGradient(
        currentX,
        currentY,
        0,
        currentX,
        currentY,
        INFLUENCE_RADIUS * 1.2
      );
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      glow.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // 2. Renderização dos pontos com elevação
      for (let x = SPACING / 2; x < width; x += SPACING) {
        for (let y = SPACING / 2; y < height; y += SPACING) {
          const dx = currentX - x;
          const dy = currentY - y;
          const dist = Math.hypot(dx, dy);

          if (dist < INFLUENCE_RADIUS) {
            const factor = Math.cos((dist / INFLUENCE_RADIUS) * (Math.PI / 2));
            const elevatedY = y - factor * LIFT_STRENGTH;
            const radius = BASE_RADIUS + factor * (MAX_RADIUS - BASE_RADIUS);
            const opacity = factor;

            ctx.beginPath();
            ctx.arc(x, elevatedY, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = factor * 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${className}`}
    />
  );
}
