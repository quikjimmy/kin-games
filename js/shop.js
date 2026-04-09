// ============================================
// Shop — Solar Store (1 item per attempt)
// ============================================

const Shop = (() => {
  let balance = 0;
  let items = {};
  let selectedItem = null; // item purchased for next attempt

  const ITEM_ICONS = {
    sunFlare: '&#9728;',
    magneticRails: '&#9881;',
    cheatSheet: '&#128196;',
    timeFreeze: '&#10052;',
    doubleOrNothing: '&#127922;',
    lightningHands: '&#9889;'
  };

  async function load() {
    const user = Auth.currentUser();
    if (!user) return;

    const result = await API.call('getShopBalance', { userId: user.userId });
    if (result.error) return;

    balance = result.balance;
    items = result.items;
    render();
  }

  function render() {
    document.getElementById('shop-balance').textContent = balance.toLocaleString();

    const container = document.getElementById('shop-items');
    container.innerHTML = '';

    for (const [id, item] of Object.entries(items)) {
      const canAfford = balance >= item.cost;
      const isSelected = selectedItem === id;

      const el = document.createElement('div');
      el.className = 'shop-item' + (isSelected ? ' selected' : '') + (!canAfford ? ' locked' : '');
      el.innerHTML = `
        <div class="shop-icon">${ITEM_ICONS[id] || '?'}</div>
        <div class="shop-details">
          <div class="shop-name">${item.name}${isSelected ? ' [EQUIPPED]' : ''}</div>
          <div class="shop-desc">${item.desc}</div>
        </div>
        <div class="shop-cost">${item.cost} PT</div>
      `;

      if (canAfford && !isSelected) {
        el.onclick = () => buyItem(id, item);
      }

      container.appendChild(el);
    }

    if (selectedItem) {
      const note = document.createElement('p');
      note.style.cssText = 'font-size: 7px; color: var(--primary); text-align: center; margin-top: 10px;';
      note.textContent = 'ITEM EQUIPPED FOR NEXT ATTEMPT. START A LEVEL TO USE IT.';
      container.appendChild(note);
    }
  }

  async function buyItem(itemId, item) {
    if (selectedItem) {
      App.showModal('HOLD ON', 'You already have an item equipped. Use it first or start a level.', [
        { text: 'OK', action: () => App.hideModal() }
      ]);
      return;
    }

    App.showModal('BUY ' + item.name.toUpperCase() + '?', `This will cost ${item.cost} PTS from your leaderboard score.`, [
      {
        text: 'BUY',
        primary: true,
        action: async () => {
          App.hideModal();
          const user = Auth.currentUser();
          const result = await API.call('buyItem', { userId: user.userId, itemId });
          if (result.error) {
            App.showModal('ERROR', result.error, [{ text: 'OK', action: () => App.hideModal() }]);
            return;
          }
          Audio.sfx.buy();
          selectedItem = itemId;
          balance = result.newBalance;
          render();
        }
      },
      { text: 'CANCEL', action: () => App.hideModal() }
    ]);
  }

  function getEquipped() {
    return selectedItem;
  }

  function consumeEquipped() {
    const item = selectedItem;
    selectedItem = null;
    return item;
  }

  return { load, render, getEquipped, consumeEquipped };
})();
