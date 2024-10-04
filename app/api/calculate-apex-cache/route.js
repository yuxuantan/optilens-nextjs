// TODO: to speed up, calculate with subset of dates (30 days), then append instead of calculating all dates
// API route handler
import { getApexBullAppearDates, getApexBullRagingDates } from '../../../utils/indicators';
import { fetchStockData } from '../../../utils/getStockData';
import { supabase } from "../../supabaseClient";
import secCompanyTickers from '../../../data/sec_company_tickers.json';

export const dynamic = 'force-dynamic'

export async function GET() {
    // fetch all tickers from GET /fetch-tickers
    // const res = await fetch('https://www.sec.gov/files/company_tickers.json');
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        cache: "no-store" // no-cache
    });

    let get_all_tickers_resp;
    // const res = await fetch('/api/fetch-tickers');
    if (!res.ok) {
        console.error('Error fetching tickers:', res.statusText);
        get_all_tickers_resp = secCompanyTickers;
    }
    else {
        get_all_tickers_resp = await res.json();
    }
    const tickers = Object.values(get_all_tickers_resp).map(item => item.ticker);
    // const tickers = ["AAPL", "NVDA", "TSLA", "AMZN", "GOOGL", "MSFT", "FB", "NFLX", "AMD", "INTC"];

    // fetch bull appear data
    const { data: bullAppearData, error: bullAppearError } = await supabase
        .from('apex_bull_appear')
        .select()
    if (bullAppearError) {
        console.error('Error fetching bull appear results:', error);
        return;
    }
    // filter out those that has recently been created
    const currentDate = new Date();
    const fiveAMSGT = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 5, 0, 0);

    const bullAppearDataWithValidDates = bullAppearData.filter(item =>
        item.analysis &&
        item.latestClosePrice &&
        item.analysis["1D_vol"] &&
        new Date(item.created_at) > fiveAMSGT
    );


    console.log('Bull appear data with valid dates:', bullAppearDataWithValidDates.length);
    const tickersToCalculate = tickers.filter(ticker => !bullAppearDataWithValidDates.some(item => item.ticker === ticker));
    console.log('Tickers to calculate:', tickersToCalculate.length);





    // for each ticker, get stock data for each ticker
    for (const ticker of tickersToCalculate) {
        console.log('⭐️ Calculating apex bull appear dates for', ticker);

        // delete record from db table for those that i need to calculate
        const response = await supabase
            .from('apex_bull_appear')
            .delete()
            .eq('ticker', ticker) // TOO large
        if (response.error) {
            console.error('Error deleting apex bull appear results:', response.error);
            return;
        }
        else {
            console.log('Deleted apex bull appear results for tickers:', ticker);
        }

        let stockData;
        let attempts = 0;
        const maxAttempts = 3;
        const retryDelay = 10 * 60 * 1000; // 10 minutes in milliseconds

        let skip = false;
        while (attempts < maxAttempts) {
            try {
                stockData = await fetchStockData(ticker);
                // console.log(stockData.slice(0, 2));
                break; // exit loop if fetch is successful
            } catch (error) {
                // if error has "No data found, symbol may be delisted" message, break out of 2 loops
                if (!error.message.includes('Too Many Requests')) {
                    console.error(`No data found for ${ticker}. Skipping...`);
                    skip = true;
                    break;
                }
                attempts++;
                console.error(`Error fetching stock data for ${ticker}, attempt ${attempts} of ${maxAttempts}:`, error);
                if (attempts < maxAttempts) {
                    console.log(`Retrying in 10 minutes...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    console.error(`Failed to fetch stock data for ${ticker} after ${maxAttempts} attempts.`);
                    return new Response(JSON.stringify({ message: `Failed to fetch stock data for ${ticker}` }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 500
                    });
                }


            }
        }
        if (skip) {
            continue;
        }

        // ******* BULL APPEAR
        // use indicators.js to calculate the bull appear dates -> dictionary of ticker to dates
        const bullAppearDates = getApexBullAppearDates(stockData);
        let analysisResultBullAppear = getAnalysisResults(bullAppearDates);
        
        // write the dates to the cache db
        const { error } = await supabase
            .from('apex_bull_appear')
            .insert({ ticker: ticker, analysis: analysisResultBullAppear, latestClosePrice: stockData[stockData.length - 1]?.close.toFixed(2) })
        if (error) {
            console.error('Error fetching bull appear results:', error);
            return;
        }
        else {
            console.log('Inserted apex bull appear results for ticker:', ticker);
        }

        // ******* BULL RAGING
        const bullRagingDates = getApexBullRagingDates(stockData);
        let analysisResultBullRaging = getAnalysisResults(bullRagingDates);

        // write the dates to the cache db
        const { error2 } = await supabase
            .from('apex_bull_raging')
            .insert({ ticker: ticker, analysis: analysisResultBullRaging, latestClosePrice: stockData[stockData.length - 1]?.close.toFixed(2) })
        if (error) {
            console.error('Error fetching bull appear results:', error);
            return;
        }
        else {
            console.log('Inserted apex bull appear results for ticker:', ticker);
        }
    }
    // return a response success msg
    return new Response(JSON.stringify({ message: 'Success' }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function getAnalysisResults(dates){
    let analysisResult = {};
    for (const date of dates) {
        console.log('Calculating change for date:', date);
        const dateIndex = stockData.findIndex((entry) => {
            const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
            const dateObj = new Date(date).setHours(0, 0, 0, 0);
            return entryDate === dateObj;
        });
        console.log(dateIndex);
        const dateSimple = new Date(bullAppearDate).toISOString().split('T')[0];
        analysisResult[bullAppearDateSimple] = {};
        if (dateIndex !== -1) {
            analysisResult[dateSimple].change1TD = (stockData[dateIndex + 1] && stockData[dateIndex]) ? ((stockData[dateIndex + 1].close - stockData[dateIndex].close) / stockData[dateIndex].close) * 100 : null;
            analysisResult[dateSimple].change5TD = (stockData[dateIndex + 5] && stockData[dateIndex]) ? ((stockData[dateIndex + 5].close - stockData[dateIndex].close) / stockData[dateIndex].close) * 100 : null;
            analysisResult[dateSimple].change20TD = (stockData[dateIndex + 20] && stockData[dateIndex]) ? ((stockData[dateIndex + 20].close - stockData[dateIndex].close) / stockData[dateIndex].close) * 100 : null;
            analysisResult[dateSimple].volume = stockData[dateIndex].volume;
        }
    }
    return analysisResult;
}