// ============================================
// Leaderboard — Display and refresh
// ============================================

const Leaderboard = (() => {
  async function load() {
    const container = document.getElementById('leaderboard-list');
    container.innerHTML = '<div class="loading">LOADING<span class="loading-dots"></span></div>';

    const result = await API.call('getLeaderboard');
    if (result.error) {
      container.innerHTML = `<div class="msg msg--error">${result.error}</div>`;
      return;
    }

    render(result.leaderboard);
  }

  function render(entries) {
    const container = document.getElementById('leaderboard-list');

    if (!entries || entries.length === 0) {
      container.innerHTML = '<p class="text-center mt-16" style="font-size: 8px;">No scores yet. Be the first to play!</p>';
      return;
    }

    container.innerHTML = '';

    entries.forEach((entry, i) => {
      const rank = i + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'gold';
      else if (rank === 2) rankClass = 'silver';
      else if (rank === 3) rankClass = 'bronze';

      const row = document.createElement('div');
      row.className = 'lb-row';

      let avatarHtml;
      if (entry.avatarData) {
        avatarHtml = `<img class="lb-avatar" src="${entry.avatarData}" style="border-radius: 50%; object-fit: cover;">`;
      } else {
        avatarHtml = `<canvas class="lb-avatar" width="32" height="32"></canvas>`;
      }

      row.innerHTML = `
        <div class="lb-rank ${rankClass}">${rank}</div>
        ${avatarHtml}
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(entry.displayName)}</div>
          <div class="lb-attempts">${entry.attempts} plays${entry.spent > 0 ? ' | ' + entry.spent + ' spent' : ''}</div>
        </div>
        <div class="lb-score">${entry.totalScore.toLocaleString()}</div>
      `;

      // Draw generated avatar if no photo
      if (!entry.avatarData) {
        const canvas = row.querySelector('canvas');
        drawAvatar(canvas, entry.displayName);
      }

      container.appendChild(row);
    });
  }

  function drawAvatar(canvas, name) {
    const ctx = canvas.getContext('2d');
    // Generate a deterministic pixel avatar from the name
    const hash = simpleHash(name);
    const colors = ['#f9c22e', '#4ecdc4', '#ff6b6b', '#51cf66', '#845ef7', '#339af0', '#e67e22'];
    const color = colors[hash % colors.length];
    const bgColor = '#252545';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 32, 32);

    // 5x5 symmetric pixel pattern
    ctx.fillStyle = color;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        if ((hash >> (y * 3 + x)) & 1) {
          // Left side
          ctx.fillRect(4 + x * 5, 4 + y * 5, 5, 5);
          // Mirror right side
          ctx.fillRect(4 + (4 - x) * 5, 4 + y * 5, 5, 5);
        }
      }
    }
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { load, drawAvatar };
})();
