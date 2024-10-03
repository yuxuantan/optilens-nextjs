// API route handler
import { getApexBullAppearDates } from '../../../utils/indicators';
import { fetchStockData } from '../../../utils/getStockData';

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
        if (body.apexBullAppearDates) {
            dates = body.apexBullAppearDates[0];
            console.log('Using cached dates ', dates);
        }
        else{
            dates = getApexBullAppearDates(data, settings.showWinRate);
            console.log('Using calculated dates');
        }
    }

    if (settings.showWinRate) {
        console.log('Calculating win rate');
        // date pool that is more than x days before the current date using settings.x
        let xCutoffDate = new Date();
        xCutoffDate.setDate(xCutoffDate.getDate() - settings.x);

        let date_pool = dates.filter((date) => new Date(date) < xCutoffDate && new Date(date) <= new Date());
        console.log('date_pool', date_pool);
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
        console.log('Win rate:', winRate);
        return new Response(JSON.stringify({ dates, winRate }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }


    return new Response(JSON.stringify({ dates }), {
        headers: { 'Content-Type': 'application/json' }
    });
}



