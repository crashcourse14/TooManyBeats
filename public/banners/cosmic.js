/**
 * Banner: COSMIC
 * Rainbow hue-cycling stars drift gently across a deep space backdrop.
 */
(() => {
    let raf = null, particles = [];

    window.CardBanners = window.CardBanners || {};
    window.CardBanners.cosmic = {
        id:    'cosmic',
        label: '🌌 Cosmic',
        mount(canvas) {
            particles = [];
            const ctx = canvas.getContext('2d');
            const W = () => canvas.width, H = () => canvas.height;

            const spawn = (y) => {
                particles.push({
                    x: Math.random() * W(),
                    y: y !== undefined ? y : Math.random() * H(),
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    size: 0.8 + Math.random() * 3.5,
                    hue: Math.random() * 360,
                    hueShift: 0.8 + Math.random() * 1.5,
                    life: 1, decay: 0.003 + Math.random() * 0.004,
                });
            };

            for (let i = 0; i < 35; i++) spawn();

            const tick = () => {
                ctx.fillStyle = 'rgba(3,0,10,0.35)';
                ctx.fillRect(0, 0, W(), H());

                // Slow nebula sweep
                const t  = Date.now() * 0.0004;
                const ng = ctx.createLinearGradient(0, 0, W(), H());
                ng.addColorStop(0, `hsla(${(t * 40) % 360},70%,15%,0.12)`);
                ng.addColorStop(1, `hsla(${(t * 40 + 180) % 360},70%,15%,0.12)`);
                ctx.fillStyle = ng;
                ctx.fillRect(0, 0, W(), H());

                if (Math.random() < 0.3) spawn(H());

                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.vx; p.y += p.vy;
                    p.hue = (p.hue + p.hueShift) % 360;
                    const col = `hsl(${p.hue},100%,68%)`;

                    ctx.save();
                    ctx.globalAlpha = p.life * 0.8;
                    ctx.shadowBlur = 10; ctx.shadowColor = col;
                    ctx.fillStyle = col;
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
