fetch('stocks.csv')
    .then(response => response.text())
    .then(csvData => {
        const rows = csvData.split('\n').slice(1); // Skip the header
        const data = rows.map(row => {
            const [Stock, Sector, WeeklyChange, MonthlyChange, Correlation] = row.split(',');

            return {
                Stock,
                Sector,
                WeeklyChange: parseFloat(WeeklyChange) || 0,  // Default to 0 if NaN
                MonthlyChange: parseFloat(MonthlyChange) || 0,  // Default to 0 if NaN
                Correlation: parseFloat(Correlation) || 0  // Default to 0 if NaN
            };
        });

        const x = data.map(d => d.WeeklyChange);
        const y = data.map(d => d.MonthlyChange);
        const z = data.map(d => d.Correlation);
        const text = data.map(d => d.Stock); // Use only stock names for labels

        const sectors = [...new Set(data.map(d => d.Sector))];
        const sectorColors = {};
        sectors.forEach((sector, index) => {
            sectorColors[sector] = `hsl(${(index / sectors.length) * 360}, 100%, 50%)`; // Unique color for each sector
        });

        const color = data.map(d => sectorColors[d.Sector] || 'gray');

        // 3D Plot
        const trace = {
            x: x,
            y: y,
            z: z,
            mode: 'markers+text', // Display markers and text
            marker: {
                size: 10,
                color: color,
                colorscale: 'Viridis', 
                showscale: true,
                colorbar: {
                    title: 'Correlation'
                }
            },
            text: text, // Labels for dots
            textposition: 'top center', // Position text relative to markers
            textfont: {
                size: 10,
                color: 'black'
            },
            type: 'scatter3d',
            hovertemplate: 
                `<b>%{text}</b><br>` + 
                `Weekly : %{x:.2f}%<br>` +
                `Monthly : %{y:.2f}%<br>` +
                `Correlation: %{z:.2f}` +
                `<extra></extra>` // Removes the default "trace" label
        };

        const layout = {
            title: '3D Stock Data Visualization',
            scene: {
                xaxis: {
                    title: 'Weekly Change (%)',
                    color: 'black',
                    showgrid: true, // Ensure grid is shown
                    gridcolor: 'black', // Set grid color to black
                    zeroline: true, // Enable the zero-line
                    zerolinecolor: 'red', // Set zero-line color to red
                },
                yaxis: {
                    title: 'Monthly Change (%)',
                    color: 'black',
                    showgrid: true, // Ensure grid is shown
                    gridcolor: 'black', // Set grid color to black
                    zeroline: true, // Enable the zero-line
                    zerolinecolor: 'red', // Set zero-line color to red
                },
                zaxis: {
                    title: 'Correlation',
                    color: 'black',
                    showgrid: true, // Ensure grid is shown
                    gridcolor: 'black', // Set grid color to black
                    zeroline: true, // Enable the zero-line
                    zerolinecolor: 'red', // Set zero-line color to red
                },
                camera: {
                    eye: { x: 2, y: 2, z: 2 }
                }
            },
            hovermode: 'closest',
            plot_bgcolor: 'black',
            font: {
                color: 'black' // Change font color to white for better contrast
            }
        };

        // Plot the chart
        Plotly.newPlot('3dChart', [trace], layout);

        // Resize the chart when the window size changes
        window.onresize = () => {
            Plotly.Plots.resize(document.getElementById('3dChart'));
        };
    })
    .catch(error => console.error('Error loading or parsing the CSV file:', error));
