/**
 * Banner: ICE
 * Six-armed snowflakes spin and drift downward through a cold blue mist.
 */
(() => {
    let raf = null, particles = [];

    window.CardBanners = window.CardBanners || {};
    window.CardBanners.ice = {
        id:    'ice',
        label: '❄️ Ice',
        mount(canvas) {
            particles = [];
            const ctx = canvas.getContext('2d');
            const W = () => canvas.width, H = () => canvas.height;

            const spawn = () => {
                particles.push({
                    x: Math.random() * W(), y: -12,
                    vx: (Math.random() - 0.5) * 0.9,
                    vy: 0.6 + Math.random() * 1.6,
                    size: 3 + Math.random() * 6,
                    spin: (Math.random() - 0.5) * 0.06,
                    angle: Math.random() * Math.PI * 2,
                    hue: 192 + Math.random() * 28,
                    life: 1, decay: 0.004 + Math.random() * 0.005,
                });
            };

            // Pre-seed particles spread across the card
            for (let i = 0; i < 12; i++) {
                spawn();
                particles[particles.length-1].y = Math.random() * H();
            }

            const tick = () => {
                ctx.fillStyle = 'rgba(0,5,14,0.38)';
                ctx.fillRect(0, 0, W(), H());

                if (Math.random() < 0.25) spawn();

                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.vx; p.y += p.vy; p.angle += p.spin;
                    const col = `hsl(${p.hue},75%,${78 + Math.random()*12}%)`;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle);
                    ctx.globalAlpha = p.life * 0.85;
                    ctx.shadowBlur = 10; ctx.shadowColor = col;
                    ctx.strokeStyle = col; ctx.lineWidth = 1;

                    const arm = p.size * 3.5;
                    const bar = p.size * 1.2;
                    for (let a = 0; a < 6; a++) {
                        ctx.rotate(Math.PI / 3);
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, arm); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(-bar, arm * 0.5); ctx.lineTo(bar, arm * 0.5); ctx.stroke();
                    }
                    ctx.restore();

                    p.life -= p.decay;
                    if (p.life <= 0 || p.y > H() + 20) particles.splice(i, 1);
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
