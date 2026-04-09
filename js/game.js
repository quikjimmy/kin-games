// ============================================
// Game — Falling item catcher engine
// Same core mechanic every level, themed items,
// increasing speed/obstacles per level.
// 30 seconds per round.
// ============================================

const Game = (() => {
  const ASSET_PATH = 'assets/items/';
  const imageCache = {};

  function loadImage(filename) {
    if (!filename) return null;
    if (imageCache[filename]) return imageCache[filename];
    const img = new Image();
    img.src = ASSET_PATH + filename;
    imageCache[filename] = img;
    return img;
  }

  // Preload all images for a level config
  function preloadLevel(config) {
    if (config.catcherImage) loadImage(config.catcherImage);
    [config.items, config.obstacles, config.bonusItems].forEach(pool => {
      if (pool) pool.forEach(item => { if (item.image) loadImage(item.image); });
    });
  }

  let canvas, ctx;
  let animFrame = null;
  let running = false;
  let levelNum = 0;
  let levelConfig = null;

  // Dimensions
  let W, H;

  // Catcher (player)
  let catcher = { x: 0, y: 0, w: 60, h: 50, targetX: 0 };
  let touchActive = false;

  // Falling items
  const items = [];
  let spawnTimer = 0;

  // Obstacles (bad items to avoid)
  const obstacles = [];

  // Score
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let comboTimer = 0;
  const COMBO_WINDOW = 2000;
  let mistakes = 0;
  let catches = 0;
  let perfectRun = true;

  // Timer
  const ROUND_TIME = 30000;
  let timeRemaining = 0;
  let lastTick = 0;

  // Shop power-ups
  let activeItem = null;
  let sunFlareActive = false;
  let magneticActive = false;
  let magneticTimer = 0;
  let timeFrozen = false;
  let freezeTimer = 0;
  let doubleOrNothingResult = null;
  let lightningHandsActive = false;

  // Sun Surge (random x2 event)
  let sunSurgeActive = false;
  let sunSurgeTimer = 0;
  let nextSurgeIn = 0;

  // Visual effects
  const particles = [];
  const floatingTexts = [];
  let screenShake = 0;

  // Breakdown for end screen
  let breakdown = {};

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', onMouse);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
  }

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function startLevel(num) {
    levelNum = num;
    App.showScreen('game');
    Audio.resume();

    // Re-size canvas now that screen is visible
    resize();

    W = canvas.width / (window.devicePixelRatio || 1);
    H = canvas.height / (window.devicePixelRatio || 1);

    const configs = [null, Level1, Level2, Level3, Level4, Level5];
    levelConfig = configs[num].getConfig();
    preloadLevel(levelConfig);

    // Reset state
    score = 0;
    combo = 0;
    maxCombo = 0;
    comboTimer = 0;
    mistakes = 0;
    catches = 0;
    perfectRun = true;
    timeRemaining = ROUND_TIME;
    items.length = 0;
    obstacles.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    spawnTimer = 0;
    screenShake = 0;

    sunFlareActive = false;
    magneticActive = false;
    magneticTimer = 0;
    timeFrozen = false;
    freezeTimer = 0;
    doubleOrNothingResult = null;
    lightningHandsActive = false;
    sunSurgeActive = false;
    sunSurgeTimer = 0;
    nextSurgeIn = 6000 + Math.random() * 8000;

    // Catcher — raised above thumb zone
    const THUMB_ZONE = 90; // dead space at bottom for thumb
    catcher.w = levelConfig.catcherWidth || 60;
    catcher.h = 50;
    catcher.x = W / 2 - catcher.w / 2;
    catcher.y = H - catcher.h - THUMB_ZONE;
    catcher.targetX = catcher.x;

    // Shop power-up
    activeItem = Shop.consumeEquipped();
    if (activeItem) applyShopItem(activeItem);

    running = true;
    lastTick = performance.now();
    updateHUD();
    loop();
  }

  function applyShopItem(id) {
    switch (id) {
      case 'sunFlare': sunFlareActive = true; break;
      case 'magneticRails':
        magneticActive = true;
        magneticTimer = 15000;
        break;
      case 'timeFreeze':
        timeFrozen = true;
        freezeTimer = 10000;
        break;
      case 'doubleOrNothing':
        doubleOrNothingResult = Math.random() < 0.5 ? 'win' : 'lose';
        break;
      case 'lightningHands':
        lightningHandsActive = true;
        break;
      case 'cheatSheet': break; // not useful here
    }
  }

  function getMultiplier() {
    let m = 1;
    if (combo >= 20) m *= 3;
    else if (combo >= 10) m *= 2;
    else if (combo >= 5) m *= 1.5;
    if (sunFlareActive) m *= 2;
    if (sunSurgeActive) m *= 2;
    return m;
  }

  // ---- Main loop ----

  function loop() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(now - lastTick, 100);
    lastTick = now;
    update(dt);
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function update(dt) {
    // Timer
    if (!timeFrozen) {
      timeRemaining -= dt;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        levelComplete();
        return;
      }
    } else {
      freezeTimer -= dt;
      if (freezeTimer <= 0) timeFrozen = false;
    }

    // Tick sound last 5 seconds
    if (timeRemaining <= 5000 && timeRemaining > 0) {
      if (Math.floor((timeRemaining + dt) / 1000) !== Math.floor(timeRemaining / 1000)) {
        Audio.sfx.tick();
      }
    }

    // Magnetic timer
    if (magneticActive) {
      magneticTimer -= dt;
      if (magneticTimer <= 0) magneticActive = false;
    }

    // Combo decay
    if (combo > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; comboTimer = 0; updateHUD(); }
    }

    // Sun Surge
    nextSurgeIn -= dt;
    if (nextSurgeIn <= 0 && !sunSurgeActive) {
      sunSurgeActive = true;
      sunSurgeTimer = 8000;
      Audio.sfx.surge();
      addFloatingText('SUN SURGE! x2', W / 2, H * 0.3, '#f9c22e');
    }
    if (sunSurgeActive) {
      sunSurgeTimer -= dt;
      if (sunSurgeTimer <= 0) {
        sunSurgeActive = false;
        nextSurgeIn = 10000 + Math.random() * 15000;
      }
    }

    // Spawn items
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnItem();
      // Spawn rate increases as time goes on
      const elapsed = ROUND_TIME - timeRemaining;
      const speedup = 1 - (elapsed / ROUND_TIME) * 0.4;
      spawnTimer = (levelConfig.spawnInterval || 600) * speedup + Math.random() * 200;
    }

    // Move catcher toward target
    const dx = catcher.targetX - catcher.x;
    const speed = magneticActive ? 18 : 12;
    catcher.x += dx * speed * dt / 1000 * 2;
    catcher.x = Math.max(0, Math.min(W - catcher.w, catcher.x));

    // Update items
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.y += item.speed * dt / 1000;
      item.rotation += item.rotSpeed * dt / 1000;

      // Magnetic pull toward catcher
      if (magneticActive && !item.bad) {
        const ix = item.x + item.size / 2;
        const cx = catcher.x + catcher.w / 2;
        const pullDist = 80;
        const dist = Math.abs(ix - cx);
        if (dist < pullDist) {
          item.x += (cx - ix) * 0.03;
        }
      }

      // Collision with catcher
      if (item.y + item.size > catcher.y &&
          item.y < catcher.y + catcher.h &&
          item.x + item.size > catcher.x &&
          item.x < catcher.x + catcher.w) {
        if (item.bad) {
          // Hit obstacle!
          score = Math.max(0, score - (item.penalty || 100));
          combo = 0;
          comboTimer = 0;
          mistakes++;
          perfectRun = false;
          screenShake = 200;
          addFloatingText('-' + (item.penalty || 100), item.x + item.size / 2, item.y, '#ff6b6b');
          spawnParticles(item.x + item.size / 2, item.y, '#ff6b6b', 6);
          Audio.sfx.wrong();
        } else {
          // Caught!
          const mult = getMultiplier();
          const pts = Math.round((item.points || 50) * mult);
          score += pts;
          catches++;
          combo++;
          if (combo > maxCombo) maxCombo = combo;
          comboTimer = lightningHandsActive ? 3500 : COMBO_WINDOW;
          if (combo === 5 || combo === 10 || combo === 20) Audio.sfx.combo();
          else Audio.sfx.coin();
          addFloatingText('+' + pts, item.x + item.size / 2, item.y, mult > 1 ? '#f9c22e' : '#4ecdc4');
          spawnParticles(item.x + item.size / 2, item.y, item.color || '#4ecdc4', 5);
        }
        items.splice(i, 1);
        updateHUD();
        continue;
      }

      // Past catcher — missed
      if (item.y > catcher.y + catcher.h + 10) {
        if (!item.bad) {
          // Missed a good item
          combo = 0;
          comboTimer = 0;
          updateHUD();
        }
        items.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy += 300 * dt / 1000; // gravity
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      floatingTexts[i].y -= dt * 0.04;
      floatingTexts[i].life -= dt;
      if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    // Screen shake decay
    if (screenShake > 0) screenShake -= dt;
  }

  function spawnItem() {
    const cfg = levelConfig;
    const roll = Math.random();

    // Decide: good item, bad item, or bonus item
    let itemDef;
    if (roll < (cfg.obstacleChance || 0.2)) {
      // Bad item
      const pool = cfg.obstacles;
      itemDef = { ...pool[Math.floor(Math.random() * pool.length)], bad: true };
    } else if (roll < (cfg.obstacleChance || 0.2) + (cfg.bonusChance || 0.08)) {
      // Bonus item (rare, high value)
      const pool = cfg.bonusItems || cfg.items;
      itemDef = { ...pool[Math.floor(Math.random() * pool.length)] };
    } else {
      // Normal good item
      const pool = cfg.items;
      itemDef = { ...pool[Math.floor(Math.random() * pool.length)] };
    }

    const size = itemDef.size || 36;
    const baseSpeed = cfg.baseSpeed || 120;
    const speedVariance = cfg.speedVariance || 40;
    // Speed increases with time elapsed
    const elapsed = ROUND_TIME - timeRemaining;
    const speedMult = 1 + (elapsed / ROUND_TIME) * (cfg.speedRamp || 0.8);

    items.push({
      x: 10 + Math.random() * (W - size - 20),
      y: -size,
      size,
      speed: (baseSpeed + Math.random() * speedVariance) * speedMult,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 3,
      ...itemDef
    });
  }

  // ---- Rendering ----

  function render() {
    W = canvas.width / (window.devicePixelRatio || 1);
    H = canvas.height / (window.devicePixelRatio || 1);

    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (screenShake > 0) {
      shakeX = (Math.random() - 0.5) * 6;
      shakeY = (Math.random() - 0.5) * 6;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    const bg = levelConfig.bgGradient || ['#1565C0', '#0D47A1'];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(1, bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sun surge glow
    if (sunSurgeActive) {
      ctx.fillStyle = `rgba(249, 194, 46, ${0.06 + Math.sin(Date.now() * 0.005) * 0.03})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Time freeze tint
    if (timeFrozen) {
      ctx.fillStyle = 'rgba(78, 205, 196, 0.06)';
      ctx.fillRect(0, 0, W, H);
    }

    // Ground
    const groundY = catcher.y + catcher.h + 10;
    ctx.fillStyle = levelConfig.groundColor || '#2E7D32';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, groundY, W, 3);

    // Draw items
    items.forEach(item => drawItem(ctx, item));

    // Draw catcher
    drawCatcher(ctx);

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1;

    // Floating texts
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Press Start 2P"';
    floatingTexts.forEach(ft => {
      ctx.globalAlpha = Math.min(1, ft.life / 400);
      ctx.fillStyle = '#000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;

    // Sun surge banner
    if (sunSurgeActive) {
      ctx.fillStyle = 'rgba(249, 194, 46, 0.9)';
      ctx.fillRect(0, 38, W, 20);
      ctx.fillStyle = '#0a0a1a';
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('SUN SURGE x2 - ' + Math.ceil(sunSurgeTimer / 1000) + 's', W / 2, 52);
    }

    // Magnetic indicator
    if (magneticActive) {
      ctx.fillStyle = 'rgba(78, 205, 196, 0.2)';
      ctx.fillRect(0, H - 6, W * (magneticTimer / 15000), 4);
    }

    ctx.restore();

    // Combo meter (outside shake)
    if (combo >= 3) {
      const barW = Math.min(combo / 20, 1) * (W - 40);
      ctx.fillStyle = combo >= 20 ? '#f9c22e' : combo >= 10 ? '#4ecdc4' : '#51cf66';
      ctx.fillRect(20, H - 10, barW, 4);
    }
  }

  function drawItem(ctx, item) {
    const img = item.image ? imageCache[item.image] : null;
    const cx = item.x + item.size / 2;
    const cy = item.y + item.size / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(item.rotation);

    const s = item.size / 2;

    if (img && img.complete && img.naturalWidth > 0) {
      // Draw sprite image
      // Shadow
      ctx.globalAlpha = 0.2;
      ctx.drawImage(img, -s + 3, -s + 3, item.size, item.size);
      ctx.globalAlpha = 1;

      // Main image
      ctx.drawImage(img, -s, -s, item.size, item.size);

      // Bad item: red border glow
      if (item.bad) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, s + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Bonus shimmer overlay
      if (item.bonus) {
        const shimmer = Math.sin(Date.now() * 0.008) * 0.25 + 0.2;
        ctx.globalAlpha = shimmer;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, s + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Points label above
        ctx.rotate(-item.rotation);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('+' + item.points, 0, -s - 6);
      }
    } else {
      // Fallback: colored square (while image loads or if missing)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-s + 3, -s + 3, item.size, item.size);
      ctx.fillStyle = item.color || '#4ecdc4';
      ctx.fillRect(-s, -s, item.size, item.size);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-s, -s, item.size, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-s, s - 4, item.size, 4);

      if (item.bad) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.strokeRect(-s, -s, item.size, item.size);
      }

      ctx.rotate(-item.rotation);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, item.size / 5)}px "Press Start 2P"`;
      ctx.textAlign = 'center';
      ctx.fillText(item.label || '?', 0, 4);
    }

    ctx.restore();
  }

  function drawCatcher(ctx) {
    const x = catcher.x;
    const y = catcher.y;
    const w = catcher.w;
    const h = catcher.h;

    const img = levelConfig.catcherImage ? imageCache[levelConfig.catcherImage] : null;

    if (img && img.complete && img.naturalWidth > 0) {
      // Shadow
      ctx.globalAlpha = 0.2;
      ctx.drawImage(img, x + 4, y + 4, w, h);
      ctx.globalAlpha = 1;

      // Catcher image
      ctx.drawImage(img, x, y, w, h);
    } else {
      // Fallback colored box
      const theme = levelConfig.catcherColor || '#f9c22e';
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 4, y + 4, w, h);
      ctx.fillStyle = theme;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x + 6, y + 8, w - 12, h - 12);
      ctx.fillStyle = '#fff';
      ctx.font = '7px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(levelConfig.catcherLabel || 'CATCH', x + w / 2, y + h / 2 + 3);
    }

    // Magnetic aura
    if (magneticActive) {
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 + 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ---- Effects ----

  function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x, y, color, life: 1200 });
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y, color,
        vx: (Math.random() - 0.5) * 200,
        vy: -100 - Math.random() * 150,
        life: 600 + Math.random() * 400,
        maxLife: 1000
      });
    }
  }

  // ---- HUD ----

  function updateHUD() {
    document.getElementById('hud-score').textContent = score.toLocaleString();
    document.getElementById('hud-timer').textContent = Math.ceil(timeRemaining / 1000);

    const comboEl = document.getElementById('hud-combo');
    if (combo >= 5) {
      const mult = combo >= 20 ? 'x3' : combo >= 10 ? 'x2' : 'x1.5';
      comboEl.textContent = combo + ' ' + mult;
      comboEl.classList.add('bump');
      setTimeout(() => comboEl.classList.remove('bump'), 100);
    } else if (combo > 0) {
      comboEl.textContent = combo + 'x';
    } else {
      comboEl.textContent = '';
    }
  }

  // ---- Level Complete ----

  function levelComplete() {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    Audio.sfx.levelUp();

    // Calculate stars
    let stars = 1;
    const cfg = levelConfig;
    if (score >= cfg.threeStarScore) stars = 3;
    else if (score >= cfg.twoStarScore) stars = 2;

    // Clean install bonus (no mistakes)
    let cleanBonus = 0;
    if (mistakes === 0) {
      cleanBonus = Math.round(score * 0.5);
      score += cleanBonus;
    }

    let finalScore = score;

    // Double or Nothing
    let donText = '';
    if (doubleOrNothingResult === 'win') {
      finalScore *= 2;
      donText = 'DOUBLE! Lucky!';
    } else if (doubleOrNothingResult === 'lose') {
      finalScore = Math.round(finalScore * 0.5);
      donText = 'HALF... Unlucky!';
    }

    breakdown = {
      baseScore: score - cleanBonus,
      catches,
      mistakes,
      maxCombo,
      cleanBonus,
      doubleOrNothing: donText,
      finalScore,
      stars
    };

    // Submit
    const user = Auth.currentUser();
    API.call('submitScore', {
      userId: user.userId,
      level: levelNum,
      score: finalScore,
      stars,
      shopItemUsed: activeItem || ''
    }).then(() => {
      const session = Auth.getSession();
      if (levelNum >= (session.unlockedLevel || 1) && levelNum < 5) {
        session.unlockedLevel = levelNum + 1;
        Auth.setSession(session);
      }
    });

    Challenge.submitChallengeScore(levelNum, finalScore);
    showCompleteScreen();
  }

  function showCompleteScreen() {
    App.showScreen('complete');

    const starsEl = document.getElementById('complete-stars');
    let starsHtml = '';
    for (let i = 0; i < 3; i++) {
      starsHtml += `<span style="color: ${i < breakdown.stars ? 'var(--primary)' : 'var(--border)'}">&#9733;</span>`;
    }
    starsEl.innerHTML = starsHtml;

    const bd = document.getElementById('score-breakdown');
    let html = '';
    html += scoreLine('Items Caught', breakdown.catches);
    html += scoreLine('Base Score', breakdown.baseScore.toLocaleString());
    html += scoreLine('Max Combo', breakdown.maxCombo + 'x');
    if (breakdown.mistakes > 0) html += scoreLine('Mistakes', breakdown.mistakes, 'penalty');
    if (breakdown.cleanBonus > 0) html += scoreLine('Perfect Round! x1.5', '+' + breakdown.cleanBonus.toLocaleString(), 'bonus');
    if (breakdown.doubleOrNothing) html += scoreLine('Double or Nothing', breakdown.doubleOrNothing, breakdown.doubleOrNothing.includes('DOUBLE') ? 'bonus' : 'penalty');
    bd.innerHTML = html;

    document.getElementById('complete-total').textContent = breakdown.finalScore.toLocaleString() + ' PTS';

    const nextBtn = document.getElementById('complete-next-btn');
    if (levelNum >= 5) {
      nextBtn.textContent = 'ALL LEVELS DONE!';
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = 'NEXT LEVEL';
      nextBtn.disabled = false;
    }
  }

  function scoreLine(label, value, cls = '') {
    return `<div class="score-line"><span class="label">${label}</span><span class="value ${cls}">${value}</span></div>`;
  }

  function replay() { startLevel(levelNum); }
  function nextLevel() { if (levelNum < 5) startLevel(levelNum + 1); }
  function stop() { running = false; if (animFrame) cancelAnimationFrame(animFrame); }
  function quit() { stop(); App.showScreen('levels'); }

  // ---- Touch ----

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function onTouch(e) { e.preventDefault(); Audio.resume(); touchActive = true; moveCatcher(getPos(e)); }
  function onTouchMove(e) { e.preventDefault(); if (touchActive) moveCatcher(getPos(e)); }
  function onTouchEnd(e) { e.preventDefault(); touchActive = false; }
  function onMouse(e) { Audio.resume(); touchActive = true; moveCatcher(getPos(e)); }
  function onMouseMove(e) { if (e.buttons === 1) moveCatcher(getPos(e)); }
  function onMouseUp() { touchActive = false; }

  function moveCatcher(pos) {
    catcher.targetX = pos.x - catcher.w / 2;
  }

  return { init, startLevel, replay, nextLevel, stop, quit };
})();
