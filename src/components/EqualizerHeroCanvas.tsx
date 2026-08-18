import React, { useEffect, useRef } from 'react';

interface EqualizerHeroCanvasProps {
  className?: string;
  isPlaying?: boolean;
}

export const EqualizerHeroCanvas: React.FC<EqualizerHeroCanvasProps> = ({
  className = '',
  isPlaying = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });

    resizeObserver.observe(container);

    // Audio frequency bars simulation
    const numBars = 48;
    const bars = Array.from({ length: numBars }, (_, i) => ({
      height: 20 + Math.random() * 40,
      targetHeight: 20 + Math.random() * 40,
      speed: 0.05 + Math.random() * 0.08,
      phase: (i / numBars) * Math.PI * 2,
    }));

    // Floating musical particles
    const symbols = ['♪', '♫', '♬', '♩', '✦', '✧', '🎤'];
    const particles = Array.from({ length: 24 }, () => ({
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 400),
      size: 14 + Math.random() * 18,
      speedY: -0.3 - Math.random() * 0.7,
      speedX: (Math.random() - 0.5) * 0.5,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      opacity: 0.15 + Math.random() * 0.45,
      hue: Math.random() > 0.5 ? 185 : 310, // Cyan or Magenta
      rotation: (Math.random() - 0.5) * 0.4,
    }));

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Subtle Animated Gradient Ambient Waves
      const grad1 = ctx.createRadialGradient(
        width * 0.3 + Math.sin(time * 0.5) * 100,
        height * 0.5 + Math.cos(time * 0.4) * 50,
        10,
        width * 0.3,
        height * 0.5,
        width * 0.5
      );
      grad1.addColorStop(0, 'rgba(6, 182, 212, 0.12)'); // Cyan
      grad1.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.7 + Math.cos(time * 0.6) * 100,
        height * 0.4 + Math.sin(time * 0.5) * 50,
        10,
        width * 0.7,
        height * 0.4,
        width * 0.5
      );
      grad2.addColorStop(0, 'rgba(236, 72, 153, 0.1)'); // Pink
      grad2.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Render Floating Musical Notes
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * 1.5;
            p.y += Math.sin(angle) * 1.5;
          }
        }

        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -30) p.x = width + 20;
        if (p.x > width + 30) p.x = -20;

        ctx.save();
        ctx.font = `${p.size}px sans-serif`;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.opacity})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 0.8)`;
        ctx.shadowBlur = 12;
        ctx.fillText(p.symbol, p.x, p.y);
        ctx.restore();
      });

      // 3. Render Equalizer Bars at Bottom
      const barWidth = Math.max(3, (width / numBars) * 0.55);
      const gap = (width - numBars * barWidth) / (numBars + 1);

      bars.forEach((bar, i) => {
        const wave = Math.sin(time * 3 + bar.phase) * 0.5 + 0.5;
        const wave2 = Math.cos(time * 2 + i * 0.2) * 0.5 + 0.5;
        const targetMultiplier = isPlaying ? (0.3 + wave * 0.7 * wave2) : 0.15;
        const maxBarH = height * 0.35;

        // Proximity to mouse raises bars
        let mouseBoost = 0;
        if (mouseRef.current.active) {
          const barX = gap + i * (barWidth + gap);
          const dist = Math.abs(barX - mouseRef.current.x);
          if (dist < 140) {
            mouseBoost = (1 - dist / 140) * maxBarH * 0.5;
          }
        }

        bar.height += ((targetMultiplier * maxBarH + mouseBoost) - bar.height) * 0.15;

        const x = gap + i * (barWidth + gap);
        const y = height - bar.height;

        const barGrad = ctx.createLinearGradient(0, y, 0, height);
        const hue = 175 + (i / numBars) * 140; // 175 (cyan) to 315 (fuchsia)
        barGrad.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.85)`);
        barGrad.addColorStop(1, `hsla(${hue}, 80%, 45%, 0.15)`);

        ctx.fillStyle = barGrad;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.5)`;
        ctx.shadowBlur = 8;

        // Rounded top bar
        const r = Math.min(barWidth / 2, 4);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isPlaying]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden pointer-events-auto ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
