// Show tab function moved outside
function showTab(tabId) {
  // Hide all tab contents
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));

  // Deactivate all tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Show the selected tab
  document.getElementById(tabId).classList.add('active');

  // Activate the clicked tab
  const clickedTab = Array.from(tabs).find(tab => tab.textContent.toLowerCase() === tabId.replace('tab-', '').toLowerCase());
  clickedTab.classList.add('active');
}

// Fetch and process the CSV data
fetch('stocks.csv')
  .then(response => response.text())
  .then(csvData => {
      const rows = csvData.split('\n').slice(1); // Skip the header
      const data = rows.map(row => {
          const [Stock, Sector, WeeklyChange, MonthlyChange, Correlation] = row.split(',');
          return {
              Stock,
              Sector,
              WeeklyChange: parseFloat(WeeklyChange),
              MonthlyChange: parseFloat(MonthlyChange),
              Correlation: parseFloat(Correlation),
          };
      });

      // Create a mapping of sectors to unique colors
      const uniqueSectors = Array.from(new Set(data.map(d => d.Sector)));
      const sectorColors = uniqueSectors.reduce((acc, sector, index) => {
          acc[sector] = `hsl(${(index / uniqueSectors.length) * 360}, 70%, 50%)`;
          return acc;
      }, {});

      // Categorize stocks based on stages
      const stockStages = data.map(d => {
          if (d.MonthlyChange > 0 && d.WeeklyChange > 0) return 'Markup';
          if (d.MonthlyChange < 0 && d.WeeklyChange < 0) return 'Markdown';
          if (d.MonthlyChange < 0 && d.WeeklyChange > 0) return 'Accumulation';
          if (d.MonthlyChange > 0 && d.WeeklyChange < 0) return 'Distribution';
          return 'Unknown';
      });

      // Add stages to data
      data.forEach((d, i) => {
          d.Stage = stockStages[i];
      });

      // Prepare data for the 3D scatter plot
      const x = data.map(d => d.WeeklyChange);
      const y = data.map(d => d.MonthlyChange);
      const z = data.map(d => d.Correlation);
      const text = data.map(d => `${d.Stock} (${d.Stage})`);
      const color = data.map(d => sectorColors[d.Sector]);

      const scatterTrace = {
          x: x,
          y: y,
          z: z,
          mode: 'markers+text',
          marker: {
              size: 10,
              color: color,
              showscale: false,
          },
          text: text,
          textposition: 'top center',
          type: 'scatter3d',
      };

      // Prepare heatmap with labels
      const heatmapTrace = {
          x: x,
          y: y,
          z: z,
          type: 'heatmap',
          colorscale: 'Viridis',
          colorbar: {
              title: 'Correlation',
          },
      };

      // Prepare sector mood analysis table
      const tableTrace = {
          type: 'table',
          header: {
              values: [['<b>Sector</b>'], ['<b>Stage</b>'], ['<b>Retreating (%)</b>'], ['<b>Recovering (%)</b>']],
              align: 'center',
              fill: { color: 'lightgrey' },
              font: { size: 12 },
          },
          cells: {
              values: [
                  uniqueSectors,
                  uniqueSectors.map(sector => {
                      const sectorData = data.filter(d => d.Sector === sector);
                      const stages = Array.from(new Set(sectorData.map(d => d.Stage)));
                      return stages.join(', ');
                  }),
                  uniqueSectors.map(sector => {
                      const sectorData = data.filter(d => d.Sector === sector);
                      const retreating = sectorData.filter(d => d.MonthlyChange < 0 && d.WeeklyChange < 0).length;
                      return ((retreating / sectorData.length) * 100).toFixed(1);
                  }),
                  uniqueSectors.map(sector => {
                      const sectorData = data.filter(d => d.Sector === sector);
                      const recovering = sectorData.filter(d => d.MonthlyChange < 0 && d.WeeklyChange > 0).length;
                      return ((recovering / sectorData.length) * 100).toFixed(1);
                  }),
              ],
              align: 'center',
              fill: { color: ['white', 'white', 'white', 'white'] },
              font: { size: 11 },
          },
      };

      // Layouts with full screen optimization
      const layout3D = {
          margin: { l: 0, r: 0, b: 0, t: 0 },
          scene: { camera: { eye: { x: 2, y: 2, z: 2 } } },
          autosize: true,
      };

      const layoutHeatmap = {
          margin: { l: 0, r: 0, b: 0, t: 0 },
          height: '100%',
          width: '100%',
          autosize: true,
      };

      const layoutTable = {
          margin: { l: 0, r: 0, b: 0, t: 0 },
          height: '100%',
          width: '100%',
      };

      // Render plots
      Plotly.newPlot('plot3D', [scatterTrace], layout3D);
      Plotly.newPlot('heatmap', [heatmapTrace], layoutHeatmap);
      Plotly.newPlot('table', [tableTrace], layoutTable);

      // Create the Spider Chart
      function createSpiderChart() {
          var ctx = document.getElementById('spiderCanvas').getContext('2d');
          var data = {
              labels: ["Weekly Change", "Monthly Change", "Correlation"], // Customize labels
              datasets: [{
                  label: "Stock Performance",
                  data: [50, 60, 70], // Data here can be dynamic
                  borderColor: "rgba(0,123,255,0.8)",
                  backgroundColor: "rgba(0,123,255,0.2)",
                  fill: true
              }]
          };

          var options = {
              responsive: true,
              scale: {
                  ticks: {
                      beginAtZero: true,
                      max: 100,
                  }
              }
          };

          new Chart(ctx, {
              type: 'radar',
              data: data,
              options: options
          });
      }

      // Call the Spider Chart creation function when the tab is active
      createSpiderChart();
  });
