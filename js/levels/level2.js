// ============================================
// Level 2 — Measure Up
// Catch measuring tools, tape measures, ladders.
// Faster than Level 1, more obstacles.
// ============================================

const Level2 = (() => {
  function getConfig() {
    return {
      name: 'Measure Up',
      desc: 'Grab the tools!',
      bgGradient: ['#1565C0', '#0D47A1'],
      groundColor: '#5D4037',
      catcherColor: '#4ecdc4',
      catcherLabel: 'TRUCK',
      catcherImage: 'catcher_truck.png',
      catcherWidth: 62,

      baseSpeed: 120,
      speedVariance: 40,
      speedRamp: 0.7,
      spawnInterval: 700,
      obstacleChance: 0.2,
      bonusChance: 0.07,

      twoStarScore: 800,
      threeStarScore: 1600,

      items: [
        { label: 'TAPE',   points: 60,  size: 34, color: '#FFC107', image: 'tape.png' },
        { label: 'LEVEL',  points: 60,  size: 38, color: '#4CAF50', image: 'level.png' },
        { label: 'RULER',  points: 50,  size: 30, color: '#FF9800', image: 'ruler.png' },
        { label: 'CHALK',  points: 50,  size: 28, color: '#E0E0E0', image: 'chalk.png' },
        { label: 'LADDER', points: 80,  size: 42, color: '#8D6E63', image: 'ladder.png' },
      ],

      obstacles: [
        { label: 'RAIN',   penalty: 100, size: 36, color: '#1976D2', image: 'rain.png' },
        { label: 'WIND',   penalty: 120, size: 40, color: '#90A4AE', image: 'wind.png' },
        { label: 'WASP',   penalty: 80,  size: 30, color: '#F57F17', image: 'wasp.png' },
      ],

      bonusItems: [
        { label: 'LASER LVL',  points: 250, size: 38, color: '#FF1744', image: 'laser_level.png', bonus: true },
        { label: 'DRONE',      points: 200, size: 40, color: '#651FFF', image: 'drone.png', bonus: true },
      ],
    };
  }

  return { getConfig };
})();
