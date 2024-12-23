//Cerebro toggleNegExtZoom.js
// Global variables to hold the original data
let originalData = [];
let scatterData = [];
let levelData = [];
let isDragging = false;
let startX, startY, endX, endY;
let clickedRICs = []; // Global variable for storing clicked RIC names

function drawZoomRect(chart, startX, startY, endX, endY) {
  const ctx = chart.ctx;
    const canvas = chart.canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous rectangle
  chart.draw(); // Redraw chart to maintain data visibility

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.rect(startX, startY, endX - startX, endY - startY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function applyZoom(chart, startX, startY, endX, endY) {
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

  const xMin = Math.min(xScale.getValueForPixel(startX), xScale.getValueForPixel(endX));
  const xMax = Math.max(xScale.getValueForPixel(startX), xScale.getValueForPixel(endX));
  const yMin = Math.min(yScale.getValueForPixel(startY), yScale.getValueForPixel(endY));
  const yMax = Math.max(yScale.getValueForPixel(startY), yScale.getValueForPixel(endY));

  chart.options.scales.x.min = xMin;
  chart.options.scales.x.max = xMax;
  chart.options.scales.y.min = yMin;
  chart.options.scales.y.max = yMax;
  chart.update();
}
function displayClickedRICs() {
  const panel = document.getElementById('ricPanel');
  panel.innerHTML = ''; // Clear existing content

  if (clickedRICs.length === 0) {
    panel.textContent = 'No RICs clicked yet.';
    return;
  }

  const ul = document.createElement('ul');
  clickedRICs.forEach(ric => {
    const li = document.createElement('li');
    li.textContent = ric;
    ul.appendChild(li);
  });
  panel.appendChild(ul);
}
function onChartClick(event, chart) {
  const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
  if (elements.length) {
    const datasetIndex = elements[0].datasetIndex;
    const index = elements[0].index;
    const clickedRIC = chart.data.datasets[datasetIndex].data[index].label;

    if (!clickedRICs.includes(clickedRIC)) {
      clickedRICs.push(clickedRIC);
      displayClickedRICs();
    }
  }
} // <-- Closing the onChartClick function here

function filterData() {
  const showPositive = document.getElementById('positiveToggle').checked;
  const showNegative = document.getElementById('negativeToggle').checked;
  const hideExtremeRICs = document.getElementById('hideExtremeRICs').checked;
  const searchRIC = document.getElementById('searchRIC').value.toUpperCase(); // Get the search value
  const extremeThreshold = 400;  // Modify this based on your data

    // Filter the data based on toggle selections
    const filteredData = originalData.filter(stock => {
        const isPositive = stock["1W%"] > 0;
        const isNegative = stock["1W%"] < 0;
        // Define thresholds for extreme values (example)
        const isExtreme = Math.abs(stock["Last"]) > extremeThreshold || Math.abs(stock["PercentageDiff"]) > extremeThreshold;

        return (
            (!hideExtremeRICs || !isExtreme) &&  // Exclude extreme values if checkbox is checked
            ((showPositive && isPositive) || (showNegative && isNegative) || (!showPositive && !showNegative))
        );
    });

    // Apply search filter for specific RIC
    scatterData = filteredData.map(stock => {
        const isSearchMatch = searchRIC ? stock.ric.toUpperCase().includes(searchRIC) : true;
    const labelColor = isSearchMatch ? `rgba(0, 123, 255, 1)` : `rgba(0, 123, 255, 0.01)`; // Pale for non-matching RICs

        return {
            x: stock["SMA50-SMA200"],
            y: stock["PercentageDiff"],  // Use PercentageDiff for the y-axis
            r: stock["Volume5D30D"] / 1000000,
            label: stock.ric,
            name: stock.name,
            backgroundColor: isSearchMatch ? `rgba(0, 123, 255, 0.5)` : `rgba(0, 123, 255, 0.1)`,  // Pale for non-matching RICs
        borderColor: isSearchMatch ? (stock["1W%"] < 0 ? "red" : "rgba(0, 123, 255, 1)") : `rgba(0, 123, 255, 0.1)`,
            datalabels: {
                display: true,
                align: "center",
                anchor: "center",
                font: { size: 10 },
                color: labelColor,
                formatter: (val) => val.label,
            },
        };
    });

    levelData = filteredData.map(stock => {
        const isSearchMatch = searchRIC ? stock.ric.toUpperCase().includes(searchRIC) : true;
        const labelColor = isSearchMatch ? `rgba(0, 123, 255, 1)` : `rgba(0, 123, 255, 0.3)`; // Pale for non-matching RICs
        return {
            label: stock.ric,
            ric: stock.ric,
            name: stock.name,
            data: [
                { x: stock["SMA50-SMA200"], y: stock["20SMA"], label: `20SMA: ${stock["20SMA"]}`, ric: stock.ric, name: stock.name },
                { x: stock["SMA50-SMA200"], y: stock["200SMA"], label: `200SMA: ${stock["200SMA"]}`, ric: stock.ric, name: stock.name },
                { x: stock["SMA50-SMA200"], y: stock["Last"], label: `Last: ${stock["Last"]}`, ric: stock.ric, name: stock.name },
            ],
            borderColor: isSearchMatch ? (stock["1W%"] < 0 ? "red" : "green") : `rgba(0, 123, 255, 0.1)`,
            backgroundColor: isSearchMatch ? "rgba(255, 99, 132, 0.2)" : "rgba(255, 99, 132, 0.1)",  // Translucent for non-matching
            borderWidth: isSearchMatch ? 2 : 1,
            type: "line",
            fill: false,
            datalabels: {
                display: true,
                align: "top",
                anchor: "start",
                font: { size: 10 },
                color: labelColor,
            formatter: (val) => {
                let displayText = val.label;
                if (val.label.includes("Last")) {
                    displayText += ` \n(RIC: ${val.ric})`;
                }
                return displayText;
            }
        }
        };
    });


    updateCharts();
    initializeZoomEvents(bubbleChart);
  initializeZoomEvents(lineChart);
}

// Ensure proper handling of zoom functionality
function resetZoom(chart) {
    chart.options.scales.x.min = null;
    chart.options.scales.x.max = null;
    chart.options.scales.y.min = null;
    chart.options.scales.y.max = null;
    chart.update();
}

// Initialize event listeners and zoom for charts
function initializeCharts(data) {
    originalData = data;
    scatterData = data.map(stock => ({
        x: stock["SMA50-SMA200"],
        y: stock["SMA20-SMA50"],
        r: stock["Volume5D30D"] / 1000000,
        label: stock.ric,
        name: stock.name,
        backgroundColor: `rgba(0, 123, 255, )`,
  borderColor: stock["1W%"] < 0 ? "red" : "rgba(0, 123, 255, 1)"
  }));

  levelData = filteredData.map(stock => {
    const isSearchMatch = searchRIC ? stock.ric.toUpperCase().includes(searchRIC) : true;

    // Adjust labelColor transparency: more transparent for non-matching RICs
    const labelColor = isSearchMatch ? `rgba(0, 123, 255, 1)` : `rgba(0, 123, 255, 0.00)`; // Lighter for non-matching RICs

    // Adjust backgroundColor transparency for non-matching RICs (lighter or more translucent)
    const backgroundColor = isSearchMatch ? "rgba(255, 99, 132, 0.2)" : "rgba(255, 99, 132, 0.00)"; // Lighter/transparent for non-matching

    // Adjust borderColor transparency for non-matching RICs (lighter or more translucent)
    const borderColor = isSearchMatch ? (stock["1W%"] < 0 ? "red" : "green") : `rgba(0, 123, 255, 0.0)`; // Light translucent border for non-matching

    return {
    label: stock.ric,
    ric: stock.ric,
    name: stock.name,
    data: [
      { x: stock["SMA50-SMA200"], y: stock["20SMA"], label: `20SMA: ${stock["20SMA"]}`, ric: stock.ric, name: stock.name },
      { x: stock["SMA50-SMA200"], y: stock["200SMA"], label: `200SMA: ${stock["200SMA"]}`, ric: stock.ric, name: stock.name },
      { x: stock["SMA50-SMA200"], y: stock["Last"], label: `Last: ${stock["Last"]}`, ric: stock.ric, name: stock.name },
    ],
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        borderWidth: isSearchMatch ? 2 : 1,
    type: "line",
    fill: false,
        datalabels: {
            display: true,
            align: "top",
            anchor: "start",
            font: { size: 10 },
            color: labelColor,
            formatter: (val) => {
                let displayText = val.label;
                if (val.label.includes("Last")) {
                    displayText += ` \n(RIC: ${val.ric})`;
                }
                return displayText;
            }
        }
    };
});

    const bubbleCtx = document.getElementById("bubbleChart").getContext("2d");
    window.bubbleChart = new Chart(bubbleCtx, {
        type: "bubble",
        data: {
            datasets: [{
                label: 'Stocks',
                data: scatterData,
                borderWidth: 1,
                borderColor: scatterData.map(d => d.borderColor),
                backgroundColor: scatterData.map(d => d.backgroundColor),
                datalabels: {
                    display: true,
                    align: "center",
                    anchor: "center",
                    font: { size: 10 },
                    color: "#333",
                    formatter: (val) => val.label,
                },
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow custom height
            scales: {
                x: {
                    title: { display: true, text: "SMA50-SMA200" },
                    type: "logarithmic",
                    position: "bottom",
                },
                y: {
                    title: { display: true, text: "Percentage Difference (Last - 52WkLow)" },
                    type: "linear",  // Change to linear if it's not logarithmic
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2) + '%';  // Display as percentage
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const raw = context.raw || {};
                            return [
                                `${raw.label || "N/A"}`,
                                `Name: ${raw.name || "N/A"}`,
                                `SMA50-SMA200: ${raw.x.toFixed(2)}`,
                                `SMA20-SMA50: ${raw.y.toFixed(2)}`,
                                `52WkLow Pct Diff: ${(raw.y).toFixed(2)}%`,  // Display percentage in tooltip
                                `Volume (in millions): ${raw.r.toFixed(2)}M`
                            ];
                        }
                    },
                    bodyFont: { size: 12 },
                    boxWidth: 6,
                    displayColors: true,
                    titleFont: { size: 14 },
                },
            },
            zoom: {
                wheel: { enabled: true, speed: 0.1 },
                pinch: { enabled: true },
                mode: "xy",
            },
            pan: {
                enabled: true,
                mode: "xy",
            }
        },
        plugins: [ChartDataLabels],
    });

    const lineCtx = document.getElementById("lineChart").getContext("2d");
    window.lineChart = new Chart(lineCtx, {
        type: "line",
        data: {
            datasets: levelData.map(line => ({
                ...line,
                datalabels: {
                    display: true,
                    align: "top",
                    anchor: "start",
                    font: { size: 10 },
                    color: "#333",
                    formatter: function (val) {
                        let displayText = val.label;
                        if (val.label.includes("Last")) {
                            displayText += ` \n(RIC: ${val.ric})`;
                        }
                        return displayText;
                    }
                }
            })),
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow custom height
            scales: {
                x: {
                    title: { display: true, text: "SMA50-SMA200" },
                    type: "logarithmic",
                    position: "bottom",
                },
                y: {
                    title: { display: true, text: "Price Level" },
                    type: "logarithmic",
                }
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        title: () => '',
                        label: () => '',
                        footer: () => '',
                        label: function(context) {
                            const { raw } = context;
                            const ric = raw ? raw.ric : 'No RIC';
                            const name = raw ? raw.name : 'No Name';
                            return [
                                ` ${ric}`,
                                `Name: ${name}`,
                                `SMA50-SMA200: ${raw.x}`,
                                `SMA200D: ${raw.y}`
                            ];
                        }
                    },
                    bodyFont: { size: 12 },
                    boxWidth: 6,
                    displayColors: true,
                },
                zoom: {
                    wheel: { enabled: true, speed: 0.1 },
                    pinch: { enabled: true },
                    mode: "xy",
                },
                legend: {
                    display: false,
                },
            },
            pan: {
                enabled: true,
                mode: "xy",
            }
        },
        plugins: [ChartDataLabels],
    });

    filterData(); // Initial rendering
}

        // Function to update the charts
function updateCharts() {
  // Update the bubble chart with the new data
  bubbleChart.data.datasets[0].data = scatterData;
  bubbleChart.data.datasets[0].borderColor = scatterData.map(d => d.borderColor);
  bubbleChart.data.datasets[0].backgroundColor = scatterData.map(d => d.backgroundColor);
  bubbleChart.update();

  // Update the line chart with the new data
  lineChart.data.datasets = levelData.map(line => ({
    ...line,
    datalabels: {
      display: true,
      align: "top",
      anchor: "start",
      font: { size: 10 },
      color: "#333",
      formatter: (val) => val.label,
    }
  }));
  lineChart.update();
}

function resetZoom(chart) {
        chart.options.scales.x.min = null;
        chart.options.scales.x.max = null;
        chart.options.scales.y.min = null;
        chart.options.scales.y.max = null;
        chart.update();
}

function initializeZoomEvents(chart) {
  const canvas = chart.canvas;

  canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;
  });

  canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      endX = event.clientX - rect.left;
      endY = event.clientY - rect.top;
      drawZoomRect(chart, startX, startY, endX, endY);
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      applyZoom(chart, startX, startY, endX, endY);
    }
  });

  canvas.addEventListener('dblclick', () => resetZoom(chart));
}

function initializeCharts(data) {
  
  originalData = data;
  scatterData = data.map(stock => ({
    x: stock["SMA50-SMA200"],
    y: stock["SMA20-SMA50"],
    r: stock["Volume5D30D"] / 1000000,
    label: stock.ric,
    name: stock.name,
    backgroundColor: `rgba(0, 123, 255, 0.5)`,
    borderColor: stock["1W%"] < 0 ? "red" : "rgba(0, 123, 255, 1)"
  }));

  levelData = data.map(stock => ({
    label: stock.ric,
    ric: stock.ric,
    name: stock.name,
    data: [
      { x: stock["SMA50-SMA200"], y: stock["20SMA"], label: `20SMA: ${stock["20SMA"]}`, ric: stock.ric, name: stock.name },
      { x: stock["SMA50-SMA200"], y: stock["200SMA"], label: `200SMA: ${stock["200SMA"]}`, ric: stock.ric, name: stock.name },
      { x: stock["SMA50-SMA200"], y: stock["Last"], label: `Last: ${stock["Last"]}`, ric: stock.ric, name: stock.name },
    ],
    borderColor: stock["1W%"] < 0 ? "red" : "green", 
    backgroundColor: "rgba(255, 99, 132, 0.2)",
    borderWidth: 2,
    type: "line",
    fill: false,
  }));

  const bubbleCtx = document.getElementById("bubbleChart").getContext("2d");
  window.bubbleChart = new Chart(bubbleCtx, {
    type: "bubble",
    data: {
      datasets: [{
        label: "Stocks in red if weekly % is negative, ",
        data: scatterData,
                    borderWidth: 1,
        borderColor: scatterData.map(d => d.borderColor),
        backgroundColor: scatterData.map(d => d.backgroundColor),
        borderWidth: 2,
        datalabels: {
          display: true,
          align: "center",
          anchor: "center",
          font: { size: 10 },
          color: "#333",
          formatter: (val) => val.label,
        },
      }],
    },
    options: {
      responsive: true,
      onClick: (event) => onChartClick(event, bubbleChart), // Add click event
      scales: {
        x: {
          title: { display: true, text: "SMA50-SMA200" },
          type: "logarithmic",
          position: "bottom",
        },
        y: {
          title: { display: true, text: "Percentage Difference (Last - 52WkLow)" },
      type: "linear",  // Change to linear if it's not logarithmic
      ticks: {
        callback: function(value) {
          return value.toFixed(2) + '%';  // Display as percentage
        }
      }
        }
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            label: function(context) {
              const raw = context.raw || {};
              return [
                `${raw.label || "N/A"}`,
                `Name: ${raw.name || "N/A"}`,
                `SMA50-SMA200: ${raw.x.toFixed(2)}`,
                `SMA20-SMA50: ${raw.y.toFixed(2)}`,
                `52WkLow Pct Diff: ${(raw.y).toFixed(2)}%`,  // Display percentage in tooltip
                `Volume (in millions): ${raw.r.toFixed(2)}M`
              ];
            }
          },
          bodyFont: { size: 12 },  // Adjust the font size of the tooltip content
                    boxWidth: 6,  // Adjust box size if needed
                    displayColors: true,  // Optional, to hide color boxes for tooltips
                    titleFont: { size: 14 }, // Optional, control title font size
        },
      },
      zoom: {
                wheel: { enabled: true, speed: 0.1 },
                pinch: { enabled: true },
                mode: "xy",
            },
            pan: {
                enabled: true,
                mode: "xy",
            }
    },
        plugins: [ChartDataLabels],
  });

  const lineCtx = document.getElementById("lineChart").getContext("2d");
  window.lineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      datasets: levelData.map(line => ({
        ...line,
        datalabels: {
          display: true,
          align: "top",
          anchor: "start",
          font: { size: 10 },
          color: "#333",
          formatter: function (val) {
            let displayText = val.label;
            if (val.label.includes("Last")) {
              displayText += ` \n(RIC: ${val.ric})`;
            }
            return displayText;
          }
        }
      })),
    },
    options: {
      responsive: true,
      onClick: (event) => onChartClick(event, lineChart), // Add click event
      scales: {
        x: {
          title: { display: true, text: "SMA50-SMA200" },
          type: "logarithmic",
          position: "bottom",
        },
        y: {
          title: { display: true, text: "Price Level" },
          type: "logarithmic",
        }
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: () => '', // Suppress title
                        label: () => '', // Suppress label
                        footer: () => '', // Suppress footer
            label: function(context) {
                  const { raw } = context;
                  const ric = raw ? raw.ric : 'No RIC';
                  const name = raw ? raw.name : 'No Name';
                  const last = raw ? raw.label.match(/Last: ([\d.]+)/)?.[1] : 'No Last'; // Extract Last value from the label           
              return [
                ` ${ric}`,
                `Name: ${name}`,
                `SMA50-SMA200: ${raw.x}`,
                `SMA200D: ${raw.y}`
              ];
            },
          },
          bodyFont: { size: 12 },  // Adjust the font size of the tooltip content
                    boxWidth: 6,  // Adjust box size if needed
                    displayColors: true,  // Optional, to hide color boxes for tooltips
        },
        zoom: {
                    wheel: { enabled: true, speed: 0.1 },
                    pinch: { enabled: true },
                    mode: "xy",
                },
                legend: {
                    display: false,
                },
               },
                pan: {
                enabled: true,
                mode: "xy",
            }
    },
    plugins: [ChartDataLabels],
  });
  displayClickedRICs(); // Initialize panel
  // Initial rendering
  filterData();
}

function resetFilters() {
  document.getElementById('positiveToggle').checked = false;
  document.getElementById('negativeToggle').checked = false;
  filterData();

  initializeZoomEvents(bubbleChart);
  initializeZoomEvents(lineChart);
}

d3.csv("ndx.csv").then(data => {
  const formattedData = data.map(d => ({
    ric: d["RIC"],
  name: d["Name"],
  "SMA50-SMA200": parseFloat(d["SMA50-SMA200"]),
  "SMA20-SMA50": parseFloat(d["SMA20-SMA50"]),
  "Volume5D30D": parseFloat(d["Volume-VWAP"]),
  "20SMA": parseFloat(d["20SMA"]),
  "200SMA": parseFloat(d["200SMA"]),
  "Last": parseFloat(d["Last"]),
  "52WkLow": parseFloat(d["52WkLow"]),  // Assuming you have this column
  "1W%": parseFloat(d["1W%"]),
  "PercentageDiff": (parseFloat(d["Last"]) - parseFloat(d["52WkLow"])) / parseFloat(d["52WkLow"]) * 100  // Calculate percentage difference

  }));
  initializeCharts(formattedData);
}).catch(err => console.error("Error loading CSV:", err));

// Add event listeners for the controls
document.getElementById('positiveToggle').addEventListener('change', filterData);
document.getElementById('negativeToggle').addEventListener('change', filterData);
document.getElementById('resetButton').addEventListener('click', resetFilters);
document.getElementById('hideExtremeRICs').addEventListener('change', filterData);

// Reset button to clear all filters
document.getElementById('resetButton').addEventListener('click', () => {
  document.getElementById('positiveToggle').checked = false;
  document.getElementById('negativeToggle').checked = false;
  document.getElementById('hideExtremeRICs').checked = false;
  filterData();
});
// Function to populate the div
function displayGlobalVariables() {
  const priceActionsBody = document.getElementById("priceActionsBody");
  priceActionsBody.innerHTML = `
      <p>Price: ${globalVariables.price}</p>
      <p>Currency: ${globalVariables.currency}</p>
      <p>Timestamp: ${globalVariables.timestamp}</p>
  `;
}
    // Function to handle tab switching
    function switchTab(tabId) {
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));

      if (tabId === 'priceActions') {
          document.getElementById('priceActionsBody').classList.add('active');
          displayGlobalVariables();
      } else if (tabId === 'otherTab') {
          document.getElementById('otherTabBody').classList.add('active');
      }
  }
  // Event listeners for tabs
  document.getElementById("priceActions").addEventListener("click", () => switchTab('priceActions'));
      