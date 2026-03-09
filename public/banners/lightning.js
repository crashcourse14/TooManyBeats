/**
 * Banner: LIGHTNING
 * Cyan and white jagged bolts crash down, sparks rise from the bottom.
 */
(() => {
    let raf = null, particles = [];

    window.CardBanners = window.CardBanners || {};
    window.CardBanners.lightning = {
        id:    'lightning',
        label: '⚡ Lightning',
        mount(canvas) {
            particles = [];
            const ctx = canvas.getContext('2d');
            const W = () => canvas.width, H = () => canvas.height;

            const spawnBolt = () => {
                const segs = [];
                let cx = Math.random() * W(), cy = 0;
                while (cy < H()) {
                    const nx = cx + (Math.random() - 0.5) * 80;
                    const ny = cy + 20 + Math.random() * 40;
                    segs.push([cx, cy, nx, ny]);
                    cx = nx; cy = ny;
                }
                particles.push({ type: 'bolt', segs, life: 1, decay: 0.07 + Math.random() * 0.05,
                    color: Math.random() < 0.5 ? '#00ffff' : '#ffffff' });
            };

            const spawnSpark = () => {
                particles.push({ type: 'spark',
                    x: Math.random() * W(), y: H() + 4,
                    vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random() * 2.5),
                    life: 1, decay: 0.012 + Math.random() * 0.01,
                    size: 1 + Math.random() * 2,
                    color: `hsl(${185 + Math.random()*30},100%,${65+Math.random()*25}%)` });
            };

            const tick = () => {
                ctx.fillStyle = 'rgba(0,0,10,0.4)';
                ctx.fillRect(0, 0, W(), H());

                if (Math.random() < 0.06) spawnBolt();
                for (let i = 0; i < 2; i++) spawnSpark();

                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    if (p.type === 'bolt') {
                        ctx.save();
                        ctx.globalAlpha = p.life * 0.9;
                        ctx.shadowBlur = 14; ctx.shadowColor = p.color;
                        ctx.strokeStyle = p.color; ctx.lineWidth = p.life * 2;
                        ctx.beginPath();
                        p.segs.forEach(([x1,y1,x2,y2], i) => { if(i===0) ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); });
                        ctx.stroke();
                        ctx.restore();
                    } else {
                        p.x += p.vx; p.y += p.vy;
                        ctx.save();
                        ctx.globalAlpha = p.life;
                        ctx.shadowBlur = 8; ctx.shadowColor = p.color;
                        ctx.fillStyle = p.color;
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                        ctx.restore();
                    }
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
