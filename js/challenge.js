// ============================================
// Challenge — Async head-to-head system
// ============================================

const Challenge = (() => {
  async function load() {
    const container = document.getElementById('challenge-list');
    container.innerHTML = '<div class="loading">LOADING<span class="loading-dots"></span></div>';

    const user = Auth.currentUser();
    if (!user) return;

    const result = await API.call('getChallenges', { userId: user.userId });
    if (result.error) {
      container.innerHTML = `<div class="msg msg--error">${result.error}</div>`;
      return;
    }

    render(result.challenges, user.userId);
  }

  function render(challenges, myId) {
    const container = document.getElementById('challenge-list');

    if (!challenges || challenges.length === 0) {
      container.innerHTML = '<p class="text-center" style="font-size: 8px;">No challenges yet. Send one!</p>';
      return;
    }

    container.innerHTML = '';

    challenges.forEach(ch => {
      const isChallenger = ch.challengerId === myId;
      const opponentName = isChallenger ? ch.challengedName : ch.challengerName;
      let statusText = '';
      let cardClass = '';

      if (ch.status === 'pending') {
        if (isChallenger) {
          statusText = 'Waiting for ' + opponentName;
          cardClass = 'pending';
        } else {
          statusText = 'YOUR TURN - Tap to play!';
          cardClass = 'pending';
        }
      } else {
        const myScore = isChallenger ? ch.challengerScore : ch.challengedScore;
        const theirScore = isChallenger ? ch.challengedScore : ch.challengerScore;
        const won = myScore > theirScore;
        cardClass = won ? 'won' : 'lost';
        statusText = `${won ? 'YOU WON' : 'YOU LOST'} | ${myScore} vs ${theirScore}`;
      }

      const card = document.createElement('div');
      card.className = 'challenge-card ' + cardClass;
      card.innerHTML = `
        <div class="challenge-vs">VS ${escapeHtml(opponentName)} | Level ${ch.level}</div>
        <div class="challenge-status">${statusText}</div>
      `;

      // If pending and it's my turn to respond, tap to play
      if (ch.status === 'pending' && !isChallenger) {
        card.style.cursor = 'pointer';
        card.onclick = () => acceptChallenge(ch);
      }

      container.appendChild(card);
    });
  }

  function acceptChallenge(ch) {
    // Store challenge context, then start the level
    sessionStorage.setItem('solar_challenge', JSON.stringify(ch));
    Game.startLevel(ch.level);
  }

  async function showCreate() {
    const user = Auth.currentUser();
    const result = await API.call('getUsers');
    if (result.error || !result.users) return;

    const others = result.users.filter(u => u.userId !== user.userId);
    if (others.length === 0) {
      App.showModal('NO OPPONENTS', 'No other players registered yet.', [
        { text: 'OK', action: () => App.hideModal() }
      ]);
      return;
    }

    // Get user's unlocked level for level options
    const session = Auth.getSession();
    const maxLevel = session.unlockedLevel || 1;

    let html = '<h3>PICK OPPONENT</h3>';
    html += '<div style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;">';
    others.forEach(u => {
      html += `<div class="shop-item" onclick="Challenge.selectOpponent('${u.userId}', '${escapeHtml(u.displayName)}')" id="opp-${u.userId}">
        <div class="shop-details"><div class="shop-name">${escapeHtml(u.displayName)}</div></div>
      </div>`;
    });
    html += '</div>';
    html += '<h3 class="mt-8">PICK LEVEL</h3>';
    html += '<div style="display: flex; gap: 8px; justify-content: center; margin: 8px 0;">';
    for (let i = 1; i <= maxLevel; i++) {
      html += `<button class="btn btn--small" onclick="Challenge.selectLevel(${i})" id="lvl-btn-${i}">${i}</button>`;
    }
    html += '</div>';
    html += '<div class="btn-group mt-8">';
    html += '<button class="btn btn--primary btn--small" onclick="Challenge.sendChallenge()">SEND CHALLENGE</button>';
    html += '<button class="btn btn--small" onclick="App.hideModal()">CANCEL</button>';
    html += '</div>';

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('active');

    Challenge._selectedOpponent = null;
    Challenge._selectedLevel = null;
  }

  function selectOpponent(userId, name) {
    Challenge._selectedOpponent = userId;
    // Highlight
    document.querySelectorAll('#modal-content .shop-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('opp-' + userId).classList.add('selected');
  }

  function selectLevel(level) {
    Challenge._selectedLevel = level;
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById('lvl-btn-' + i);
      if (btn) btn.style.borderColor = i === level ? 'var(--primary)' : '';
    }
  }

  async function sendChallenge() {
    if (!Challenge._selectedOpponent || !Challenge._selectedLevel) {
      return; // both required
    }

    App.hideModal();

    // Player needs to play the level first to set their score
    sessionStorage.setItem('solar_challenge_create', JSON.stringify({
      challengedId: Challenge._selectedOpponent,
      level: Challenge._selectedLevel
    }));

    // Start the level — score will be recorded on completion
    Game.startLevel(Challenge._selectedLevel);
  }

  async function submitChallengeScore(level, score) {
    const user = Auth.currentUser();

    // Check if responding to a challenge
    const respondData = sessionStorage.getItem('solar_challenge');
    if (respondData) {
      const ch = JSON.parse(respondData);
      sessionStorage.removeItem('solar_challenge');
      await API.call('respondChallenge', {
        challengeId: ch.challengeId,
        challengedScore: score
      });
      return;
    }

    // Check if creating a challenge
    const createData = sessionStorage.getItem('solar_challenge_create');
    if (createData) {
      const data = JSON.parse(createData);
      sessionStorage.removeItem('solar_challenge_create');
      await API.call('createChallenge', {
        challengerId: user.userId,
        challengedId: data.challengedId,
        level: level,
        challengerScore: score
      });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { load, showCreate, selectOpponent, selectLevel, sendChallenge, acceptChallenge, submitChallengeScore };
})();
