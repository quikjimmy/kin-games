// ============================================
// Level 5 — Sun Catcher
// Catch falling suns and energy. Hardest level.
// Everything is fast, lots of obstacles.
// ============================================

const Level5 = (() => {
  function getConfig() {
    return {
      name: 'Sun Catcher',
      desc: 'Harvest the energy!',
      bgGradient: ['#1565C0', '#0D47A1'],
      groundColor: '#5D4037',
      catcherColor: '#f9c22e',
      catcherLabel: 'ARRAY',
      catcherImage: 'catcher_array.png',
      catcherWidth: 55,

      baseSpeed: 180,
      speedVariance: 70,
      speedRamp: 1.0,
      spawnInterval: 420,
      obstacleChance: 0.28,
      bonusChance: 0.1,

      twoStarScore: 1500,
      threeStarScore: 3000,

      items: [
        { label: 'SUN',    points: 100, size: 36, color: '#FFC107', image: 'sun.png' },
        { label: 'RAY',    points: 80,  size: 30, color: '#FFD54F', image: 'ray.png' },
        { label: 'BOLT',   points: 90,  size: 32, color: '#FFEB3B', image: 'energy_bolt.png' },
        { label: 'PHOTON', points: 70,  size: 28, color: '#FFF176', image: 'photon.png' },
        { label: 'WATT',   points: 85,  size: 34, color: '#FFE082', image: 'watt.png' },
        { label: 'JOULE',  points: 75,  size: 30, color: '#FFCC80', image: 'joule.png' },
      ],

      obstacles: [
        { label: 'CLOUD',  penalty: 120, size: 44, color: '#90A4AE', image: 'cloud.png' },
        { label: 'MOON',   penalty: 150, size: 40, color: '#546E7A', image: 'moon.png' },
        { label: 'SMOG',   penalty: 130, size: 42, color: '#757575', image: 'smog.png' },
        { label: 'STORM',  penalty: 160, size: 38, color: '#37474F', image: 'storm.png' },
        { label: 'SHADE',  penalty: 100, size: 36, color: '#455A64', image: 'shade.png' },
      ],

      bonusItems: [
        { label: 'SUPERNOVA', points: 500, size: 44, color: '#FF1744', image: 'supernova.png', bonus: true },
        { label: 'MEGAWATT',  points: 400, size: 42, color: '#D500F9', image: 'megawatt.png', bonus: true },
        { label: 'PURE SUN',  points: 350, size: 40, color: '#FFFFFF', image: 'pure_sun.png', bonus: true },
      ],
    };
  }

  return { getConfig };
})();
