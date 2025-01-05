// Ensure to include Chart.js, Chart.js Datalabels plugin, and Chart.js Zoom plugin in your HTML
// <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
// <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom"></script>

// Global variable for clicked RICs (assumes it's declared elsewhere in your project)
// let clickedRICs = window.clickedRICs || [];

// Function to fetch and parse the CSV data
const fetchAndParseCSV = async (fileName) => {
    const response = await fetch(fileName);
    const csvText = await response.text();
    const rows = csvText.split('\n').map(row => row.split(','));
    const headers = rows.shift();
    const parsedData = rows.filter(row => row.length > 1).map(row =>
        Object.fromEntries(row.map((val, i) => [headers[i], val]))
    );
    return parsedData;
};

// Function to reset zoom
const resetZoomFibo = (chart) => {
    chart.options.scales.x.min = null;
    chart.options.scales.x.max = null;
    chart.options.scales.y.min = null;
    chart.options.scales.y.max = null;
    chart.update();
};

// Function to create the scatter plot
const createScatterPlot = async () => {
    const data = await fetchAndParseCSV('ndx.csv'); // Replace with actual CSV path

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

        const diffs = Object.entries(fiboLevels).map(([level, value]) => ({
            level: parseFloat(level),
            diff: Math.abs(lastPrice - value),
            percentageDiff: Math.abs((lastPrice - value) / (highNav - lowNav)) * 100
        }));

        const nearestLevel = diffs.reduce((min, curr) => (curr.diff < min.diff ? curr : min));

        const yPosition = nearestLevel.level + (nearestLevel.percentageDiff / 100) * (highNav - lowNav);

        const vol = parseFloat(stock["Volume5D30D"]);
        const radius = Math.max(3, Math.abs(vol) / 5); 

        const borderColor = vol < 0 ? 'red' : 'green';

        const color = parseFloat(stock["1W%"]) > 0 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';

        return {
            x: Math.abs(SMA50200),
            y: yPosition,
            label: stock.RIC,
            borderColor: borderColor,
            radius: radius,
            backgroundColor: color,
        };
    });

    // Create the chart
    const ctx = document.getElementById('stockScatterFibo').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Stocks',
                    data: scatterData.map(stock => ({ x: stock.x, y: stock.y, label: stock.label })),
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
                },
                datalabels: {
                    align: 'top',
                    anchor: 'end',
                    formatter: (value, context) => context.dataset.data[context.dataIndex].label,
                    font: {
                        size: 10,
                    },
                    color: '#000',
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: false, // Disabling mouse scroll zooming
                        },
                        drag: {
                            enabled: true, // Keep drag zooming enabled
                            mode: 'xy',  // Zoom in both x and y directions
                        },
                        mode: 'xy', // Ensure both axes can be zoomed in/out
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    position: 'bottom',
                    title: { display: true, text: 'SMA50_SMA200 (Logarithmic Scale)' }
                },
                y: {
                    title: { display: true, text: 'Fibonacci Levels (%)' },
                    ticks: {
                        callback: (value) => `${value}%`,
                        values: [0, 38.2, 50, 61.8, 100, 161.8],
                    },
                    min: -30,
                    max: 180,
                    grid: {
                        drawBorder: true,
                        color: (context) => {
                            const fiboLevels = [0, 38.2, 50, 61.8, 100, 161.8];
                            return fiboLevels.includes(context.tick.value) ? 'red' : '#e0e0e0';
                        },
                        lineWidth: (context) => {
                            const fiboLevels = [0, 38.2, 50, 61.8, 100, 161.8];
                            return fiboLevels.includes(context.tick.value) ? 2 : 1;
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    handleCircleClick(chart, ctx.canvas); // Attach click event listener

    // Double-click to reset zoom
    ctx.canvas.addEventListener('dblclick', () => {
        resetZoomFibo(chart);
        console.log("Zoom reset on double-click");
    });
};

// Function to handle circle clicks and update clicked RICs
const handleCircleClick = (chart, canvas) => {
    if (!canvas || !chart) {
        console.error("Canvas or Chart is undefined"); // Debug: Check parameters
        return;
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);

        if (points.length > 0) {
            const datasetIndex = points[0].datasetIndex;
            const index = points[0].index;

            const clickedRIC = chart.data.datasets[datasetIndex].data[index].label;

            if (!clickedRICs.includes(clickedRIC)) {
                clickedRICs.push(clickedRIC);
                console.log(`Added ${clickedRIC} to clickedRICs.`);
                updateClickedStocksPanel(); // Update the panel
            } else {
                console.log(`${clickedRIC} is already in clickedRICs.`);
            }

            console.log("Current clickedRICs:", clickedRICs);
        }
    });
};

// Function to update the clicked stocks list on the panel
const updateClickedStocksPanel = () => {
    const panel = document.getElementById('clickedStockPanel'); // Get the panel element

    // Create and append a list of selected stocks
    let ul = panel.querySelector('ul');
    if (!ul) {
        ul = document.createElement('ul');
        panel.appendChild(ul);
    }

    // Clear existing list items to update with new ones
    ul.innerHTML = '';
    clickedRICs.forEach(stockName => {
        const li = document.createElement('li');
        li.textContent = stockName;
        ul.appendChild(li);
    });
};

// Load the scatter plot on page load
createScatterPlot();
