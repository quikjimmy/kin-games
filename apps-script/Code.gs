// ============================================
// Solar Surge — Google Apps Script Backend
// Deploy as Web App: Execute as ME, Anyone access
// ============================================

const SPREADSHEET_ID = '1UqkINi5a9LeLZHCCVpRKZwwps3ZeOkCN57i-AaL95lA';

// Sheet names
const SHEETS = {
  USERS: 'Users',
  SCORES: 'Scores',
  CHALLENGES: 'Challenges',
  SHOP: 'ShopPurchases'
};

// ---- Entry Points ----

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;

  try {
    let result;
    switch (action) {
      // Auth
      case 'signup':
        result = signup(params);
        break;
      case 'login':
        result = login(params);
        break;
      case 'updateProfile':
        result = updateProfile(params, e);
        break;
      case 'getProfile':
        result = getProfile(params);
        break;

      // Scores
      case 'submitScore':
        result = submitScore(params);
        break;
      case 'getLeaderboard':
        result = getLeaderboard();
        break;
      case 'getUserScores':
        result = getUserScores(params);
        break;

      // Shop
      case 'buyItem':
        result = buyItem(params);
        break;
      case 'getShopBalance':
        result = getShopBalance(params);
        break;

      // Challenges
      case 'createChallenge':
        result = createChallenge(params);
        break;
      case 'respondChallenge':
        result = respondChallenge(params);
        break;
      case 'getChallenges':
        result = getChallenges(params);
        break;

      // Users list (for challenge picker)
      case 'getUsers':
        result = getUsers();
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Helpers ----

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    [SHEETS.USERS]: ['userId', 'username', 'pin', 'displayName', 'avatarData', 'createdAt', 'unlockedLevel'],
    [SHEETS.SCORES]: ['scoreId', 'userId', 'level', 'score', 'stars', 'timestamp', 'shopItemUsed'],
    [SHEETS.CHALLENGES]: ['challengeId', 'challengerId', 'challengedId', 'level', 'challengerScore', 'challengedScore', 'status', 'createdAt', 'completedAt'],
    [SHEETS.SHOP]: ['purchaseId', 'userId', 'itemId', 'cost', 'timestamp']
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
  }
}

function generateId() {
  return Utilities.getUuid().substring(0, 8);
}

function findRow(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][col] === value) return { row: i + 1, data: data[i] };
  }
  return null;
}

function findAllRows(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  const results = [];
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i][col] === value) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      results.push(obj);
    }
  }
  return results;
}

// ---- Auth ----

function signup(params) {
  const { username, pin, displayName } = params;
  if (!username || !pin) return { error: 'Username and PIN required' };
  if (pin.length !== 4 || isNaN(pin)) return { error: 'PIN must be 4 digits' };

  const sheet = getSheet(SHEETS.USERS);
  const existing = findRow(sheet, 1, username.toLowerCase());
  if (existing) return { error: 'Username taken' };

  const userId = generateId();
  sheet.appendRow([
    userId,
    username.toLowerCase(),
    pin,
    displayName || username,
    '',
    new Date().toISOString(),
    1  // start with level 1 unlocked
  ]);

  return { success: true, userId, username: username.toLowerCase(), displayName: displayName || username, unlockedLevel: 1 };
}

function login(params) {
  const { username, pin } = params;
  if (!username || !pin) return { error: 'Username and PIN required' };

  const sheet = getSheet(SHEETS.USERS);
  const found = findRow(sheet, 1, username.toLowerCase());
  if (!found) return { error: 'User not found' };

  if (String(found.data[2]) !== String(pin)) return { error: 'Wrong PIN' };

  return {
    success: true,
    userId: found.data[0],
    username: found.data[1],
    displayName: found.data[3],
    avatarData: found.data[4],
    unlockedLevel: found.data[6] || 1
  };
}

function updateProfile(params, e) {
  const { userId, displayName } = params;
  if (!userId) return { error: 'userId required' };

  const sheet = getSheet(SHEETS.USERS);
  const found = findRow(sheet, 0, userId);
  if (!found) return { error: 'User not found' };

  if (displayName) sheet.getRange(found.row, 4).setValue(displayName);

  // Avatar comes as POST data
  if (e.postData) {
    const postData = JSON.parse(e.postData.contents);
    if (postData.avatarData) {
      sheet.getRange(found.row, 5).setValue(postData.avatarData);
    }
  }

  return { success: true };
}

function getProfile(params) {
  const { userId } = params;
  const sheet = getSheet(SHEETS.USERS);
  const found = findRow(sheet, 0, userId);
  if (!found) return { error: 'User not found' };

  // Get challenge W/L
  const challenges = getSheet(SHEETS.CHALLENGES);
  const allChallenges = challenges.getDataRange().getValues();
  let wins = 0, losses = 0;
  for (let i = 1; i < allChallenges.length; i++) {
    if (allChallenges[i][6] !== 'completed') continue;
    const isChallenger = allChallenges[i][1] === userId;
    const isChallenged = allChallenges[i][2] === userId;
    if (!isChallenger && !isChallenged) continue;
    const cScore = Number(allChallenges[i][4]);
    const dScore = Number(allChallenges[i][5]);
    if (isChallenger) { cScore > dScore ? wins++ : losses++; }
    else { dScore > cScore ? wins++ : losses++; }
  }

  return {
    userId: found.data[0],
    username: found.data[1],
    displayName: found.data[3],
    avatarData: found.data[4],
    unlockedLevel: found.data[6] || 1,
    wins,
    losses
  };
}

// ---- Scores ----

function submitScore(params) {
  const { userId, level, score, stars, shopItemUsed } = params;
  if (!userId || !level || score === undefined) return { error: 'userId, level, score required' };

  const sheet = getSheet(SHEETS.SCORES);
  const scoreId = generateId();
  sheet.appendRow([
    scoreId,
    userId,
    Number(level),
    Number(score),
    Number(stars) || 0,
    new Date().toISOString(),
    shopItemUsed || ''
  ]);

  // Unlock next level if completed
  const userSheet = getSheet(SHEETS.USERS);
  const userRow = findRow(userSheet, 0, userId);
  if (userRow) {
    const currentUnlock = Number(userRow.data[6]) || 1;
    const completedLevel = Number(level);
    if (completedLevel >= currentUnlock && completedLevel < 5) {
      userSheet.getRange(userRow.row, 7).setValue(completedLevel + 1);
    }
  }

  return { success: true, scoreId };
}

function getUserScores(params) {
  const { userId } = params;
  const scores = findAllRows(getSheet(SHEETS.SCORES), 1, userId);

  // Group by level, find best and count attempts
  const byLevel = {};
  scores.forEach(s => {
    const lvl = Number(s.level);
    if (!byLevel[lvl]) byLevel[lvl] = { best: 0, bestStars: 0, attempts: 0 };
    byLevel[lvl].attempts++;
    if (Number(s.score) > byLevel[lvl].best) {
      byLevel[lvl].best = Number(s.score);
      byLevel[lvl].bestStars = Number(s.stars);
    }
  });

  return { userId, levels: byLevel };
}

function getLeaderboard() {
  const scoreSheet = getSheet(SHEETS.SCORES);
  const shopSheet = getSheet(SHEETS.SHOP);
  const userSheet = getSheet(SHEETS.USERS);

  const allScores = scoreSheet.getDataRange().getValues();
  const allPurchases = shopSheet.getDataRange().getValues();
  const allUsers = userSheet.getDataRange().getValues();

  // Build user map
  const users = {};
  for (let i = 1; i < allUsers.length; i++) {
    users[allUsers[i][0]] = {
      userId: allUsers[i][0],
      username: allUsers[i][1],
      displayName: allUsers[i][3],
      avatarData: allUsers[i][4]
    };
  }

  // Best score per user per level
  const bestScores = {}; // userId -> { level -> bestScore }
  const attempts = {};   // userId -> total attempts
  for (let i = 1; i < allScores.length; i++) {
    const uid = allScores[i][1];
    const lvl = Number(allScores[i][2]);
    const sc = Number(allScores[i][3]);
    if (!bestScores[uid]) bestScores[uid] = {};
    if (!attempts[uid]) attempts[uid] = 0;
    attempts[uid]++;
    if (!bestScores[uid][lvl] || sc > bestScores[uid][lvl]) {
      bestScores[uid][lvl] = sc;
    }
  }

  // Total shop spending per user
  const shopSpend = {};
  for (let i = 1; i < allPurchases.length; i++) {
    const uid = allPurchases[i][1];
    shopSpend[uid] = (shopSpend[uid] || 0) + Number(allPurchases[i][3]);
  }

  // Build leaderboard
  const leaderboard = [];
  for (const uid in bestScores) {
    const totalBest = Object.values(bestScores[uid]).reduce((a, b) => a + b, 0);
    const spent = shopSpend[uid] || 0;
    leaderboard.push({
      ...users[uid],
      totalScore: totalBest - spent,
      rawScore: totalBest,
      spent,
      attempts: attempts[uid] || 0
    });
  }

  leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  return { leaderboard };
}

// ---- Shop ----

const SHOP_ITEMS = {
  sunFlare: { name: 'Sun Flare', cost: 500, desc: 'x2 multiplier for one full level' },
  magneticRails: { name: 'Magnetic Rails', cost: 300, desc: 'Auto-snap placements for 15 seconds' },
  cheatSheet: { name: 'Inspection Cheat Sheet', cost: 400, desc: 'Highlights 2 violations in Level 5' },
  timeFreeze: { name: 'Time Freeze', cost: 600, desc: 'Pauses timer for 10 seconds' },
  doubleOrNothing: { name: 'Double or Nothing', cost: 200, desc: 'Coin flip: x2 or x0.5 score' },
  lightningHands: { name: 'Lightning Hands', cost: 350, desc: 'Extended combo timer window' }
};

function getShopBalance(params) {
  const { userId } = params;

  // Get best scores total
  const scores = findAllRows(getSheet(SHEETS.SCORES), 1, userId);
  const bestByLevel = {};
  scores.forEach(s => {
    const lvl = Number(s.level);
    const sc = Number(s.score);
    if (!bestByLevel[lvl] || sc > bestByLevel[lvl]) bestByLevel[lvl] = sc;
  });
  const totalBest = Object.values(bestByLevel).reduce((a, b) => a + b, 0);

  // Get total spent
  const purchases = findAllRows(getSheet(SHEETS.SHOP), 1, userId);
  const totalSpent = purchases.reduce((a, p) => a + Number(p.cost), 0);

  return {
    balance: totalBest - totalSpent,
    totalBest,
    totalSpent,
    items: SHOP_ITEMS
  };
}

function buyItem(params) {
  const { userId, itemId } = params;
  if (!userId || !itemId) return { error: 'userId and itemId required' };

  const item = SHOP_ITEMS[itemId];
  if (!item) return { error: 'Unknown item' };

  // Check balance
  const balance = getShopBalance({ userId });
  if (balance.balance < item.cost) return { error: 'Not enough points' };

  const sheet = getSheet(SHEETS.SHOP);
  sheet.appendRow([
    generateId(),
    userId,
    itemId,
    item.cost,
    new Date().toISOString()
  ]);

  return { success: true, item: itemId, newBalance: balance.balance - item.cost };
}

// ---- Challenges ----

function createChallenge(params) {
  const { challengerId, challengedId, level, challengerScore } = params;
  if (!challengerId || !challengedId || !level) return { error: 'challengerId, challengedId, level required' };

  const sheet = getSheet(SHEETS.CHALLENGES);
  const challengeId = generateId();
  sheet.appendRow([
    challengeId,
    challengerId,
    challengedId,
    Number(level),
    Number(challengerScore) || 0,
    '',
    'pending',
    new Date().toISOString(),
    ''
  ]);

  return { success: true, challengeId };
}

function respondChallenge(params) {
  const { challengeId, challengedScore } = params;
  if (!challengeId || challengedScore === undefined) return { error: 'challengeId and challengedScore required' };

  const sheet = getSheet(SHEETS.CHALLENGES);
  const found = findRow(sheet, 0, challengeId);
  if (!found) return { error: 'Challenge not found' };

  sheet.getRange(found.row, 6).setValue(Number(challengedScore));
  sheet.getRange(found.row, 7).setValue('completed');
  sheet.getRange(found.row, 9).setValue(new Date().toISOString());

  const challengerScore = Number(found.data[4]);
  const winner = Number(challengedScore) > challengerScore ? 'challenged' : 'challenger';

  return { success: true, winner, challengerScore, challengedScore: Number(challengedScore) };
}

function getChallenges(params) {
  const { userId } = params;
  const sheet = getSheet(SHEETS.CHALLENGES);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userSheet = getSheet(SHEETS.USERS);

  const challenges = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === userId || data[i][2] === userId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);

      // Resolve usernames
      const challenger = findRow(userSheet, 0, data[i][1]);
      const challenged = findRow(userSheet, 0, data[i][2]);
      obj.challengerName = challenger ? challenger.data[3] : 'Unknown';
      obj.challengedName = challenged ? challenged.data[3] : 'Unknown';

      challenges.push(obj);
    }
  }

  return { challenges: challenges.reverse() }; // newest first
}

// ---- User List ----

function getUsers() {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      userId: data[i][0],
      username: data[i][1],
      displayName: data[i][3],
      avatarData: data[i][4]
    });
  }
  return { users };
}

// ---- Setup Helper ----
// Run this once manually to create all sheets
function setupSheets() {
  Object.values(SHEETS).forEach(name => getSheet(name));
}
