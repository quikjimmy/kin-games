// ============================================
// Auth — Sign up, sign in, profile management
// ============================================

const Auth = (() => {
  const SESSION_KEY = 'solar_session';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch { return null; }
  }

  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    return getSession();
  }

  async function signup() {
    const username = document.getElementById('signup-username').value.trim();
    const displayName = document.getElementById('signup-display').value.trim();
    const pin = document.getElementById('signup-pin').value;
    const pin2 = document.getElementById('signup-pin2').value;
    const msgEl = document.getElementById('signup-msg');

    msgEl.innerHTML = '';

    if (!username) return showMsg(msgEl, 'Username required', 'error');
    if (username.length < 3) return showMsg(msgEl, 'Username min 3 chars', 'error');
    if (!pin || pin.length !== 4) return showMsg(msgEl, 'PIN must be 4 digits', 'error');
    if (pin !== pin2) return showMsg(msgEl, 'PINs do not match', 'error');

    showMsg(msgEl, 'Creating account...', 'success');
    const result = await API.call('signup', { username, pin, displayName: displayName || username });

    if (result.error) return showMsg(msgEl, result.error, 'error');

    Audio.sfx.levelUp();
    setSession(result);
    App.showScreen('menu');
  }

  async function login() {
    const username = document.getElementById('login-username').value.trim();
    const pin = document.getElementById('login-pin').value;
    const msgEl = document.getElementById('login-msg');

    msgEl.innerHTML = '';

    if (!username || !pin) return showMsg(msgEl, 'Fill in all fields', 'error');

    showMsg(msgEl, 'Signing in...', 'success');
    const result = await API.call('login', { username, pin });

    if (result.error) return showMsg(msgEl, result.error, 'error');

    Audio.sfx.correct();
    setSession(result);
    App.showScreen('menu');
  }

  function logout() {
    clearSession();
    App.showScreen('title');
  }

  function forgotPin() {
    App.showScreen('forgot');
    document.getElementById('forgot-msg').innerHTML = '';
    document.getElementById('forgot-hint').classList.add('hidden');
    document.getElementById('forgot-reset').classList.add('hidden');
    document.getElementById('forgot-username').value = '';
    const btn = document.getElementById('forgot-btn');
    btn.textContent = 'SHOW HINT';
    btn.onclick = showPinHint;
  }

  async function showPinHint() {
    const username = document.getElementById('forgot-username').value.trim();
    const msgEl = document.getElementById('forgot-msg');
    msgEl.innerHTML = '';

    if (!username) return showMsg(msgEl, 'Enter your username', 'error');

    showMsg(msgEl, 'Looking up...', 'success');
    const result = await API.call('pinHint', { username });

    if (result.error) return showMsg(msgEl, result.error, 'error');

    msgEl.innerHTML = '';
    const hintEl = document.getElementById('forgot-hint');
    hintEl.classList.remove('hidden');
    hintEl.innerHTML = `
      <p style="font-size: 8px; color: var(--text); margin-bottom: 6px;">HI ${result.displayName.toUpperCase()}!</p>
      <p style="font-size: 9px; color: var(--primary);">YOUR PIN: ${result.hint}</p>
      <p style="font-size: 7px; color: var(--text-dim); margin-top: 6px;">RING A BELL?</p>
    `;

    // Show reset option
    document.getElementById('forgot-reset').classList.remove('hidden');
    const btn = document.getElementById('forgot-btn');
    btn.textContent = 'RESET PIN';
    btn.onclick = resetPin;
  }

  async function resetPin() {
    const username = document.getElementById('forgot-username').value.trim();
    const newPin = document.getElementById('forgot-newpin').value;
    const newPin2 = document.getElementById('forgot-newpin2').value;
    const msgEl = document.getElementById('forgot-msg');
    msgEl.innerHTML = '';

    if (!newPin || newPin.length !== 4 || isNaN(newPin)) return showMsg(msgEl, 'PIN must be 4 digits', 'error');
    if (newPin !== newPin2) return showMsg(msgEl, 'PINs do not match', 'error');

    showMsg(msgEl, 'Resetting...', 'success');
    const result = await API.call('resetPin', { username, newPin });

    if (result.error) return showMsg(msgEl, result.error, 'error');

    Audio.sfx.correct();
    showMsg(msgEl, 'PIN RESET! Go sign in.', 'success');
    setTimeout(() => App.showScreen('login'), 1500);
  }

  function showMsg(el, text, type) {
    el.innerHTML = `<div class="msg msg--${type}">${text}</div>`;
  }

  return { signup, login, logout, forgotPin, showPinHint, resetPin, currentUser, getSession, setSession };
})();
