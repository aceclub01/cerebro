document.addEventListener("DOMContentLoaded", function () {
    const stageAnalysisTab = document.getElementById("stage-analysis");
    const chartTab = document.getElementById("3dChart");
    

    // Create a loading message container and center it in the middle of the screen
    const loadingMessage = document.createElement("div");
    loadingMessage.style.position = "fixed";
    loadingMessage.style.top = "50%";
    loadingMessage.style.left = "50%";
    loadingMessage.style.transform = "translate(-50%, -50%)";
    loadingMessage.style.textAlign = "center";
    loadingMessage.style.fontSize = "24px";
    loadingMessage.style.marginTop = "20px";
    loadingMessage.innerHTML = "Loading Analysis into 3Dimension...";
    document.body.appendChild(loadingMessage);

    function generateTable(data) {
        // Create the controls first
        let html = `
            <div style="text-align: center; margin-bottom: 10px;">
                <label for="sortFilter">Sort by:</label>
                <select id="sortFilter">
                    <option value="Sector">Sector</option>
                    <option value="Stage">Stage</option>
                    <option value="WeeklyChange">Weekly Change (%)</option>
                    <option value="MonthlyChange">Monthly Change (%)</option>
                </select>
                <button id="applySort">Sort</button>
                <label for="zAxisFilter" style="margin-left: 20px;">Z-axis:</label>
                <select id="zAxisFilter">
                    <option value="RevGrowth">Revenue Growth</option>
                    <option value="%ROE">% ROE</option>
                    <option value="Volume5D30D">Volume5D/30D</option>
                </select>
                <button id="plot3D" style="margin-left: 10px;">Plot 3D</button>
                <label for="excludeNegative" style="margin-left: 20px;">
                    <input type="checkbox" id="excludeNegative"> Exclude negative changes
                </label>
                <label for="excludeNegativeWeekly" style="margin-left: 20px;">
                    <input type="checkbox" id="excludeNegativeWeekly"> Exclude negative Weekly Change
                </label>
                <label for="excludeNegativeMonthly" style="margin-left: 20px;">
                    <input type="checkbox" id="excludeNegativeMonthly"> Exclude negative Monthly Change
                </label>
                <label for="excludePositiveWeekly" style="margin-left: 20px;">
                    <input type="checkbox" id="excludePositiveWeekly"> Exclude positive Weekly Change
                </label>
                <label for="excludePositiveMonthly" style="margin-left: 20px;">
                    <input type="checkbox" id="excludePositiveMonthly"> Exclude positive Monthly Change
                </label>
                <label for="searchStock" style="margin-left: 20px;">Exclude Stock:</label>
                <input type="text" id="searchStock" placeholder="Enter stock name(s), comma-separated">
                <button id="applySearch">Apply</button>
                <button id="resetButton" style="margin-left: 10px; margin-top: 10px;">Reset</button>
            </div>

            <!-- 3D plot will be displayed here after loading -->
            <div id="chartContainer" style="overflow: auto; max-height: 400px; max-width: 100%; border: 1px solid #ccc; margin-top: 10px;"></div>
            <table border="1" style="width: 100%; border-collapse: collapse; ">
                <thead>
                    <tr>
                        <th>Include</th>
                        <th>Stock</th>
                        <th>Sector</th>
                        <th>Stage</th>
                        <th>Weekly Change (%)</th>
                        <th>Monthly Change (%)</th>
                        <th>Volume 5D/30D</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    ${data.map((stock, index) => `
                        <tr style="background-color: ${getRowColor(stock.Stage)}">
                            <td><input type="checkbox" class="includeRow" data-index="${index}" checked></td>
                            <td>${stock.Stock}</td>
                            <td>${stock.Sector}</td>
                            <td>${stock.Stage}</td>
                            <td>${(stock.WeeklyChange * 100).toFixed(2)}</td>
                            <td>${(stock.MonthlyChange * 100).toFixed(2)}</td>
                            <td>${stock.Volume5D30D.toFixed(2)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>`;

        // Insert the controls and table into the page
        stageAnalysisTab.innerHTML += html;

        // Hide the loading message once content is loaded
        loadingMessage.style.display = "none";

        // Event listeners for sorting, plotting, etc.
        document.getElementById("applySort").addEventListener("click", () => {
            const sortCriteria = document.getElementById("sortFilter").value;
            const sortedData = [...data].sort((a, b) => {
                if (sortCriteria === "WeeklyChange" || sortCriteria === "MonthlyChange") {
                    return a[sortCriteria] - b[sortCriteria];
                } else {
                    return a[sortCriteria].localeCompare(b[sortCriteria]);
                }
            });
            updateTableBody(sortedData);
        });

        document.getElementById("plot3D").addEventListener("click", () => {
            const zAxis = document.getElementById("zAxisFilter").value;
            const excludedStockNames = document.getElementById("searchStock").value
                .toLowerCase()
                .split(",")
                .map(name => name.trim());
            const excludeNegativeChanges = document.getElementById("excludeNegative").checked;
            const excludeNegativeWeekly = document.getElementById("excludeNegativeWeekly").checked;
            const excludeNegativeMonthly = document.getElementById("excludeNegativeMonthly").checked;
            const excludePositiveWeekly = document.getElementById("excludePositiveWeekly").checked;
            const excludePositiveMonthly = document.getElementById("excludePositiveMonthly").checked;

            const selectedData = data.filter((stock, index) => {
                const includeRow = document.querySelector(`.includeRow[data-index="${index}"]`).checked;
                const isExcluded = excludedStockNames.some(name => stock.Stock.toLowerCase() === name);

                const excludeStock = excludeNegativeChanges && (stock.WeeklyChange < 0 || stock.MonthlyChange < 0);
                const excludeWeekly = excludeNegativeWeekly && stock.WeeklyChange < 0;
                const excludeMonthly = excludeNegativeMonthly && stock.MonthlyChange < 0;
                const excludePositiveWeeklyChange = excludePositiveWeekly && stock.WeeklyChange > 0;
                const excludePositiveMonthlyChange = excludePositiveMonthly && stock.MonthlyChange > 0;

                return includeRow && !isExcluded && !excludeStock && !excludeWeekly && !excludeMonthly && !excludePositiveWeeklyChange && !excludePositiveMonthlyChange;
            });

            plot3DChart(selectedData, zAxis);
        });

        document.getElementById("applySearch").addEventListener("click", () => {
            const excludedStockNames = document.getElementById("searchStock").value
                .toLowerCase()
                .split(",")
                .map(name => name.trim());

            const tableRows = document.querySelectorAll("table tbody tr");
            
            tableRows.forEach((row, index) => {
                const stockName = row.querySelector("td:nth-child(2)").textContent.toLowerCase();
                const checkbox = row.querySelector(".includeRow");

                if (excludedStockNames.includes(stockName)) {
                    checkbox.checked = false;
                }
            });

            document.getElementById("plot3D").click();
        });

        document.getElementById("resetButton").addEventListener("click", () => {
            document.getElementById("excludeNegative").checked = false;
            document.getElementById("excludeNegativeWeekly").checked = false;
            document.getElementById("excludeNegativeMonthly").checked = false;
            document.getElementById("excludePositiveWeekly").checked = false;
            document.getElementById("excludePositiveMonthly").checked = false;
            document.getElementById("searchStock").value = "";
            const allCheckboxes = document.querySelectorAll(".includeRow");
            allCheckboxes.forEach(checkbox => checkbox.checked = true);

            document.getElementById("plot3D").click();
        });
    }

    function updateTableBody(data) {
        const tableBody = document.getElementById("tableBody");
        tableBody.innerHTML = data.map((stock, index) => `
            <tr style="background-color: ${getRowColor(stock.Stage)}">
                <td><input type="checkbox" class="includeRow" data-index="${index}" checked></td>
                <td>${stock.Stock}</td>
                <td>${stock.Sector}</td>
                <td>${stock.Stage}</td>
                <td>${(stock.WeeklyChange * 100).toFixed(2)}</td>
                <td>${(stock.MonthlyChange * 100).toFixed(2)}</td>
                <td>${stock.Volume5D30D.toFixed(2)}</td>
            </tr>
        `).join("");
    }

    function getRowColor(stage) {
        switch (stage) {
            case "Distribution": return "#ffcccc";
            case "Markup": return "#ccffcc";
            case "Accumulation": return "#ccffcc";
            case "Volume Surge": return "#ccccff";
            default: return "white";
        }
    }

    function plot3DChart(data, zAxis) {
        const x = data.map(stock => stock.WeeklyChange);
        const y = data.map(stock => stock.MonthlyChange);
        const z = data.map(stock => stock[zAxis] || 0);
        const text = data.map(stock => stock.Stock);  // Change to stock.Stock to show Stock name
        
        const sectors = [...new Set(data.map(stock => stock.Sector))];
        const sectorColors = {};
        sectors.forEach((sector, index) => {
            sectorColors[sector] = `hsl(${(index / sectors.length) * 360}, 100%, 50%)`;
        });
        const color = data.map(stock => sectorColors[stock.Sector] || "gray");
        
        const markerSettings = {
            size: 10,
            color: color,
            showscale: true
        };
        
        const scatterTrace = {
            x: x,
            y: y,
            z: z,
            text: text,  // Set stock names in the text property
            mode: "markers+text",
            type: "scatter3d",
            marker: markerSettings,
            textposition: "top center",  // Controls the positioning of the text
            hovertemplate: 
                `<b>%{text}</b><br>` + 
                `Stock: %{text}<br>` +  // Show the stock name in the hover
                `Sector: %{customdata}<br>` +  // Directly use customdata to display sector
                `Weekly: %{x:.2f}%<br>` +
                `Monthly: %{y:.2f}%<br>` +
                `${zAxis}: %{z:.2f}<br>` +
                `<extra></extra>`,
            customdata: data.map(stock => stock.Sector)  // Attach sector names in customdata
        };
        
        const layout = {
            title: `3D Scatter Plot (${zAxis} on Z-Axis)`,
            scene: {
                xaxis: { title: "Weekly Change (%)" },
                yaxis: { title: "Monthly Change (%)" },
                zaxis: { title: zAxis }
            }
        };
        
        Plotly.newPlot(chartTab, [scatterTrace], layout);
        
        // Handle click on points to show stock name in a panel
        chartTab.on('plotly_click', function(eventData) {
            const stockName = eventData.points[0].text;  // Get the clicked stock name
            displayClickedStockName(stockName);  // Call a function to display the clicked stock name
        });
    }
    
    // Function to display clicked stock name
    function displayClickedStockName(stockName) {
        const panel = document.getElementById("clickedStockPanel");
        const stockNamesDiv = panel ? panel.querySelector("#stockNames") : null;
    
        // Check if the panel exists
        if (!panel) {
            // If the panel doesn't exist, create it
            const newPanel = document.createElement("div");
            newPanel.id = "clickedStockPanel";
            newPanel.style.position = "fixed";
            newPanel.style.top = "20px";
            newPanel.style.right = "20px";
            newPanel.style.padding = "10px";
            newPanel.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
            newPanel.style.border = "1px solid #ccc";
            const newStockNamesDiv = document.createElement("div");
            newStockNamesDiv.id = "stockNames";
            newStockNamesDiv.innerHTML = `<strong>Shortlisted Stocks:</strong>`;
            newPanel.appendChild(newStockNamesDiv);
    
            // Create and add the clear button
            const clearButton = document.createElement("button");
            clearButton.textContent = "Clear Names";
            clearButton.style.marginTop = "10px";
            clearButton.addEventListener("click", () => clearStockNames());  // Call the function to clear names
            newPanel.appendChild(clearButton);
    
            document.body.appendChild(newPanel);
        }
    
        // Only add the stock name if it isn't already displayed
        if (stockNamesDiv && !Array.from(stockNamesDiv.children).some(div => div.textContent === stockName)) {
            const stockItem = document.createElement("div");
            stockItem.textContent = stockName;
            stockNamesDiv.appendChild(stockItem);
        }
    }
    
    // Function to clear the recorded stock names
    function clearStockNames() {
        const panel = document.getElementById("clickedStockPanel");
        if (panel) {
            const stockNamesDiv = panel.querySelector("#stockNames");
            if (stockNamesDiv) {
                stockNamesDiv.innerHTML = `<strong>Shortlisted Stocks:</strong>`;  // Reset the list
            }
        }
    }
    
   // Function to display clicked stock name
function displayClickedStockName(stockName) {
    const panel = document.getElementById("clickedStockPanel");
    const stockNamesDiv = panel ? panel.querySelector("#stockNames") : null;

    // Check if the panel exists
    if (!panel) {
        // If the panel doesn't exist, create it
        const newPanel = document.createElement("div");
        newPanel.id = "clickedStockPanel";
        newPanel.style.position = "fixed";
        newPanel.style.top = "20px";
        newPanel.style.right = "20px";
        newPanel.style.padding = "10px";
        newPanel.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
        newPanel.style.border = "1px solid #ccc";
        const newStockNamesDiv = document.createElement("div");
        newStockNamesDiv.id = "stockNames";
        newStockNamesDiv.innerHTML = `<strong>Shortlisted Stocks:</strong>`;
        newPanel.appendChild(newStockNamesDiv);

        // Create and add the clear button
        const clearButton = document.createElement("button");
        clearButton.textContent = "Clear Names";
        clearButton.style.marginTop = "10px";
        clearButton.addEventListener("click", () => clearStockNames());  // Call the function to clear names
        newPanel.appendChild(clearButton);

        document.body.appendChild(newPanel);
    }

    // Only add the stock name if it isn't already displayed
    if (stockNamesDiv && !Array.from(stockNamesDiv.children).some(div => div.textContent === stockName)) {
        const stockItem = document.createElement("div");
        stockItem.textContent = stockName;
        stockNamesDiv.appendChild(stockItem);
    }
}

    
    

    fetch("stocks.csv")
        .then(response => response.text())
        .then(csvData => {
            Papa.parse(csvData, {
                header: true,
                dynamicTyping: true,
                complete: function (result) {
                    const data = result.data;

                    data.forEach(stock => {
                        const volumeSurgeThreshold = 1.5;
                        stock.Volume5D30D = parseFloat(stock.Volume5D30D) || 0;
                        if (stock.Volume5D30D > volumeSurgeThreshold && stock.WeeklyChange < 0 && stock.MonthlyChange < 0) {
                            stock.Stage = "Volume Surge";
                        } else if (stock.WeeklyChange < 0 && stock.MonthlyChange < 0) {
                            stock.Stage = "Distribution";
                        } else if (stock.WeeklyChange > 0 && stock.MonthlyChange > 0) {
                            stock.Stage = "Markup";
                        } else {
                            stock.Stage = "Accumulation";
                        }
                    });

                    generateTable(data);
                    // Event listeners should be added after the table is generated
                     //addEventListeners();
                }
            });
        });
});
