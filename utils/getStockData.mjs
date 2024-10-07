import yahooFinance from 'yahoo-finance2';

// Fetch stock data
const convertToHistoricalResult = (
    result
) => {
    return result.quotes
        .map((quote) => ({
            ...quote,
            // date: quote.date.toISOString().split('T')[0],
            open: quote.open || null,
            high: quote.high || null,
            low: quote.low || null,
            close: quote.close || null,
            volume: quote.volume || null,
        }))
        .filter(
            (dailyQuote) => dailyQuote.low !== null || dailyQuote.high !== null
        );
};

export async function fetchStockData(ticker = 'AAPL') {
    const from = '1950-01-01'
    const to = new Date().toISOString().split('T')[0];
    const data = await yahooFinance.chart(
        ticker,
        {
            interval: '1d',
            period1: from,
            period2: to
        }
    )
    return convertToHistoricalResult(data);
}