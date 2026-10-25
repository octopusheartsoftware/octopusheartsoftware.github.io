// WaddleWorld Arcade: the little games on the laptop's Arcade tab.
// Arcade.start(canvas, name, hooks) runs one game until the canvas leaves the page.
// hooks.active() says whether the game should be moving (false while paused or on another tab);
// hooks.onPlay(seconds) is called while the player is actually playing, so the main game can ease stress.
(function () {
  'use strict';
  const W = 560, H = 260;
  const INK = '#1e1f26', SKY = '#cfe8f7', GRASS = '#7bbf6a', DIRT = '#8a6a48';

  // 8×8 pixel goose, two running frames. w white, k black, o orange
  const GOOSE = [
    ['....kk..', '...kwwo.', '....ww..', '....ww..', 'wwwwww..', 'wwwwwww.', '.wwwww..', '..o..o..'],
    ['....kk..', '...kwwo.', '....ww..', '....ww..', 'wwwwww..', 'wwwwwww.', '.wwwww..', '.o....o.']
  ];
  const COLORS = { w: '#fbfbf4', k: INK, o: '#f2994a' };
  function sprite(ctx, rows, x, y, px) {
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      ctx.fillStyle = COLORS[ch];
      ctx.fillRect(x + c * px, y + r * px, px, px);
    }));
  }

  let current = null;
  const sfx = (name) => { if (window.Sound) Sound.play(name); };
  const keys = {};
  document.addEventListener('keydown', (e) => {
    if (!current || !current.hooks.active()) return;
    if ([' ', 'ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
      e.preventDefault(); // don't scroll the page or press a focused button
      if (!keys[e.key]) current.press(e.key);
      keys[e.key] = true;
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  function start(canvas, name, hooks) {
    stop();
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const game = name === 'pong' ? pong(canvas) : runner();
    current = { canvas, hooks, press: game.press, game };
    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); game.press(' '); canvas.focus(); });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      if (game.mouse) game.mouse((e.clientY - r.top) / r.height * H);
    });
    let last = performance.now();
    function frame(now) {
      if (!current || current.canvas !== canvas || !document.body.contains(canvas)) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (hooks.active()) {
        game.update(dt);
        if (game.playing()) hooks.onPlay(dt);
      }
      game.draw(ctx, hooks.active());
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function stop() { current = null; }

  function banner(ctx, lines) {
    ctx.fillStyle = 'rgba(16,22,43,.78)';
    ctx.fillRect(110, 80, 340, 34 + lines.length * 22);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => { ctx.font = i ? '15px "Pixelify Sans", monospace' : '22px "Pixelify Sans", monospace'; ctx.fillText(l, W / 2, 108 + i * 24); });
    ctx.textAlign = 'left';
  }

  // ---------- Goose Run ----------
  function runner() {
    const GROUND = 210, PX = 5;
    let state = 'ready', y = GROUND - 8 * PX, vy = 0, obs = [], speed = 220, dist = 0, best = 0, spawn = 1, step = 0;
    const onGround = () => y >= GROUND - 8 * PX - 0.5;
    function reset() { state = 'run'; y = GROUND - 8 * PX; vy = 0; obs = []; speed = 220; dist = 0; spawn = 1; }
    return {
      playing: () => state === 'run',
      press() {
        if (state !== 'run') return reset();
        if (onGround()) { vy = -560; sfx('jump'); }
      },
      update(dt) {
        if (state !== 'run') return;
        vy += 1500 * dt; y = Math.min(GROUND - 8 * PX, y + vy * dt);
        speed += 6 * dt; dist += speed * dt; step += dt;
        spawn -= dt;
        if (spawn <= 0) {
          const big = Math.random() < 0.35;
          obs.push({ x: W + 10, w: big ? 26 : 16, h: big ? 34 : 24 });
          spawn = 0.9 + Math.random() * 1.1;
        }
        obs.forEach((o) => { o.x -= speed * dt; });
        obs = obs.filter((o) => o.x > -40);
        // Forgiving hitbox: the goose's body, not its whole sprite square
        const gx = 60 + 6, gw = 8 * PX - 14, gy = y + 10, gh = 8 * PX - 12;
        if (obs.some((o) => gx < o.x + o.w && gx + gw > o.x && gy + gh > GROUND - o.h)) {
          state = 'over'; best = Math.max(best, Math.floor(dist / 10)); sfx('bump');
        }
      },
      draw(ctx, active) {
        ctx.fillStyle = SKY; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff'; // pixel clouds, drifting
        for (let i = 0; i < 3; i++) { const cx = (i * 210 - dist * 0.2) % (W + 120); const x = cx < -100 ? cx + W + 120 : cx; ctx.fillRect(x, 40 + i * 18, 60, 14); ctx.fillRect(x + 12, 30 + i * 18, 34, 12); }
        ctx.fillStyle = GRASS; ctx.fillRect(0, GROUND, W, 10);
        ctx.fillStyle = DIRT; ctx.fillRect(0, GROUND + 10, W, H - GROUND);
        obs.forEach((o) => { // traffic cones
          ctx.fillStyle = '#f97316'; ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
          ctx.fillStyle = '#fff'; ctx.fillRect(o.x, GROUND - o.h * 0.6, o.w, 5);
          ctx.fillStyle = INK; ctx.fillRect(o.x - 3, GROUND - 4, o.w + 6, 4);
        });
        sprite(ctx, GOOSE[onGround() && state === 'run' ? Math.floor(step * 8) % 2 : 0], 60, y, PX);
        ctx.fillStyle = INK; ctx.font = '16px "Pixelify Sans", monospace';
        ctx.fillText(`Score ${Math.floor(dist / 10)}   Best ${best}`, 16, 24);
        if (!active && state === 'run') banner(ctx, ['Paused']);
        else if (state === 'ready') banner(ctx, ['Goose Run', 'Space, ↑ or click to jump the cones']);
        else if (state === 'over') banner(ctx, ['Honk! You hit a cone.', `Score ${Math.floor(dist / 10)}. Press Space to run again.`]);
      }
    };
  }

  // ---------- Honk Pong ----------
  function pong() {
    const PW = 10, PH = 56;
    let state = 'ready', p = H / 2, c = H / 2, bx, by, vx, vy, me = 0, cpu = 0;
    function serve(dir) { bx = W / 2; by = H / 2; vx = 240 * dir; vy = (Math.random() * 2 - 1) * 160; }
    serve(1);
    return {
      playing: () => state === 'play',
      press() { if (state !== 'play') { me = 0; cpu = 0; serve(1); state = 'play'; } },
      mouse(yy) { p = Math.max(PH / 2, Math.min(H - PH / 2, yy)); },
      update(dt) {
        if (state !== 'play') return;
        if (keys.ArrowUp || keys.w) p -= 300 * dt;
        if (keys.ArrowDown || keys.s) p += 300 * dt;
        p = Math.max(PH / 2, Math.min(H - PH / 2, p));
        c += Math.max(-170 * dt, Math.min(170 * dt, by - c)); // the CPU is a little slow on purpose
        bx += vx * dt; by += vy * dt;
        if (by < 6 || by > H - 6) { vy = -vy; by = Math.max(6, Math.min(H - 6, by)); }
        if (vx < 0 && bx < 24 + PW && bx > 14 && Math.abs(by - p) < PH / 2 + 6) { vx = Math.abs(vx) * 1.05; vy += (by - p) * 4; sfx('point'); }
        if (vx > 0 && bx > W - 24 - PW && bx < W - 14 && Math.abs(by - c) < PH / 2 + 6) { vx = -Math.abs(vx) * 1.05; vy += (by - c) * 4; sfx('tick'); }
        if (bx < -10) { cpu++; serve(1); sfx('bump'); }
        if (bx > W + 10) { me++; serve(-1); sfx('coin'); }
        if (me >= 5 || cpu >= 5) state = 'over';
      },
      draw(ctx, active) {
        ctx.fillStyle = '#123a2a'; ctx.fillRect(0, 0, W, H); // a pond at night
        ctx.fillStyle = '#2f6b4f';
        for (let yy = 8; yy < H; yy += 24) ctx.fillRect(W / 2 - 2, yy, 4, 12);
        ctx.fillStyle = '#fbfbf4';
        ctx.fillRect(24, p - PH / 2, PW, PH);
        ctx.fillRect(W - 24 - PW, c - PH / 2, PW, PH);
        ctx.fillStyle = '#f2b84b'; ctx.fillRect(bx - 6, by - 6, 12, 12); // a golden egg
        ctx.fillStyle = '#fbfbf4'; ctx.font = '22px "Pixelify Sans", monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${me}   ${cpu}`, W / 2, 30); ctx.textAlign = 'left';
        if (!active && state === 'play') banner(ctx, ['Paused']);
        else if (state === 'ready') banner(ctx, ['Honk Pong', 'Mouse or ↑/↓ to move. Click to serve. First to 5.']);
        else if (state === 'over') banner(ctx, [me > cpu ? 'You win! HONK!' : 'The duck wins this time.', 'Click to play again']);
      }
    };
  }

  window.Arcade = { start, stop };
})();
