// Define global stock names
// const stockNames = ['AAPL', 'TSLA', 'GOOGL']; // Example stock symbols

// Variable to decide how many top news to display per stock (default is 5)
const topNewsCount = 5; // Change this value to display more or fewer news articles

// Alpha Vantage API details
const apiKey = "K8XL50GZRBUD8ZD2"; // Replace with your Alpha Vantage API key
const apiBase = "https://www.alphavantage.co/query";

// Function to fetch stock-related news from Alpha Vantage
async function fetchStockNews(symbol) {
    const url = `${apiBase}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}`;
    console.log(`Fetching news for symbol: ${symbol}`); // Debug: Check symbol being fetched
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching news for ${symbol}: ${response.status}`);
        }
        const data = await response.json();
        console.log(`News fetched for ${symbol}:`, data); // Debug: Check API response
        return data.feed || [];
    } catch (error) {
        console.error(`Error in fetchStockNews for ${symbol}:`, error);
        return [];
    }
}

// Function to display results on the webpage
function displayResults(symbol, news) {
    const container = document.getElementById('priceActionsBody');
    if (!container) {
        console.error("No container element found with ID 'priceActionsBody'"); // Debug: Handle missing container
        return;
    }
    
    const symbolDiv = document.createElement('div');
    symbolDiv.innerHTML = `<h3>Latest News for ${symbol}:</h3>`;

    if (news.length === 0) {
        console.log(`No news found for ${symbol}`); // Debug: Log when no news is found
        symbolDiv.innerHTML += `<p>No news found for ${symbol}.</p>`;
    } else {
         // Limit the number of news articles to topNewsCount
        news.slice(0, topNewsCount).forEach(article => {
            const articleItem = document.createElement('div');
            articleItem.classList.add('news-article');
            
            // Access the correct fields for source domain and sentiment label
            const sourceDomain = article.source || 'Unknown Source';
            const sentimentLabel = article['overall_sentiment_label'] || 'No sentiment data';

            // Display the source domain, sentiment label, and title
            articleItem.innerHTML = `
                <p><strong>Source:</strong> ${sourceDomain}</p>
                <p><strong>Sentiment:</strong> ${sentimentLabel}</p>
                <h4><a href="${article.url}" target="_blank">${article.title}</a></h4>
            `;
            symbolDiv.appendChild(articleItem);
        });
    }
    container.appendChild(symbolDiv);
}

// Function to search selected stocks and update the page
// Function to search selected stocks and update the page
async function searchStocks() {
    const priceActionsBody = document.getElementById('priceActionsBody');
    
    // Loop through the selectedStocks array and fetch news for each stock
    for (const stock of window.selectedStocks) {
        // Clean up stock symbol by removing any characters after the first period (including the period)
        const cleanedSymbol = stock.replace(/\..*/, '');  // Removes everything after the first period
        console.log(`Searching for news on stock: ${cleanedSymbol}`); // Debug: Log cleaned symbol
        
        const news = await fetchStockNews(cleanedSymbol);  // Fetch news with cleaned symbol
        displayResults(cleanedSymbol, news);  // Display the news for the cleaned symbol
    }
}

// Run the search when the page loads
document.addEventListener('DOMContentLoaded', () => {
    searchStocks();
});