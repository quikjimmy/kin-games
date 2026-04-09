// ============================================
// Level 4 — Wire Run
// Catch electrical components. Fast, more hazards.
// Wrong wires (obstacles) are dangerous.
// ============================================

const Level4 = (() => {
  function getConfig() {
    return {
      name: 'Wire Run',
      desc: 'Grab the wiring!',
      bgGradient: ['#1565C0', '#0D47A1'],
      groundColor: '#5D4037',
      catcherColor: '#FF9800',
      catcherLabel: 'BOX',
      catcherImage: 'catcher_box.png',
      catcherWidth: 58,

      baseSpeed: 160,
      speedVariance: 60,
      speedRamp: 0.9,
      spawnInterval: 500,
      obstacleChance: 0.25,
      bonusChance: 0.08,

      twoStarScore: 1200,
      threeStarScore: 2400,

      items: [
        { label: 'WIRE',    points: 80,  size: 32, color: '#F44336', image: 'wire.png' },
        { label: 'FUSE',    points: 70,  size: 28, color: '#FF9800', image: 'fuse.png' },
        { label: 'PLUG',    points: 70,  size: 30, color: '#E0E0E0', image: 'plug.png' },
        { label: 'CONDUIT', points: 60,  size: 36, color: '#78909C', image: 'conduit.png' },
        { label: 'METER',   points: 90,  size: 34, color: '#4CAF50', image: 'meter.png' },
        { label: 'SWITCH',  points: 60,  size: 28, color: '#FFC107', image: 'switch.png' },
      ],

      obstacles: [
        { label: 'SPARK',  penalty: 150, size: 36, color: '#FFEB3B', image: 'spark.png' },
        { label: 'SHORT',  penalty: 120, size: 34, color: '#FF5722', image: 'spark.png' },
        { label: 'WATER',  penalty: 130, size: 38, color: '#2196F3', image: 'water.png' },
        { label: 'SNAKE',  penalty: 100, size: 32, color: '#4CAF50', image: 'snake.png' },
      ],

      bonusItems: [
        { label: 'TESLA BOX', points: 350, size: 40, color: '#E040FB', image: 'tesla_box.png', bonus: true },
        { label: 'INVERTER',  points: 250, size: 38, color: '#00E676', image: 'inverter.png', bonus: true },
      ],
    };
  }

  return { getConfig };
})();
