// ============================================
// Sprites — Pixel art rendering helpers
// ============================================

const Sprites = (() => {
  const cache = {};

  // Draw a pixel art sprite from a 2D array of color values
  // data: 2D array where each cell is a hex color or '' for transparent
  // scale: pixel size multiplier
  function draw(ctx, data, x, y, scale = 1) {
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const color = data[row][col];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
        }
      }
    }
  }

  // Pre-render a sprite to an offscreen canvas for faster blitting
  function createCached(name, data, scale = 1) {
    const w = data[0].length * scale;
    const h = data.length * scale;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const octx = offscreen.getContext('2d');
    draw(octx, data, 0, 0, scale);
    cache[name] = offscreen;
    return offscreen;
  }

  function drawCached(ctx, name, x, y) {
    if (cache[name]) {
      ctx.drawImage(cache[name], x, y);
    }
  }

  // ---- Sprite Definitions ----

  const C = {
    _: '', // transparent
    B: '#333',    // dark/outline
    G: '#666',    // gray
    L: '#999',    // light gray
    W: '#ddd',    // white
    R: '#c0392b', // red
    O: '#e67e22', // orange
    Y: '#f9c22e', // yellow
    S: '#27ae60', // green
    K: '#2980b9', // blue/sky
    D: '#8B4513', // brown (roof)
    T: '#A0522D', // light brown
    P: '#1a1a2e', // panel dark
    Q: '#252545', // panel
    M: '#4ecdc4', // teal/secondary
  };

  // Solar Panel (12x8 pixels)
  const panel = [
    [C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B],
    [C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.B],
    [C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.B],
    [C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B],
    [C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.B],
    [C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.B],
    [C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.K, C.B, C.K, C.K, C.B],
    [C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B],
  ];

  // Debris piece (4x4)
  const debris = [
    [C._, C.G, C._, C._],
    [C.G, C.L, C.G, C._],
    [C._, C.G, C.L, C.G],
    [C._, C._, C.G, C._],
  ];

  // Mounting rail segment (8x2)
  const rail = [
    [C.L, C.L, C.L, C.L, C.L, C.L, C.L, C.L],
    [C.G, C.G, C.G, C.G, C.G, C.G, C.G, C.G],
  ];

  // Stud marker (4x4)
  const stud = [
    [C._, C.Y, C.Y, C._],
    [C.Y, C.Y, C.Y, C.Y],
    [C.Y, C.Y, C.Y, C.Y],
    [C._, C.Y, C.Y, C._],
  ];

  // Wire connector node (4x4)
  const wireNode = [
    [C._, C.R, C.R, C._],
    [C.R, C.O, C.O, C.R],
    [C.R, C.O, C.O, C.R],
    [C._, C.R, C.R, C._],
  ];

  // Sun (8x8)
  const sun = [
    [C._, C._, C._, C.Y, C.Y, C._, C._, C._],
    [C._, C.Y, C._, C.Y, C.Y, C._, C.Y, C._],
    [C._, C._, C.Y, C.Y, C.Y, C.Y, C._, C._],
    [C.Y, C.Y, C.Y, C.O, C.O, C.Y, C.Y, C.Y],
    [C.Y, C.Y, C.Y, C.O, C.O, C.Y, C.Y, C.Y],
    [C._, C._, C.Y, C.Y, C.Y, C.Y, C._, C._],
    [C._, C.Y, C._, C.Y, C.Y, C._, C.Y, C._],
    [C._, C._, C._, C.Y, C.Y, C._, C._, C._],
  ];

  // Cloud (10x4)
  const cloud = [
    [C._, C._, C.W, C.W, C.W, C._, C._, C._, C._, C._],
    [C._, C.W, C.W, C.W, C.W, C.W, C.W, C._, C._, C._],
    [C.W, C.W, C.W, C.W, C.W, C.W, C.W, C.W, C.W, C._],
    [C._, C.W, C.W, C.W, C.W, C.W, C.W, C.W, C._, C._],
  ];

  // Roof tile (8x6) - for background
  const roofTile = [
    [C.D, C.D, C.D, C.D, C.D, C.D, C.D, C.D],
    [C.T, C.D, C.D, C.D, C.D, C.D, C.D, C.T],
    [C.T, C.T, C.D, C.D, C.D, C.D, C.T, C.T],
    [C.D, C.D, C.D, C.D, C.D, C.D, C.D, C.D],
    [C.D, C.D, C.D, C.T, C.T, C.D, C.D, C.D],
    [C.D, C.D, C.T, C.T, C.T, C.T, C.D, C.D],
  ];

  // Inspector character (8x12)
  const inspector = [
    [C._, C._, C.Y, C.Y, C.Y, C.Y, C._, C._],
    [C._, C.Y, C.Y, C.Y, C.Y, C.Y, C.Y, C._],
    [C._, C._, C.B, C.W, C.W, C.B, C._, C._],
    [C._, C._, C.W, C.W, C.W, C.W, C._, C._],
    [C._, C.K, C.K, C.K, C.K, C.K, C.K, C._],
    [C._, C.K, C.K, C.K, C.K, C.K, C.K, C._],
    [C._, C.K, C.K, C.K, C.K, C.K, C.K, C._],
    [C._, C.K, C.K, C.K, C.K, C.K, C.K, C._],
    [C._, C._, C.K, C._, C._, C.K, C._, C._],
    [C._, C._, C.K, C._, C._, C.K, C._, C._],
    [C._, C._, C.B, C._, C._, C.B, C._, C._],
    [C._, C._, C.B, C._, C._, C.B, C._, C._],
  ];

  // Checkmark (6x6) - for completed items
  const check = [
    [C._, C._, C._, C._, C._, C.S],
    [C._, C._, C._, C._, C.S, C.S],
    [C._, C._, C._, C.S, C.S, C._],
    [C.S, C._, C.S, C.S, C._, C._],
    [C.S, C.S, C.S, C._, C._, C._],
    [C._, C.S, C._, C._, C._, C._],
  ];

  // X mark (6x6) - for errors
  const xMark = [
    [C.R, C._, C._, C._, C._, C.R],
    [C._, C.R, C._, C._, C.R, C._],
    [C._, C._, C.R, C.R, C._, C._],
    [C._, C._, C.R, C.R, C._, C._],
    [C._, C.R, C._, C._, C.R, C._],
    [C.R, C._, C._, C._, C._, C.R],
  ];

  // Spark / electricity (6x6)
  const spark = [
    [C._, C._, C.Y, C._, C._, C._],
    [C._, C.Y, C.Y, C._, C._, C._],
    [C.Y, C.Y, C.Y, C.Y, C.Y, C._],
    [C._, C._, C.Y, C.Y, C.Y, C.Y],
    [C._, C._, C._, C.Y, C.Y, C._],
    [C._, C._, C._, C.Y, C._, C._],
  ];

  return {
    draw,
    createCached,
    drawCached,
    defs: { panel, debris, rail, stud, wireNode, sun, cloud, roofTile, inspector, check, xMark, spark }
  };
})();
