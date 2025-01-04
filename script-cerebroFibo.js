// Function to fetch and parse the CSV data
const fetchAndParseCSV = async (fileName) => {
  const response = await fetch(fileName);
  const csvText = await response.text();
  const rows = csvText.split('\n').map(row => row.split(','));
  const headers = rows.shift();
  const parsedData = rows.filter(row => row.length > 1).map(row => 
      Object.fromEntries(row.map((val, i) => [headers[i], val]))
  );

  // Log to check the parsed data
  console.log('Parsed Data:', parsedData);

  return parsedData;
};

// Function to create the scatter plot
const createScatterPlot = async () => {
  const data = await fetchAndParseCSV('ndx.csv'); // Replace with actual CSV path
  console.log('Fetched Data:', data);

  // Prepare data for the scatter plot
  const scatterData = data.map(stock => {
      const lastPrice = parseFloat(stock["Last"]);
      const SMA50200 = parseFloat(stock["SMA50-SMA200"]);
      const highNav = parseFloat(stock.HighNav);
      const lowNav = parseFloat(stock.LowNav);
      const fiboLevels = {
          100: highNav,
          61.8: parseFloat(stock.Fibo618),
          50: parseFloat(stock.Fibo50),
          38.2: parseFloat(stock.Fibo382),
          0: lowNav
      };

      // Log Fibonacci levels
      console.log('Fibonacci Levels:', fiboLevels);

      // Calculate absolute differences as percentages from Last Price
      const diffs = Object.entries(fiboLevels).map(([level, value]) => ({
          level: parseFloat(level), // Fibonacci level as a number
          diff: Math.abs(lastPrice - value),
          percentageDiff: Math.abs((lastPrice - value) / (highNav - lowNav)) * 100
      }));

      // Log diffs
      console.log('Fibonacci Differences:', diffs);

      // Find the nearest Fibonacci level
      const nearestLevel = diffs.reduce((min, curr) => (curr.diff < min.diff ? curr : min));
      console.log('Nearest Fibonacci Level:', nearestLevel);

      // Calculate the y-axis position based on the percentage difference from the nearest Fibonacci level
      const yPosition = nearestLevel.level + (nearestLevel.percentageDiff / 100) * (highNav - lowNav);
      console.log('Y Position:', yPosition);

      // Set the circle size based on Volume5D30D, ensuring some variation, and scaling appropriately
      const vol = parseFloat(stock["Volume5D30D"]);
      const radius = Math.max(3, Math.abs(vol) / 5); // Ensure positive scaling even for negative values
      console.log('Radius:', radius);

      // Determine the border style based on Volume5D30D value
      const borderColor = vol < 0 ? 'red' : 'green'; // Red border for negative Volume5D30D, green for positive
      console.log('Border Color:', borderColor);

      // Determine the color of the circle based on 1WpctChng (green if positive, red if negative)
      const color = parseFloat(stock["1W%"]) > 0 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'; // Translucent green or red
      console.log('Circle Color:', color);

      return {
          x: Math.abs(SMA50200), // Use SMA50_SMA200 as X-axis
          y: yPosition, // Adjusted Y-axis position
          label: stock.RIC,
          borderColor: borderColor, // Border color based on Volume5D30D
          radius: radius, // Vary circle size based on Volume5D30D
          backgroundColor: color, // Translucent circle color
      };
  });

  console.log('Scatter Data:', scatterData);

  // Create the chart
  const ctx = document.getElementById('stockScatterFibo').getContext('2d');
  new Chart(ctx, {
      type: 'scatter',
      data: {
          datasets: [
              {
                  label: 'Stocks',
                  data: scatterData.map(stock => ({ x: stock.x, y: stock.y })),
                  backgroundColor: scatterData.map(stock => stock.backgroundColor),
                  borderColor: scatterData.map(stock => stock.borderColor),
                  borderWidth: 1,
                  pointRadius: scatterData.map(stock => stock.radius),
                  pointHoverRadius: scatterData.map(stock => stock.radius + 2),
              }
          ]
      },
      options: {
          responsive: true,
          plugins: {
              legend: { display: false },
              tooltip: {
                  callbacks: {
                      label: (context) => {
                          const stock = scatterData[context.dataIndex];
                          return `${stock.label}: Nearest Level ${stock.y.toFixed(2)}%`;
                      }
                  }
              }
          },
          scales: {
              x: {
                  type: 'logarithmic', // Set x-axis to logarithmic scale
                  position: 'bottom',
                  title: { display: true, text: 'SMA50_SMA200 (Logarithmic Scale)' }
              },
              y: {
                  title: { display: true, text: 'Fibonacci Levels (%)' },
                  ticks: {
                      callback: (value) => `${value}%`, // Display percentages on Y-axis
                      values: [0, 38.2, 50, 61.8, 100, 161.8], // Explicitly set the Fibonacci levels for the ticks
                  },
                  min: -30, // Add padding below 0% for differences
                  max: 180, // Add padding above 161.8% for differences
                  grid: {
                      drawBorder: true,
                      color: (context) => {
                          // Highlight all Fibonacci levels with red gridlines
                          const fiboLevels = [0, 38.2, 50, 61.8, 100, 161.8];
                          return fiboLevels.includes(context.tick.value) ? 'red' : '#e0e0e0';
                      },
                      lineWidth: (context) => {
                          // Make Fibonacci level lines thicker
                          const fiboLevels = [0, 38.2, 50, 61.8, 100, 161.8];
                          return fiboLevels.includes(context.tick.value) ? 2 : 1;
                      }
                  }
              }
          }
      },
      plugins: [{
          afterDatasetsDraw: (chart) => {
              const ctx = chart.ctx;
              chart.data.datasets.forEach((dataset) => {
                  dataset.data.forEach((point, index) => {
                      const stock = scatterData[index];
                      const x = chart.scales.x.getPixelForValue(stock.x);
                      const y = chart.scales.y.getPixelForValue(stock.y);
                      const label = stock.label;
                      const radius = stock.radius;

                      ctx.fillStyle = stock.borderColor; // Label color same as border color
                      ctx.font = '12px Arial';
                      ctx.fillText(label, x - (label.length * 3), y + radius + 5); // Draw the RIC slightly offset from the circle
                  });
              });

              // Draw horizontal red lines at Fibonacci levels and add text labels
              const fiboLevels = [61.8, 50, 38.2, 100, 161.8];
              fiboLevels.forEach((level) => {
                  const yPosition = chart.scales.y.getPixelForValue(level);
                  ctx.save();
                  ctx.beginPath();
                  ctx.moveTo(chart.scales.x.getPixelForValue(0), yPosition);
                  ctx.lineTo(chart.scales.x.getPixelForValue(1000), yPosition); // Extend line across the chart
                  ctx.strokeStyle = level === 161.8 ? 'green' : 'red'; // Green for 161.8% level, red for others
                  ctx.lineWidth = 2;
                  ctx.stroke();

                  // Add text labels to the Fibonacci lines
                  ctx.fillStyle = 'black';
                  ctx.font = '12px Arial';
                  ctx.fillText(`${level}%`, chart.scales.x.getPixelForValue(10), yPosition + 5); // Label on the left of the line
                  ctx.restore();
              });
          }
      }]
  });
};

// Load the scatter plot on page load
createScatterPlot();
