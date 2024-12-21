document.addEventListener("DOMContentLoaded", function () {
    let selectedStocks = ["AAPL", "GOOG", "AMZN"]; // Sample stock symbols

    const priceActionsBody = document.getElementById("priceActionsBody");
    const stageAnalysisTab = document.getElementById("stage-analysis");
    const chartTab = document.getElementById("3dChart");

    // Function to fetch stock news using Google News RSS feed with CORS proxy
    async function fetchStockNews(stockSymbol) {
        const corsProxy = "https://cors-anywhere.herokuapp.com/"; // Use a CORS proxy
        const rssUrl = `${corsProxy}https://news.google.com/rss/search?q=${stockSymbol}&hl=en-US&gl=US&ceid=US:en`;

        try {
            const response = await fetch(rssUrl);
            const contentType = response.headers.get("Content-Type");

            if (!contentType || !contentType.includes("xml")) {
                console.error(`Response is not XML for ${stockSymbol}:`, contentType);
                const rawText = await response.text();
                console.error("Raw Response:", rawText);
                return [];
            }

            const xml = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "application/xml");

            const error = xmlDoc.querySelector("parsererror");
            if (error) {
                console.error(`Error parsing XML for ${stockSymbol}:`, error.textContent);
                return [];
            }

            // Extract news items
            const items = xmlDoc.querySelectorAll("item");
            let articles = [];
            items.forEach(item => {
                articles.push({
                    title: item.querySelector("title").textContent,
                    link: item.querySelector("link").textContent,
                    description: item.querySelector("description").textContent
                });
            });

            return articles;
        } catch (error) {
            console.error(`Error fetching the RSS feed for ${stockSymbol}:`, error);
            return [];
        }
    }

    // Function to update the priceActionsBody with news articles
    async function updatePriceActionsBody() {
        priceActionsBody.innerHTML = "";

        if (selectedStocks.length === 0) {
            priceActionsBody.innerHTML = "No stocks selected.";
            return;
        }

        for (const stock of selectedStocks) {
            console.log(`Fetching news for stock: ${stock}`);
            const newsArticles = await fetchStockNews(stock);

            if (newsArticles.length === 0) {
                priceActionsBody.innerHTML += `<div>No news available for ${stock}</div>`;
            } else {
                priceActionsBody.innerHTML += `<h2>Top News for ${stock}</h2>`;
                newsArticles.forEach(article => {
                    priceActionsBody.innerHTML += `
                        <div class="news-article">
                            <h3><a href="${article.link}" target="_blank">${article.title}</a></h3>
                            <p>${article.description}</p>
                        </div>
                    `;
                });
            }
        }
    }

    // Add event listener for the "Stage Analysis" tab
    stageAnalysisTab.addEventListener("click", function () {
        console.log("Stage Analysis tab clicked.");
        updatePriceActionsBody(); // Fetch and display the news for selected stocks
        stageAnalysisTab.classList.add("active");
        chartTab.classList.remove("active");
    });

    // Add event listener for the "3D Chart" tab
    chartTab.addEventListener("click", function () {
        console.log("3D Chart tab clicked.");
        priceActionsBody.innerHTML = "3D chart will be displayed here.";
        chartTab.classList.add("active");
        stageAnalysisTab.classList.remove("active");
    });

    // Set default active tab
    stageAnalysisTab.classList.add("active");
});
