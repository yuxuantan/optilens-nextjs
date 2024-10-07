
import { calculateSMA, get2DayAggregatedData, getLowInflexionPoints, getHighInflexionPoints, findBearTraps, findLowestBearTrapWithinPriceRange } from "./indicator_helpers.js";
function getApexBullAppearDates(data, showWinRate = true) {

    let aggregatedData = get2DayAggregatedData(data);
    
    // Calculate Simple Moving Averages (SMA)
    aggregatedData = calculateSMA(aggregatedData, [20, 50, 200]);

    if (!showWinRate) {
        aggregatedData = aggregatedData.slice(-30); // Limit the data to a configurable value
    }
    
    // Condition: Find dates where the high of the current day is lower than the high of the previous day, and the low is higher
    const condition = aggregatedData.map((obj, idx) =>
        idx > 0 && obj.High < aggregatedData[idx - 1].High && obj.Low > aggregatedData[idx - 1].Low
    );
    const wallabyDates = aggregatedData.map((obj) => obj.Date).filter((_, idx) => condition[idx]);
    let bullAppearDates = [];
    const potentialBearTraps = getLowInflexionPoints(aggregatedData);
    for (let i = 0; i < wallabyDates.length; i++) {
        const date = wallabyDates[i];
        //console.log('inspecting wallaby date', date);
        const wallabyPos = aggregatedData.findIndex(obj => obj.Date === date);
        
        if (wallabyPos === -1) {
            //console.log('Date not found in aggregatedData:', date);
            continue;
        } const kangarooPos = wallabyPos - 1;

        const startIndex = Math.max(0, wallabyPos - 126);
        const endIndex = kangarooPos - 1;
        const activeBearTraps = findBearTraps(
            potentialBearTraps,
            aggregatedData[startIndex]?.Date,
            aggregatedData[endIndex]?.Date
        );
        // //console.log(activeBearTraps)
        if (!activeBearTraps.length) continue;

        let anyBarWentBelowKangaroo = false;
        let bullishBarWentBackUpToRange = false;


        // Condition 1: 200 SMA should slope upwards
        if (
            kangarooPos + 5 < aggregatedData.length &&
            aggregatedData[kangarooPos].SMA_200 > aggregatedData[kangarooPos + 5].SMA_200
        ) {
            //console.log('200 SMA is not sloping upwards');
            continue;
        }


        // Condition 2: Should be above 50 SMA (roughly)
        if (aggregatedData[kangarooPos].Low <= aggregatedData[kangarooPos].SMA_50) {
            //console.log('not above 50 SMA');
            //console.log('aggregatedData[kangarooPos].Low', aggregatedData[kangarooPos].Low);
            //console.log('aggregatedData[kangarooPos].SMA_50', aggregatedData[kangarooPos].SMA_50);
            continue;
        }
        // Check the next 4 trading dates from wallaby date
        let potentialBullAppearDate = null;
        for (let i = 1; i < 5; i++) {
            const targetPos = wallabyPos + i;
            if (targetPos >= aggregatedData.length) {
                //console.log('targetPos is out of bounds');
                break;
            }

            const currData = aggregatedData[targetPos];
            potentialBullAppearDate = aggregatedData[targetPos].Date;
            //console.log('interating 4 trading dates..', potentialBullAppearDate);
            if (currData.High > aggregatedData[kangarooPos].High) {
                //console.log('found a bar that went above kangaroo');
                //console.log('currData.High', currData.High);
                //console.log('aggregatedData[kangarooPos].High', aggregatedData[kangarooPos].High);
                break;
            }

            if (
                !anyBarWentBelowKangaroo &&
                currData.Low < aggregatedData[kangarooPos].Low
            ) {
                //console.log('found a bar that went below kangaroo');
                anyBarWentBelowKangaroo = true;
            }


            if (
                anyBarWentBelowKangaroo &&
                !bullishBarWentBackUpToRange &&
                aggregatedData[kangarooPos].Low <= currData.Close &&
                currData.Close <= aggregatedData[kangarooPos].High
            ) {
                if (
                    (currData.Open > currData.Low + (4 / 5) * (currData.High - currData.Low) &&
                        currData.Close > currData.Low + (4 / 5) * (currData.High - currData.Low)) ||
                    currData.Close - currData.Open > 0.5 * (currData.High - currData.Low)
                ) {
                    bullishBarWentBackUpToRange = true;
                    //console.log('found a bullish bar that went back up to range');
                    break;
                }
            }
        }


        if (!anyBarWentBelowKangaroo || !bullishBarWentBackUpToRange) continue;

        // Condition 4: active bear trap must be taken between K-1 and K+5
        // OR if K-K+5 touches 20sma, 50 sma, or 200 sma from below
        for (let i = 0; i < 6; i++) {
            const currPos = endIndex + i;
            if (currPos >= aggregatedData.length) break;
            const currData = aggregatedData[currPos];
            if (currData.Date > potentialBullAppearDate){
                // cut if current date to check for trap/sma is > bull appear date. need to be before
                //console.log('curr iteration is after potential bullAppearDate');
                break;
            }
            if (activeBearTraps.some(trap => trap[1] > currData.Low && trap[1] < currData.High)) {
                //console.log('active bear trap taken');
            } else if (
                // touches one of the sma
                i > 0 &&
                ((currData.Low <= aggregatedData[currPos].SMA_20 && aggregatedData[currPos].SMA_20 <= currData.High) ||
                    (currData.Low <= aggregatedData[currPos].SMA_50 && aggregatedData[currPos].SMA_50 <= currData.High) ||
                    (currData.Low <= aggregatedData[currPos].SMA_200 && aggregatedData[currPos].SMA_200 <= currData.High))
            ) {
                //console.log('touches sma');
                //console.log('currData.Low', currData.Low);
                //console.log('currData.High', currData.High);
                //console.log('aggregatedData[currPos].SMA_20', aggregatedData[currPos].SMA_20);
                //console.log('aggregatedData[currPos].SMA_50', aggregatedData[currPos].SMA_50);
                //console.log('aggregatedData[currPos].SMA_200', aggregatedData[currPos].SMA_200);
            }
            else {
                continue;
            }

            //console.log('✅bull appear')
            bullAppearDates.push(potentialBullAppearDate);
            break;
        }

    };
    return bullAppearDates;
}

function getApexBullRagingDates(data, showWinRate = true) {
    data = get2DayAggregatedData(data);
    if (!showWinRate) {
      data = data.slice(-210);  // TODO: make this configurable
    }
  
    const highInflexionPoints = getHighInflexionPoints(data);
    const potentialBearTraps = getLowInflexionPoints(data);
    let futureBearTraps = [...potentialBearTraps];
  
    const bullRagingDates = [];
    highInflexionPoints.forEach(({ date: highPointDate, high: highPointValue }) => {
        if (!data.some(row => row.date === highPointDate)) {
            return;
        }
  
      // Find the stopping point (which is the next bear trap)
      const stoppingPointDate = futureBearTraps.find(
        ([trapDate, trapValue]) => trapDate > highPointDate && trapValue < highPointValue
      )?.[0] || data[data.length - 1].date;
  
      futureBearTraps = futureBearTraps.filter(([trapDate]) => trapDate >= highPointDate);
  
      const previousBearTrap = findLowestBearTrapWithinPriceRange(
        potentialBearTraps,
        highPointDate,
        data.find(row => row.date === stoppingPointDate).Low,
        highPointValue
      );
  
      if (!previousBearTrap) {
        return;
      }
  
      const midPoint = previousBearTrap[1] + (highPointValue - previousBearTrap[1]) / 2;
  
      // Analyze the range from high point to stopping point
      const rangeData = data.filter(row => row.date >= highPointDate && row.date <= stoppingPointDate);
      const flushDownBars = rangeData.filter(
        row => (row.Open - row.Close) > 0.7 * (row.High - row.Low)
      );
  
      if (flushDownBars.length === 0 || flushDownBars[0].High < midPoint) {
        return;
      }
  
      // Find the date which broke below bear trap
      const breakBelowBearTrap = rangeData.find(row => row.Low < previousBearTrap[1]);
      if (!breakBelowBearTrap) {
        return;
      }
      const dateWhichBrokeBelowBearTrap = breakBelowBearTrap.date;
  
      const totalBarCount = rangeData.length;
      const flushDownCount = flushDownBars.length;
      if (totalBarCount < 5 || flushDownCount / totalBarCount < 0.3) {
        return;
      }
  
      // Check 6 bars after break below bear trap
      const postBreakData = data.filter(row => row.date >= dateWhichBrokeBelowBearTrap).slice(0, 6);
      for (const row of postBreakData) {
        if (
          row.Close > previousBearTrap[1] &&
          (
            row.Close - row.Open > 0.5 * (row.High - row.Low) ||
            (row.Open > row.Low + (4 / 5) * (row.High - row.Low) && row.Close > row.Low + (4 / 5) * (row.High - row.Low))
          )
        ) {
          bullRagingDates.push(row.date);
          break;
        }
      }
    });
  
    return bullRagingDates;
  }
  

export { getApexBullAppearDates, getApexBullRagingDates };