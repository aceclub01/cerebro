// Initialize canvas
function init(elemId) {
  const canvas = document.getElementById(elemId);
  const c = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return { c, canvas };
}

// Initialize canvas
const { c, canvas } = init('spiderCanvas');
let w = canvas.width;
let h = canvas.height;

// Stock Data from CSV (we'll load this data)
let stocks = [];

// Define sector colors
const sectorColors = {
  'Technology': '#ff6666',
  'Finance': '#66ff66',
  'Automotive': '#6666ff',
  'Energy': '#ffff66',
  'Healthcare': '#66ffff',
};

// Store clusters and spiders
let clusters = {};
let spiders = [
  {
    x: w / 2,
    y: h / 2,
    vx: 0,
    vy: 0,
    radius: 10,
    color: '#ffffff',
    isMovingRandomly: false,
    targetX: null,
    targetY: null,
  },
];

// Mouse and idle tracking
let mouseX = w / 2, mouseY = h / 2;
let lastMouseMoveTime = Date.now();
const idleTimeLimit = 3000; // 3 seconds of inactivity
let mouseClickX = null, mouseClickY = null;
let selectedSector = null;

// Load CSV data
Papa.parse('stocks.csv', {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    stocks = results.data;
    generateClusters();
  },
  error: function(error) {
    console.error("Error loading CSV:", error);
  }
});

// Generate clusters
function generateClusters() {
    clusters = {};
    stocks.forEach(stock => {
        const sector = stock.Sector;
        if (!clusters[sector]) {
            clusters[sector] = [];
        }
        clusters[sector].push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            stockName: stock.Stock,
            sectorColor: sectorColors[sector] || '#ffffff', // Assign sector color
        });
    });

    animate();
}


// Calculate distance between points
function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Draw simple smooth cycloidal curve for spider legs
function drawCycloidalCurve(x1, y1, x2, y2, color = '#ffffff') {
  c.strokeStyle = color;
  c.lineWidth = 1;
  c.beginPath();

  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  
  const numCycles = 1; // Fixed 3 cycles
  const maxDeviation = 10;

  let previousX = x1;
  let previousY = y1;

  for (let i = 1; i <= 10; i++) { // Number of control points
    const t = i / 10;
    const currentX = x1 + t * dx;
    const currentY = y1 + t * dy;

    // Sinusoidal deviation for smooth curve
    const deviation = Math.sin(t * numCycles * Math.PI) * maxDeviation;

    // Control point for the curve
    const controlX = previousX + (currentX - previousX) / 2 + deviation * (dy / distance);
    const controlY = previousY + (currentY - previousY) / 2 - deviation * (dx / distance);

    // Draw a quadratic curve segment
    c.quadraticCurveTo(controlX, controlY, currentX, currentY);

    previousX = currentX;
    previousY = currentY;
  }

  c.stroke();
}

// Draw clusters
function drawClusters() {
  for (let sector in clusters) {
    clusters[sector].forEach(dot => {
      // Draw dot
      c.fillStyle = dot.sectorColor;
      c.beginPath();
      c.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
      c.fill();

      // Stock name
      c.fillStyle = '#ffffff';
      c.font = '12px Arial';
      c.fillText(dot.stockName, dot.x + 10, dot.y);
    });
  }
}

// Draw spiders and their legs
function drawSpiders() {
  spiders.forEach(spider => {
    // Draw spider body
    c.fillStyle = spider.color;
    c.beginPath();
    c.arc(spider.x, spider.y, spider.radius, 0, Math.PI * 2);
    c.fill();

    // Connect to nearby dots with smooth cycloidal legs
    for (let sector in clusters) {
      clusters[sector].forEach(dot => {
        const dist = getDistance(spider.x, spider.y, dot.x, dot.y);
        if (dist < 150) { // Adjust the range for leg connections
          drawCycloidalCurve(spider.x, spider.y, dot.x, dot.y, dot.sectorColor);
        }
      });
    }
  });
}

// Feature 3: Updated correlation line drawing with configurability
function connectCloseDots() {
  for (let sector in clusters) {
      const sectorDots = clusters[sector];
      for (let i = 0; i < sectorDots.length; i++) {
          for (let j = i + 1; j < sectorDots.length; j++) {
              const dot1 = sectorDots[i];
              const dot2 = sectorDots[j];
              const dist = getDistance(dot1.x, dot1.y, dot2.x, dot2.y);

              // Adjust behavior based on correlationLineConfig
              if (dist > correlationLineConfig.minDistance && dist < correlationLineConfig.maxDistance) {
                  c.strokeStyle = correlationLineConfig.color;
                  c.lineWidth = correlationLineConfig.width;
                  c.beginPath();
                  c.moveTo(dot1.x, dot1.y);
                  c.lineTo(dot2.x, dot2.y);
                  c.stroke();
              }
          }
      }
  }
}

// Feature 1: Configurable correlation line behavior
const correlationLineConfig = {
  minDistance: 50, // Minimum distance to draw lines
  maxDistance: 150, // Maximum distance to draw lines
  color: '#ffffff',
  width: 1,
};

// Feature 2: Updated function to display top 3 sectors with progress bars
function drawBoundaryCircle() {
  if (mouseClickX && mouseClickY) {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(mouseClickX, mouseClickY, 150, 0, Math.PI * 2); // Fixed radius of 150
      c.stroke();

      // Count sector representation within the radius
      const sectorCounts = {};
      let totalDots = 0;

      for (let sector in clusters) {
          clusters[sector].forEach(dot => {
              if (getDistance(mouseClickX, mouseClickY, dot.x, dot.y) <= 150) {
                  sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
                  totalDots++;
              }
          });
      }

      // Get top 3 sectors by count
      const sortedSectors = Object.entries(sectorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

      // Display the top 3 sectors inside the boundary circle
      let yOffset = -160;
      sortedSectors.forEach(([sector, count]) => {
          const percentage = (count / totalDots) * 100;

          // Label the sector
          c.fillStyle = '#ffffff';
          c.font = '16px Arial';
          c.fillText(`${sector}: ${percentage.toFixed(1)}%`, mouseClickX - 50, mouseClickY + yOffset);

          // Draw a progress bar
          c.fillStyle = sectorColors[sector] || '#ffffff';
          c.fillRect(mouseClickX - 50, mouseClickY + yOffset + 5, percentage * 1.5, 10);

          yOffset += 30;
      });
  }
}

// Update dots and spiders
function update() {
  const time = Date.now() / 1000; // Time for sinusoidal calculations

  // Update dots
  for (let sector in clusters) {
    clusters[sector].forEach(dot => {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < 0 || dot.x > w) dot.vx *= -1;
      if (dot.y < 0 || dot.y > h) dot.vy *= -1;
    });
  }

  // Update spiders
  spiders.forEach(spider => {
    if (spider.targetX !== null && spider.targetY !== null) {
      // Move spider towards its target (mouse click)
      const dx = spider.targetX - spider.x;
      const dy = spider.targetY - spider.y;
      const distance = Math.sqrt(dx ** 2 + dy ** 2);

      if (distance > 1) { // Stop when close enough
        spider.x += dx * 0.05; // Adjust speed
        spider.y += dy * 0.05;
      } else {
        spider.targetX = null; // Reset target when reached
        spider.targetY = null;
      }
    } else if (spider.isMovingRandomly) {
      // Sinusoidal motion for natural movement
      spider.x += Math.sin(time * 2 + spider.radius) * 0.5;
      spider.y += Math.cos(time * 2 + spider.radius) * 0.5;

      spider.x += spider.vx;
      spider.y += spider.vy;

      // Bounce spiders off edges
      if (spider.x - spider.radius < 0 || spider.x + spider.radius > w) spider.vx *= -1;
      if (spider.y - spider.radius < 0 || spider.y + spider.radius > h) spider.vy *= -1;
    }
  });
}

// Handle idle state
function handleIdle() {
  const now = Date.now();
  if (now - lastMouseMoveTime > idleTimeLimit) {
    const originalSpider = spiders[0];
    if (!originalSpider.isMovingRandomly) {
      originalSpider.isMovingRandomly = true;
      originalSpider.vx = (Math.random() - 0.5) * 2;
      originalSpider.vy = (Math.random() - 0.5) * 2;

      spiders.push({
        x: originalSpider.x,
        y: originalSpider.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 10,
        color: '#ffffff',
        isMovingRandomly: true,
        targetX: null,
        targetY: null,
      });
    }
  }
}

// Animation loop
function animate() {
  c.fillStyle = '#000000';
  c.fillRect(0, 0, w, h);

  handleIdle();
  update();
  drawClusters();
  drawSpiders();
  connectCloseDots();
  drawBoundaryCircle();

  requestAnimationFrame(animate);
}

// Mouse events
canvas.addEventListener('mousemove', function() {
  lastMouseMoveTime = Date.now();
});

canvas.addEventListener('mousedown', function(e) {
  mouseClickX = e.clientX;
  mouseClickY = e.clientY;

  // Find the nearest spider
  let nearestSpider = null;
  let minDistance = Infinity;

  spiders.forEach(spider => {
    const dist = getDistance(mouseClickX, mouseClickY, spider.x, spider.y);
    if (dist < minDistance) {
      minDistance = dist;
      nearestSpider = spider;
    }
  });

  // Assign the nearest spider to follow the mouse click
  if (nearestSpider) {
    nearestSpider.targetX = mouseClickX;
    nearestSpider.targetY = mouseClickY;
  }

  // Determine the sector for boundary circle
  let sectorCounts = {};
  for (let sector in clusters) {
    sectorCounts[sector] = clusters[sector].filter(dot =>
      getDistance(mouseClickX, mouseClickY, dot.x, dot.y) <= 150).length;
  }

  selectedSector = Object.keys(sectorCounts).reduce((a, b) => sectorCounts[a] > sectorCounts[b] ? a : b, null);
});

canvas.addEventListener('mouseup', function() {
  mouseClickX = null;
  mouseClickY = null;
  selectedSector = null;
});

animate();
