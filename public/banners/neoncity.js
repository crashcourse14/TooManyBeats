/**
 * Banner: NEON CITY
 * Retro synthwave grid receding into the horizon with glowing building silhouettes.
 */
(() => {
    let raf = null, offset = 0;

    window.CardBanners = window.CardBanners || {};
    window.CardBanners.neoncity = {
        id:    'neoncity',
        label: 'Neon City',
        mount(canvas) {
            offset = 0;
            const ctx = canvas.getContext('2d');
            const W = () => canvas.width, H = () => canvas.height;

            // Static buildings (regenerated on resize)
            let buildings = [];
            const genBuildings = () => {
                buildings = [];
                const count = 10;
                for (let i = 0; i < count; i++) {
                    buildings.push({
                        x: (i / count) * W(),
                        w: (W() / count) * (0.4 + Math.random() * 0.5),
                        h: H() * (0.2 + Math.random() * 0.45),
                        hue: 180 + Math.random() * 120,
                        windows: Array.from({ length: 8 }, () => Math.random() > 0.4),
                    });
                }
            };
            genBuildings();

            const tick = () => {
                const w = W(), h = H();
                offset = (offset + 0.4) % (h * 0.5 / 8);

                // Sky gradient
                const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
                sky.addColorStop(0, '#000010');
                sky.addColorStop(1, '#0d0020');
                ctx.fillStyle = sky;
                ctx.fillRect(0, 0, w, h);

                // Horizon glow
                const hg = ctx.createRadialGradient(w/2, h*0.58, 0, w/2, h*0.58, w*0.6);
                hg.addColorStop(0, 'rgba(255,0,200,0.18)');
                hg.addColorStop(0.5, 'rgba(80,0,255,0.08)');
                hg.addColorStop(1, 'transparent');
                ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);

                // Grid floor
                const horizon = h * 0.58;
                const lineCount = 10;
                ctx.save();
                ctx.strokeStyle = 'rgba(255,0,200,0.35)'; ctx.lineWidth = 1;
                // Horizontal grid lines
                for (let i = 0; i <= lineCount; i++) {
                    const t  = (i / lineCount);
                    const yy = horizon + (h - horizon) * (t * t) + offset * t * 3;
                    if (yy > h) continue;
                    ctx.globalAlpha = t * 0.7;
                    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
                }
                // Vertical grid lines (perspective)
                const vLines = 12;
                for (let i = 0; i <= vLines; i++) {
                    const tx = (i / vLines);
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(w * tx, h);
                    ctx.lineTo(w * 0.5 + (tx - 0.5) * 0.01 * w, horizon);
                    ctx.stroke();
                }
                ctx.restore();

                // Buildings silhouettes
                const t = Date.now() * 0.001;
                buildings.forEach((b, bi) => {
                    const top = horizon - b.h;
                    // Body
                    ctx.save();
                    ctx.fillStyle = `hsl(${b.hue},80%,6%)`;
                    ctx.fillRect(b.x, top, b.w, b.h);
                    // Neon outline
                    ctx.strokeStyle = `hsl(${b.hue},100%,55%)`;
                    ctx.shadowColor  = `hsl(${b.hue},100%,55%)`;
                    ctx.shadowBlur   = 8;
                    ctx.lineWidth    = 1;
                    ctx.globalAlpha  = 0.7;
                    ctx.strokeRect(b.x, top, b.w, b.h);
                    // Blinking windows
                    const cols = 3, rows = 4;
                    const cw = b.w / (cols + 1), ch = b.h / (rows + 2);
                    b.windows.forEach((on, wi) => {
                        const col = wi % cols, row = Math.floor(wi / cols);
                        if (!on && Math.random() > 0.002) return;
                        const wx = b.x + (col + 0.5) * cw;
                        const wy = top + (row + 0.8) * ch;
                        ctx.globalAlpha = 0.6 + Math.sin(t * 2 + bi + wi) * 0.2;
                        ctx.fillStyle = `hsl(${b.hue},100%,75%)`;
                        ctx.shadowColor = `hsl(${b.hue},100%,75%)`;
                        ctx.shadowBlur = 6;
                        ctx.fillRect(wx - 2, wy - 3, 4, 5);
                    });
                    ctx.restore();
                });

                // Scanline overlay
                ctx.save();
                for (let y = 0; y < h; y += 4) {
                    ctx.fillStyle = 'rgba(0,0,0,0.06)';
                    ctx.fillRect(0, y, w, 2);
                }
                ctx.restore();

                raf = requestAnimationFrame(tick);
            };
            tick();
        },
        unmount() {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
        },
    };
})();
