// API route handler
import yahooFinance from 'yahoo-finance2';
import { getApexBullAppearDates } from '../../../utils/indicators';

// Fetch stock data
const convertToHistoricalResult = (
    result
) => {
    return result.quotes
        .map((quote) => ({
            ...quote,
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

async function fetchStockData(ticker = 'AAPL') {
    try {
        const from = '1950-01-01'
        const to = new Date().toISOString().split('T')[0];
        // const data = await yahooFinance.historical(ticker, { period, interval });
        const data = await yahooFinance.chart(
            ticker,
            {
                interval: '1d',
                period1: from,
                period2: to
            }
        )

        return convertToHistoricalResult(data);
    } catch (error) {
        console.error(`Failed to fetch data for ${ticker}:`, error);
        return null;
    }
}

export async function POST(request) {
    // get request body
    const body = await request.json();
    const ticker = body.ticker;
    const settings = body.settings;

    const data = await fetchStockData(ticker);
    // get settings.indicator_settings where isEnabled is true
    const enabledIndicators = Object.keys(settings.indicatorSettings).filter(
        (indicator) => settings.indicatorSettings[indicator].isEnabled
    );

    let dates = []
    // if apexBullRaging is enabled, calculate it
    if (enabledIndicators.includes('apexBullAppear')) {
        dates = getApexBullAppearDates(data, settings.showWinRate);
    }

    if (settings.showWinRate) {
        // date pool that is more than x days before the current date using settings.x
        let xCutoffDate = new Date();
        xCutoffDate.setDate(xCutoffDate.getDate() - settings.x);

        let date_pool = dates.filter((date) => new Date(date) < xCutoffDate && new Date(date) <= new Date());
        // add the win rate x trading days after the date
        date_pool = date_pool.map((date) => {
            const dateIndex = data.findIndex((entry) => new Date(entry.date).getTime() === new Date(date).getTime());
            if (dateIndex !== -1 && data[dateIndex + settings.x]) {
                const increasedPrice = data[dateIndex + settings.x].close > data[dateIndex].close;
                return { date, increasedPrice };
            }
            return { date, increasedPrice: false };
        });


        // calculate win rate
        const winRate = date_pool.filter((entry) => entry.increasedPrice).length / date_pool.length * 100;
        return new Response(JSON.stringify({ dates, winRate }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }


    return new Response(JSON.stringify({ dates }), {
        headers: { 'Content-Type': 'application/json' }
    });
}



