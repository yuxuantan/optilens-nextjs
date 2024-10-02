
function calculateSMA(stockData, periods = [20, 50, 200]) {
  // Helper function to calculate SMA for a given period
  function calculateSMAForPeriod(data, period) {
    return data.map((entry, index, arr) => {
      if (index < period - 1) return null; // Skip the first few entries
      const sum = arr.slice(index - period + 1, index + 1).reduce((acc, curr) => acc + curr.Close, 0);
      return sum / period;
    });
  }

  // Add SMAs for each period to the stockData
  periods.forEach(period => {
    const smaValues = calculateSMAForPeriod(stockData, period);
    stockData.forEach((entry, index) => {
      entry[`SMA_${period}`] = smaValues[index];
    });
  });

  return stockData;
}

function get2DayAggregatedData(data) {
  // Check if the data array is empty
  if (!data || data.length === 0) return [];

  // Convert the date string to Date objects for easier grouping by year
  data.forEach(d => d.Date = new Date(d.date));

  // Group data by year
  const yearlyData = data.reduce((acc, curr) => {
    const year = curr.Date.getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(curr);
    return acc;
  }, {});

  // Process each year's data separately
  const aggregatedDataList = [];

  for (const year in yearlyData) {
    const yearly = yearlyData[year];
    const aggregatedYearData = [];

    for (let i = 0; i < yearly.length; i += 2) {
      // Handle 2-day aggregation (using one or two days depending on availability)
      const day1 = yearly[i];
      const day2 = yearly[i + 1] || day1; // If there's no next day, use the current day twice

      const aggregated = {
        Date: day1.Date,
        High: Math.max(day1.high, day2.high),
        Low: Math.min(day1.low, day2.low),
        Open: day1.open,
        Close: day2.close
      };

      aggregatedYearData.push(aggregated);
    }

    // Append the current year's aggregated data
    aggregatedDataList.push(...aggregatedYearData);
  }
  // Return the combined data across all years
  return aggregatedDataList;
}

/**
 * Function to find low inflexion points in stock data.
 * A low inflexion point occurs when the "Low" value forms a "U" or "V" shape
 * where T-1 Low > T Low < T+1 Low, and T-2 Low > T Low < T+2 Low.
 *
 * @param {DataFrame} data - A pandas-like DataFrame object where `Low` is a key column.
 * @returns {Array} An array of tuples, where each tuple contains the date of the inflexion point and its corresponding low value.
 */
function getLowInflexionPoints(data) {
  const allLowInflexionPoints = [];

  // Check edge cases
  if (!data || data.length < 5) return allLowInflexionPoints;

  // Loop through data to find inflexion points
  for (let i = 2; i < data.length - 2; i++) {
    const currentLow = data[i]["Low"];
    if (
      data[i - 1]["Low"] > currentLow &&
      data[i + 1]["Low"] > currentLow &&
      data[i - 2]["Low"] > currentLow &&
      data[i + 2]["Low"] > currentLow
    ) {
      allLowInflexionPoints.push({ date: data[i].Date, low: currentLow });
    }
  }

  return allLowInflexionPoints;
}



/**
 * Find valid bear traps in a list of potential traps.
 *
 * @param {Array} potentialTraps - An array of tuples, where each tuple contains the date and low value of a potential trap (e.g., [{ date: '2022-01-01', low: 95 }, ...]).
 * @param {string} fromDate - The starting date string in the format 'YYYY-MM-DD'.
 * @param {string} toDate - The ending date string in the format 'YYYY-MM-DD'.
 * @returns {Array} An array of valid bear traps filtered and validated by the criteria.
 */
function findBearTraps(potentialTraps, fromDate, toDate) {
  const bearTraps = [];

  // Convert date strings to Date objects for easier comparison
  const from = new Date(fromDate);
  const to = new Date(toDate);

  // Filter traps to include only those within the date range
  const bearTrapsUpToDate = potentialTraps.filter(
    (trap) => new Date(trap.date) >= from && new Date(trap.date) <= to
  );

  // Validate each trap
  for (const { date, low } of bearTrapsUpToDate) {
    // Check for post-bear traps with lower lows within the same date range
    const postBearTrapLows = bearTrapsUpToDate
      .filter((trap) => new Date(trap.date) > new Date(date) && new Date(trap.date) <= to)
      .map((trap) => trap.low);

    // If any of the post-bear traps have a lower low, this trap is invalidated
    if (postBearTrapLows.some((postLow) => postLow < low)) continue;

    // Valid bear trap
    bearTraps.push({ date, low });
  }

  return bearTraps;
}
export { calculateSMA, get2DayAggregatedData, getLowInflexionPoints, findBearTraps };