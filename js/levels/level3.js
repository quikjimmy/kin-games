// ============================================
// Level 3 — Panel Drop
// Catch solar panels falling from the sky.
// Don't catch cracked panels. Getting faster.
// ============================================

const Level3 = (() => {
  function getConfig() {
    return {
      name: 'Panel Drop',
      desc: 'Catch the panels!',
      bgGradient: ['#1565C0', '#0D47A1'],
      groundColor: '#5D4037',
      catcherColor: '#2196F3',
      catcherLabel: 'ROOF',
      catcherImage: 'catcher_roof.png',
      catcherWidth: 60,

      baseSpeed: 140,
      speedVariance: 50,
      speedRamp: 0.8,
      spawnInterval: 600,
      obstacleChance: 0.22,
      bonusChance: 0.08,

      twoStarScore: 1000,
      threeStarScore: 2000,

      items: [
        { label: 'PANEL', points: 75,  size: 38, color: '#1565C0', image: 'panel.png' },
        { label: 'PANEL', points: 75,  size: 36, color: '#1976D2', image: 'panel_sm.png' },
        { label: 'RAIL',  points: 60,  size: 32, color: '#9E9E9E', image: 'rail.png' },
        { label: 'MOUNT', points: 60,  size: 30, color: '#757575', image: 'mount.png' },
        { label: 'BOLT',  points: 50,  size: 26, color: '#BDBDBD', image: 'bolt.png' },
        { label: 'CLIP',  points: 50,  size: 28, color: '#CFD8DC', image: 'clip.png' },
      ],

      obstacles: [
        { label: 'CRACKED', penalty: 150, size: 40, color: '#B71C1C', image: 'cracked_panel.png' },
        { label: 'HAIL',    penalty: 100, size: 32, color: '#E0E0E0', image: 'hail.png' },
        { label: 'BIRD',    penalty: 80,  size: 34, color: '#6D4C41', image: 'bird.png' },
      ],

      bonusItems: [
        { label: 'GOLD PNL',  points: 300, size: 42, color: '#FFD700', image: 'gold_panel.png', bonus: true },
        { label: 'MEGA RACK', points: 200, size: 40, color: '#FF6F00', image: 'mega_rack.png', bonus: true },
      ],
    };
  }

  return { getConfig };
})();
