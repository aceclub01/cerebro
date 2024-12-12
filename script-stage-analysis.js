document.addEventListener("DOMContentLoaded", function () {
    const stageAnalysisTab = document.getElementById("stage-analysis");

    function generateTable(data) {
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
            </div>
            <table border="1" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th>Stock</th>
                        <th>Sector</th>
                        <th>Stage</th>
                        <th>Weekly Change (%)</th>
                        <th>Monthly Change (%)</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    ${data.map(stock => `
                        <tr style="background-color: ${getRowColor(stock.Stage)}">
                            <td>${stock.Stock}</td>
                            <td>${stock.Sector}</td>
                            <td>${stock.Stage}</td>
                            <td>${(stock.WeeklyChange * 100).toFixed(2)}</td>
                            <td>${(stock.MonthlyChange * 100).toFixed(2)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>`;

        stageAnalysisTab.innerHTML = html;

        // Add event listener for sorting
        document.getElementById("applySort").addEventListener("click", () => {
            const sortCriteria = document.getElementById("sortFilter").value;
            const sortedData = [...data].sort((a, b) => {
                if (sortCriteria === "WeeklyChange" || sortCriteria === "MonthlyChange") {
                    return a[sortCriteria] - b[sortCriteria]; // Numerical sort
                } else {
                    if (a[sortCriteria] < b[sortCriteria]) return -1;
                    if (a[sortCriteria] > b[sortCriteria]) return 1;
                    return 0;
                }
            });
            updateTableBody(sortedData);
        });
    }

    function updateTableBody(data) {
        const tableBody = document.getElementById("tableBody");
        tableBody.innerHTML = data.map(stock => `
            <tr style="background-color: ${getRowColor(stock.Stage)}">
                <td>${stock.Stock}</td>
                <td>${stock.Sector}</td>
                <td>${stock.Stage}</td>
                <td>${(stock.WeeklyChange * 100).toFixed(2)}</td>
                <td>${(stock.MonthlyChange * 100).toFixed(2)}</td>
            </tr>
        `).join("");
    }

    function getRowColor(stage) {
        switch (stage) {
            case "Distribution": return "#ffcccc"; // Red
            case "Markup":
            case "Accumulation": return "#ccffcc"; // Green
            default: return "white";
        }
    }

    // Fetch stock data from CSV and render table
    fetch("stocks.csv")
        .then(response => response.text())
        .then(csvData => {
            Papa.parse(csvData, {
                header: true,
                dynamicTyping: true,
                complete: function (result) {
                    const data = result.data;

                    // Add a derived "Stage" field to each stock based on Weekly and Monthly Change
                    data.forEach(stock => {
                        if (stock.WeeklyChange < 0 && stock.MonthlyChange < 0) {
                            stock.Stage = "Distribution";
                        } else if (stock.WeeklyChange > 0 && stock.MonthlyChange > 0) {
                            stock.Stage = "Markup";
                        } else {
                            stock.Stage = "Accumulation";
                        }
                    });

                    generateTable(data);
                }
            });
        });
});
