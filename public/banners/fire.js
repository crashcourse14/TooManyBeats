/**
 * Banner: FIRE
 * Orange/red radial flame particles billow upward with organic flicker.
 */
(() => {
    let raf = null, particles = [];

    window.CardBanners = window.CardBanners || {};
    window.CardBanners.fire = {
        id:    'fire',
        label: '🔥 Fire',
        mount(canvas) {
            particles = [];
            const ctx = canvas.getContext('2d');
            const W = () => canvas.width, H = () => canvas.height;

            const spawn = () => {
                particles.push({
                    x: Math.random() * W(), y: H() + 10,
                    vx: (Math.random() - 0.5) * 1.8,
                    vy: -(2 + Math.random() * 3.5),
                    size: 10 + Math.random() * 16,
                    hue: Math.random() * 38,
                    life: 1, decay: 0.013 + Math.random() * 0.01,
                });
            };

            const tick = () => {
                ctx.fillStyle = 'rgba(8,2,0,0.45)';
                ctx.fillRect(0, 0, W(), H());

                for (let i = 0; i < 3; i++) spawn();

                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.vx + Math.sin(p.y * 0.04) * 0.5;
                    p.y += p.vy;
                    p.size *= 0.988;
                    const ll = 40 + (1 - p.life) * 35;
                    const col = `hsl(${p.hue},100%,${ll}%)`;
                    ctx.save();
                    ctx.globalAlpha = p.life * 0.75;
                    ctx.shadowBlur = 18; ctx.shadowColor = col;
                    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    g.addColorStop(0, `hsl(${p.hue+18},100%,92%)`);
                    g.addColorStop(0.4, col);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    p.life -= p.decay;
                    if (p.life <= 0) particles.splice(i, 1);
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
