document.addEventListener("DOMContentLoaded", function () {
  const correlationHeatmapTab = document.getElementById("correlation-heatmap");

  // Function to create the heatmap
  function generateHeatmap(containerId, labels, matrix, title) {
      const trace = {
          z: matrix,
          x: labels,
          y: labels,
          type: "heatmap",
          colorscale: "Viridis",
          showscale: true
      };

      const layout = {
          title: title,
          xaxis: { title: "Labels", automargin: true },
          yaxis: { title: "Labels", automargin: true },
          margin: { t: 40, l: 100 }
      };

      Plotly.newPlot(containerId, [trace], layout);
  }

  // Generate correlation matrices and labels
  function processCorrelations(data) {
      // Extract unique sectors and stocks
      const sectors = [...new Set(data.map(stock => stock.Sector))];
      const stocks = data.map(stock => stock.Stock);

      // Sort sectors and stocks by correlation
      const sortedSectors = sectors.sort((a, b) => {
          const avgCorrA = data.filter(stock => stock.Sector === a)
              .reduce((sum, stock) => sum + stock.Correlation, 0) / sectors.length;
          const avgCorrB = data.filter(stock => stock.Sector === b)
              .reduce((sum, stock) => sum + stock.Correlation, 0) / sectors.length;
          return avgCorrA - avgCorrB;
      });

      const sortedStocks = stocks.sort((a, b) => {
          const corrA = data.find(stock => stock.Stock === a).Correlation;
          const corrB = data.find(stock => stock.Stock === b).Correlation;
          return corrA - corrB;
      });

      // Create sector and stock correlation matrices
      const sectorMatrix = sortedSectors.map(sectorA =>
          sortedSectors.map(sectorB =>
              data.filter(stock => stock.Sector === sectorA && stock.Sector === sectorB)
                  .reduce((sum, stock) => sum + stock.Correlation, 0) / sortedSectors.length || 0
          )
      );

      const stockMatrix = sortedStocks.map(stockA =>
          sortedStocks.map(stockB =>
              stockA === stockB ? data.find(stock => stock.Stock === stockA).Correlation : 0
          )
      );

      return { sortedSectors, sectorMatrix, sortedStocks, stockMatrix };
  }

  // Fetch stock data from CSV and render heatmaps
  fetch("stocks.csv")
      .then(response => response.text())
      .then(csvData => {
          Papa.parse(csvData, {
              header: true,
              dynamicTyping: true,
              complete: function (result) {
                  const data = result.data;

                  // Process correlations
                  const { sortedSectors, sectorMatrix, sortedStocks, stockMatrix } = processCorrelations(data);

                  // Create containers for both heatmaps
                  correlationHeatmapTab.innerHTML = `
                      
                      <div id="sectorHeatmap" style="width: 100%; height: 50%;"></div>
                      <div id="stockHeatmap"  margin-top: 20px;"></div>
                      
                  `;

                  // Generate the sector heatmap
                  generateHeatmap(
                      "sectorHeatmap",
                      sortedSectors,
                      sectorMatrix,
                      "Sector Correlation Heatmap"
                  );

                  // Generate the stock heatmap
                  generateHeatmap(
                      "stockHeatmap",
                      sortedStocks,
                      stockMatrix,
                      "Stock Correlation Heatmap"
                  );
              }
          });
      });
});
