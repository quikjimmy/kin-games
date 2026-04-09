// ============================================
// API — Google Sheets backend via Apps Script
// ============================================

const API = (() => {
  // Replace with your deployed Apps Script Web App URL
  let BASE_URL = localStorage.getItem('solar_api_url') || 'https://script.google.com/macros/s/AKfycbypjX7cpu3kMpLrBRnv0YBxTqPFYKVayo7iofpPrGnHcsZcIRqZfj5R2mm3FemT3B7PlQ/exec';

  function setUrl(url) {
    BASE_URL = url.replace(/\/$/, '');
    localStorage.setItem('solar_api_url', BASE_URL);
  }

  function getUrl() {
    return BASE_URL;
  }

  async function call(action, params = {}, postData = null) {
    if (!BASE_URL) {
      // Offline/demo mode — use local storage
      return LocalDB.handle(action, params, postData);
    }

    const url = new URL(BASE_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const opts = {};
    if (postData) {
      opts.method = 'POST';
      opts.body = JSON.stringify(postData);
      opts.headers = { 'Content-Type': 'text/plain' }; // Apps Script quirk
    }

    try {
      // Apps Script redirects — must follow with no-cors or use redirect:follow
      const res = await fetch(url.toString(), { ...opts, redirect: 'follow' });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        console.error('API parse error:', text);
        return { error: 'Invalid response from server' };
      }
    } catch (err) {
      console.error('API error:', err);
      return { error: 'Network error. Check connection.' };
    }
  }

  return { call, setUrl, getUrl };
})();

// ============================================
// LocalDB — Offline fallback using localStorage
// Good for local testing without Google Sheets
// ============================================

const LocalDB = (() => {
  function getData() {
    return JSON.parse(localStorage.getItem('solar_db') || '{"users":[],"scores":[],"challenges":[],"shop":[]}');
  }

  function save(db) {
    localStorage.setItem('solar_db', JSON.stringify(db));
  }

  function genId() {
    return Math.random().toString(36).substring(2, 10);
  }

  function handle(action, params, postData) {
    const db = getData();

    switch (action) {
      case 'signup': {
        const { username, pin, displayName } = params;
        if (!username || !pin) return { error: 'Username and PIN required' };
        if (pin.length !== 4) return { error: 'PIN must be 4 digits' };
        if (db.users.find(u => u.username === username.toLowerCase())) return { error: 'Username taken' };
        const user = {
          userId: genId(),
          username: username.toLowerCase(),
          pin,
          displayName: displayName || username,
          avatarData: '',
          createdAt: new Date().toISOString(),
          unlockedLevel: 1
        };
        db.users.push(user);
        save(db);
        return { success: true, userId: user.userId, username: user.username, displayName: user.displayName, unlockedLevel: 1 };
      }

      case 'login': {
        const user = db.users.find(u => u.username === params.username.toLowerCase());
        if (!user) return { error: 'User not found' };
        if (user.pin !== params.pin) return { error: 'Wrong PIN' };
        return { success: true, userId: user.userId, username: user.username, displayName: user.displayName, avatarData: user.avatarData, unlockedLevel: user.unlockedLevel };
      }

      case 'updateProfile': {
        const user = db.users.find(u => u.userId === params.userId);
        if (!user) return { error: 'User not found' };
        if (params.displayName) user.displayName = params.displayName;
        if (postData && postData.avatarData) user.avatarData = postData.avatarData;
        save(db);
        return { success: true };
      }

      case 'getProfile': {
        const user = db.users.find(u => u.userId === params.userId);
        if (!user) return { error: 'User not found' };
        let wins = 0, losses = 0;
        db.challenges.filter(c => c.status === 'completed').forEach(c => {
          const isChallenger = c.challengerId === params.userId;
          const isChallenged = c.challengedId === params.userId;
          if (!isChallenger && !isChallenged) return;
          if (isChallenger) { c.challengerScore > c.challengedScore ? wins++ : losses++; }
          else { c.challengedScore > c.challengerScore ? wins++ : losses++; }
        });
        return { userId: user.userId, username: user.username, displayName: user.displayName, avatarData: user.avatarData, unlockedLevel: user.unlockedLevel, wins, losses };
      }

      case 'submitScore': {
        const scoreEntry = {
          scoreId: genId(),
          userId: params.userId,
          level: Number(params.level),
          score: Number(params.score),
          stars: Number(params.stars) || 0,
          timestamp: new Date().toISOString(),
          shopItemUsed: params.shopItemUsed || ''
        };
        db.scores.push(scoreEntry);
        // Unlock next level
        const user2 = db.users.find(u => u.userId === params.userId);
        if (user2) {
          const lvl = Number(params.level);
          if (lvl >= (user2.unlockedLevel || 1) && lvl < 5) {
            user2.unlockedLevel = lvl + 1;
          }
        }
        save(db);
        return { success: true, scoreId: scoreEntry.scoreId };
      }

      case 'getUserScores': {
        const userScores = db.scores.filter(s => s.userId === params.userId);
        const byLevel = {};
        userScores.forEach(s => {
          if (!byLevel[s.level]) byLevel[s.level] = { best: 0, bestStars: 0, attempts: 0 };
          byLevel[s.level].attempts++;
          if (s.score > byLevel[s.level].best) {
            byLevel[s.level].best = s.score;
            byLevel[s.level].bestStars = s.stars;
          }
        });
        return { userId: params.userId, levels: byLevel };
      }

      case 'getLeaderboard': {
        const bestScores = {};
        const attempts = {};
        db.scores.forEach(s => {
          if (!bestScores[s.userId]) bestScores[s.userId] = {};
          if (!attempts[s.userId]) attempts[s.userId] = 0;
          attempts[s.userId]++;
          if (!bestScores[s.userId][s.level] || s.score > bestScores[s.userId][s.level]) {
            bestScores[s.userId][s.level] = s.score;
          }
        });
        const shopSpend = {};
        db.shop.forEach(p => {
          shopSpend[p.userId] = (shopSpend[p.userId] || 0) + p.cost;
        });
        const leaderboard = [];
        for (const uid in bestScores) {
          const user = db.users.find(u => u.userId === uid);
          const totalBest = Object.values(bestScores[uid]).reduce((a, b) => a + b, 0);
          const spent = shopSpend[uid] || 0;
          leaderboard.push({
            userId: uid,
            username: user ? user.username : uid,
            displayName: user ? user.displayName : uid,
            avatarData: user ? user.avatarData : '',
            totalScore: totalBest - spent,
            rawScore: totalBest,
            spent,
            attempts: attempts[uid] || 0
          });
        }
        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        return { leaderboard };
      }

      case 'getShopBalance': {
        const userScores2 = db.scores.filter(s => s.userId === params.userId);
        const bestByLevel = {};
        userScores2.forEach(s => {
          if (!bestByLevel[s.level] || s.score > bestByLevel[s.level]) bestByLevel[s.level] = s.score;
        });
        const totalBest = Object.values(bestByLevel).reduce((a, b) => a + b, 0);
        const totalSpent = db.shop.filter(p => p.userId === params.userId).reduce((a, p) => a + p.cost, 0);
        return {
          balance: totalBest - totalSpent,
          totalBest,
          totalSpent,
          items: {
            sunFlare: { name: 'Sun Flare', cost: 500, desc: 'x2 multiplier for one full level' },
            magneticRails: { name: 'Magnetic Rails', cost: 300, desc: 'Auto-snap placements for 15 seconds' },
            cheatSheet: { name: 'Inspection Cheat Sheet', cost: 400, desc: 'Highlights 2 violations in Level 5' },
            timeFreeze: { name: 'Time Freeze', cost: 600, desc: 'Pauses timer for 10 seconds' },
            doubleOrNothing: { name: 'Double or Nothing', cost: 200, desc: 'Coin flip: x2 or x0.5 score' },
            lightningHands: { name: 'Lightning Hands', cost: 350, desc: 'Extended combo timer window' }
          }
        };
      }

      case 'buyItem': {
        const items = {
          sunFlare: 500, magneticRails: 300, cheatSheet: 400,
          timeFreeze: 600, doubleOrNothing: 200, lightningHands: 350
        };
        const cost = items[params.itemId];
        if (!cost) return { error: 'Unknown item' };

        // Check balance
        const uScores = db.scores.filter(s => s.userId === params.userId);
        const bbl = {};
        uScores.forEach(s => { if (!bbl[s.level] || s.score > bbl[s.level]) bbl[s.level] = s.score; });
        const tb = Object.values(bbl).reduce((a, b) => a + b, 0);
        const ts = db.shop.filter(p => p.userId === params.userId).reduce((a, p) => a + p.cost, 0);
        if (tb - ts < cost) return { error: 'Not enough points' };

        db.shop.push({ purchaseId: genId(), userId: params.userId, itemId: params.itemId, cost, timestamp: new Date().toISOString() });
        save(db);
        return { success: true, item: params.itemId, newBalance: tb - ts - cost };
      }

      case 'createChallenge': {
        const challenge = {
          challengeId: genId(),
          challengerId: params.challengerId,
          challengedId: params.challengedId,
          level: Number(params.level),
          challengerScore: Number(params.challengerScore) || 0,
          challengedScore: '',
          status: 'pending',
          createdAt: new Date().toISOString(),
          completedAt: ''
        };
        db.challenges.push(challenge);
        save(db);
        return { success: true, challengeId: challenge.challengeId };
      }

      case 'respondChallenge': {
        const ch = db.challenges.find(c => c.challengeId === params.challengeId);
        if (!ch) return { error: 'Challenge not found' };
        ch.challengedScore = Number(params.challengedScore);
        ch.status = 'completed';
        ch.completedAt = new Date().toISOString();
        save(db);
        const winner = ch.challengedScore > ch.challengerScore ? 'challenged' : 'challenger';
        return { success: true, winner, challengerScore: ch.challengerScore, challengedScore: ch.challengedScore };
      }

      case 'getChallenges': {
        const userChallenges = db.challenges.filter(c => c.challengerId === params.userId || c.challengedId === params.userId);
        userChallenges.forEach(c => {
          const challenger = db.users.find(u => u.userId === c.challengerId);
          const challenged = db.users.find(u => u.userId === c.challengedId);
          c.challengerName = challenger ? challenger.displayName : 'Unknown';
          c.challengedName = challenged ? challenged.displayName : 'Unknown';
        });
        return { challenges: userChallenges.reverse() };
      }

      case 'getUsers': {
        return { users: db.users.map(u => ({ userId: u.userId, username: u.username, displayName: u.displayName, avatarData: u.avatarData })) };
      }

      case 'pinHint': {
        const user = db.users.find(u => u.username === params.username.toLowerCase());
        if (!user) return { error: 'User not found' };
        const pin = String(user.pin);
        return { success: true, hint: pin.charAt(0) + '**' + pin.charAt(pin.length - 1), displayName: user.displayName };
      }

      case 'resetPin': {
        const user2 = db.users.find(u => u.username === params.username.toLowerCase());
        if (!user2) return { error: 'User not found' };
        if (!params.newPin || params.newPin.length !== 4) return { error: 'PIN must be 4 digits' };
        user2.pin = params.newPin;
        save(db);
        return { success: true };
      }

      default:
        return { error: 'Unknown action' };
    }
  }

  return { handle };
})();
