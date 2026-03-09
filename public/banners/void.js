/**
 * Banner: VOID
 * Purple/magenta particles spiral inward toward a pulsing dark vortex.
 */
(() => {
    let raf = null, particles = [];

    window.CardBanners = window.CardBanners || {};
    window.CardBanners.void = {
        id:    'void',
        label: '🌀 Void',
        mount(canvas) {
            particles = [];
            const ctx = canvas.getContext('2d');
            const W = () => canvas.width, H = () => canvas.height;

            const spawn = () => {
                particles.push({
                    x: Math.random() * W(),
                    y: Math.random() * H(),
                    angle: Math.random() * Math.PI * 2,
                    speed: 0.3 + Math.random() * 1,
                    life: 1, decay: 0.005 + Math.random() * 0.006,
                    size: 1 + Math.random() * 2.5,
                    hue: 260 + Math.random() * 60,
                });
            };

            for (let i = 0; i < 30; i++) spawn();

            const tick = () => {
                const cx = W() / 2, cy = H() / 2;
                ctx.fillStyle = 'rgba(2,0,8,0.42)';
                ctx.fillRect(0, 0, W(), H());

                // Pulsing vortex glow at center
                const pulse = 0.05 + Math.abs(Math.sin(Date.now() * 0.0015)) * 0.08;
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W(), H()) * 0.55);
                g.addColorStop(0, `rgba(110,0,220,${pulse})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, W(), H());

                if (Math.random() < 0.4) spawn();

                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    const dx = cx - p.x, dy = cy - p.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    p.x += (dx / dist) * p.speed + Math.cos(p.angle) * 0.4;
                    p.y += (dy / dist) * p.speed + Math.sin(p.angle) * 0.4;
                    p.angle += 0.045;

                    const col = `hsl(${p.hue},100%,62%)`;
                    ctx.save();
                    ctx.globalAlpha = p.life * 0.8;
                    ctx.shadowBlur = 12; ctx.shadowColor = col;
                    ctx.fillStyle = col;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                    ctx.restore();

                    p.life -= p.decay;
                    if (p.life <= 0 || dist < 4) particles.splice(i, 1);
                }
                raf = requestAnimationFrame(tick);
            };
            tick();
        },
        unmount() {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            particles = [];
        },
    };
})();
