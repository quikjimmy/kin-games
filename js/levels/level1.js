// ============================================
// Level 1 — Cleanup Crew
// Catch falling junk to clean up the job site.
// Avoid hazards. Easiest level.
// ============================================

const Level1 = (() => {
  function getConfig() {
    return {
      name: 'Cleanup Crew',
      desc: 'Clear the job site!',
      bgGradient: ['#1565C0', '#0D47A1'],
      groundColor: '#5D4037',
      catcherColor: '#f9c22e',
      catcherLabel: 'BIN',
      catcherImage: 'catcher_bin.png',
      catcherWidth: 65,

      baseSpeed: 100,
      speedVariance: 30,
      speedRamp: 0.6,
      spawnInterval: 800,
      obstacleChance: 0.15,
      bonusChance: 0.06,

      twoStarScore: 600,
      threeStarScore: 1200,

      items: [
        { label: 'CAN',   points: 50,  size: 32, color: '#90A4AE', image: 'can.png' },
        { label: 'BAG',   points: 50,  size: 34, color: '#78909C', image: 'bag.png' },
        { label: 'NAIL',  points: 75,  size: 28, color: '#B0BEC5', image: 'nail.png' },
        { label: 'WRAP',  points: 50,  size: 36, color: '#CFD8DC', image: 'wrap.png' },
        { label: 'SCRAP', points: 60,  size: 30, color: '#A1887F', image: 'scrap.png' },
        { label: 'CUP',   points: 50,  size: 30, color: '#FFCC80', image: 'cup.png' },
      ],

      obstacles: [
        { label: 'ROCK',  penalty: 100, size: 40, color: '#616161', image: 'rock.png' },
        { label: 'BRICK', penalty: 120, size: 38, color: '#D32F2F', image: 'brick.png' },
      ],

      bonusItems: [
        { label: 'GOLD CAN',  points: 200, size: 36, color: '#FFD700', image: 'gold_can.png', bonus: true },
        { label: 'TOOL BOX',  points: 150, size: 40, color: '#FF8F00', image: 'tool_box.png', bonus: true },
      ],
    };
  }

  return { getConfig };
})();
