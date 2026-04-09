// ============================================
// App — Entry point, screen manager, navigation
// ============================================

const App = (() => {
  const LEVEL_INFO = [
    null, // index 0 unused
    { name: 'Cleanup Crew', desc: 'Clear the job site!' },
    { name: 'Measure Up', desc: 'Grab the tools!' },
    { name: 'Panel Drop', desc: 'Catch the panels!' },
    { name: 'Wire Run', desc: 'Grab the wiring!' },
    { name: 'Sun Catcher', desc: 'Harvest the energy!' }
  ];

  function init() {
    Game.init();

    // Check for existing session
    const user = Auth.currentUser();
    if (user) {
      showScreen('menu');
    } else {
      showScreen('title');
    }
  }

  function showScreen(id) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target
    const screen = document.getElementById('screen-' + id);
    if (screen) screen.classList.add('active');

    // Screen-specific setup
    switch (id) {
      case 'menu':
        setupMenu();
        break;
      case 'levels':
        setupLevels();
        break;
      case 'leaderboard':
        Leaderboard.load();
        break;
      case 'shop':
        Shop.load();
        break;
      case 'challenges':
        Challenge.load();
        break;
      case 'profile':
        setupProfile();
        break;
      case 'game':
        // Game handles its own setup
        break;
    }

    // Stop game if navigating away
    if (id !== 'game' && id !== 'complete' && id !== 'gameover') {
      Game.stop();
    }
  }

  function setupMenu() {
    const user = Auth.currentUser();
    if (user) {
      document.getElementById('menu-welcome').textContent = 'WELCOME, ' + (user.displayName || user.username).toUpperCase();
    }
  }

  async function setupLevels() {
    const user = Auth.currentUser();
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    // Fetch user scores
    let userScores = {};
    if (user) {
      const result = await API.call('getUserScores', { userId: user.userId });
      if (result.levels) userScores = result.levels;
    }

    const session = Auth.getSession();
    const unlockedLevel = session ? (session.unlockedLevel || 1) : 1;

    for (let i = 1; i <= 5; i++) {
      const info = LEVEL_INFO[i];
      const scoreData = userScores[i];
      const isUnlocked = i <= unlockedLevel;
      const isCompleted = scoreData && scoreData.best > 0;

      const card = document.createElement('div');
      card.className = 'level-card ' + (isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked');

      let starsHtml = '';
      for (let s = 0; s < 3; s++) {
        const earned = scoreData && s < scoreData.bestStars;
        starsHtml += `<span class="${earned ? 'earned' : ''}">&#9733;</span>`;
      }

      card.innerHTML = `
        <div class="level-num">${i}</div>
        <div class="level-info">
          <div class="level-name">${info.name}</div>
          <div class="level-desc">${isUnlocked ? info.desc : 'LOCKED'}</div>
          ${scoreData ? `<div class="level-desc" style="color: var(--secondary); margin-top: 2px;">BEST: ${scoreData.best} | ${scoreData.attempts} plays</div>` : ''}
        </div>
        <div class="level-stars">${isUnlocked ? starsHtml : '&#128274;'}</div>
      `;

      if (isUnlocked) {
        card.onclick = () => {
          Audio.sfx.tap();
          Game.startLevel(i);
        };
      }

      grid.appendChild(card);
    }

    // Show equipped shop item if any
    const equipped = Shop.getEquipped();
    if (equipped) {
      const note = document.createElement('div');
      note.className = 'panel panel--highlight mt-8';
      note.innerHTML = `<p style="font-size: 7px; color: var(--primary); text-align: center;">EQUIPPED: ${equipped.toUpperCase()}</p>`;
      grid.appendChild(note);
    }
  }

  async function setupProfile() {
    const user = Auth.currentUser();
    const container = document.getElementById('profile-content');
    if (!user) {
      container.innerHTML = '<p>Not signed in</p>';
      return;
    }

    container.innerHTML = '<div class="loading">LOADING<span class="loading-dots"></span></div>';

    const profile = await API.call('getProfile', { userId: user.userId });
    if (profile.error) {
      container.innerHTML = `<div class="msg msg--error">${profile.error}</div>`;
      return;
    }

    container.innerHTML = '';

    // Avatar display
    const avatarWrap = document.createElement('div');
    avatarWrap.style.cssText = 'text-align: center; margin-bottom: 12px; position: relative;';

    if (profile.avatarData) {
      // Show uploaded photo
      const img = document.createElement('img');
      img.src = profile.avatarData;
      img.style.cssText = 'width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--primary); object-fit: cover; display: block; margin: 0 auto;';
      avatarWrap.appendChild(img);
    } else {
      // Fallback generated avatar
      const avatarCanvas = document.createElement('canvas');
      avatarCanvas.width = 64;
      avatarCanvas.height = 64;
      avatarCanvas.style.cssText = 'image-rendering: pixelated; width: 80px; height: 80px; border: 3px solid var(--border); border-radius: 50%; margin: 0 auto; display: block;';
      Leaderboard.drawAvatar(avatarCanvas, profile.displayName);
      avatarWrap.appendChild(avatarCanvas);
    }

    // Upload button
    const uploadLabel = document.createElement('label');
    uploadLabel.className = 'btn btn--small mt-8';
    uploadLabel.style.cssText = 'display: inline-block; cursor: pointer; font-size: 7px;';
    uploadLabel.textContent = profile.avatarData ? 'CHANGE PHOTO' : 'UPLOAD PHOTO';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => handleAvatarUpload(e, user.userId);
    uploadLabel.appendChild(fileInput);
    avatarWrap.appendChild(uploadLabel);

    container.appendChild(avatarWrap);

    const info = document.createElement('div');
    info.className = 'panel';
    info.innerHTML = `
      <div class="score-line"><span class="label">USERNAME</span><span class="value">${escapeHtml(profile.username)}</span></div>
      <div class="score-line"><span class="label">DISPLAY</span><span class="value">${escapeHtml(profile.displayName)}</span></div>
      <div class="score-line"><span class="label">LEVEL</span><span class="value">${profile.unlockedLevel}/5</span></div>
      <div class="score-line"><span class="label">WINS</span><span class="value bonus">${profile.wins}</span></div>
      <div class="score-line"><span class="label">LOSSES</span><span class="value penalty">${profile.losses}</span></div>
    `;
    container.appendChild(info);

    // Edit display name
    const editDiv = document.createElement('div');
    editDiv.className = 'input-group mt-8';
    editDiv.innerHTML = `
      <label>CHANGE DISPLAY NAME</label>
      <input type="text" id="profile-name-input" value="${escapeHtml(profile.displayName)}" maxlength="20">
    `;
    container.appendChild(editDiv);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn--small btn--primary mt-8';
    saveBtn.textContent = 'SAVE';
    saveBtn.onclick = async () => {
      const newName = document.getElementById('profile-name-input').value.trim();
      if (!newName) return;
      await API.call('updateProfile', { userId: user.userId, displayName: newName });
      const session = Auth.getSession();
      session.displayName = newName;
      Auth.setSession(session);
      Audio.sfx.correct();
      setupProfile();
    };
    container.appendChild(saveBtn);
  }

  async function handleAvatarUpload(e, userId) {
    const file = e.target.files[0];
    if (!file) return;

    // Resize to 96x96 thumbnail to keep the base64 small
    const dataUrl = await resizeImage(file, 96);

    // Save to backend
    const result = await API.call('updateProfile', { userId }, { avatarData: dataUrl });
    if (result.error) {
      showModal('ERROR', result.error, [{ text: 'OK', action: () => hideModal() }]);
      return;
    }

    // Update local session
    const session = Auth.getSession();
    session.avatarData = dataUrl;
    Auth.setSession(session);

    Audio.sfx.correct();
    setupProfile();
  }

  function resizeImage(file, maxSize) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');

          // Crop to square from center
          const srcSize = Math.min(img.width, img.height);
          const sx = (img.width - srcSize) / 2;
          const sy = (img.height - srcSize) / 2;
          ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, maxSize, maxSize);

          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Modal system
  function showModal(title, message, buttons) {
    const content = document.getElementById('modal-content');
    let html = `<h2>${title}</h2><p class="mb-16">${message}</p><div class="btn-group">`;
    buttons.forEach(btn => {
      const cls = btn.primary ? 'btn btn--primary btn--small' : 'btn btn--small';
      html += `<button class="${cls}" id="modal-btn-${btn.text.replace(/\s/g, '')}">${btn.text}</button>`;
    });
    html += '</div>';
    content.innerHTML = html;

    // Attach click handlers
    buttons.forEach(btn => {
      const el = document.getElementById('modal-btn-' + btn.text.replace(/\s/g, ''));
      if (el) el.onclick = btn.action;
    });

    document.getElementById('modal-overlay').classList.add('active');
  }

  function hideModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // Init on load
  document.addEventListener('DOMContentLoaded', init);

  return { showScreen, showModal, hideModal };
})();
