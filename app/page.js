'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function StockScreener() {
  const [settings, setSettings] = useState({
    tickers: [],
    indicatorSettings: {
      apexBullRaging: { isEnabled: false },
      apexBullAppear: { isEnabled: false },
      // apexUptrend: { isEnabled: false },
      // goldenCrossSma: { isEnabled: false, shortSma: 50, longSma: 200 },
      // deathCrossSma: { isEnabled: false, shortSma: 50, longSma: 200 },
      // rsiOverbought: { isEnabled: false, threshold: 70 },
      // rsiOversold: { isEnabled: false, threshold: 30 },
      // macdBullish: { isEnabled: false, shortEma: 12, longEma: 26, signalWindow: 9 },
      // macdBearish: { isEnabled: false, shortEma: 12, longEma: 26, signalWindow: 9 },
      // bollingerSqueeze: { isEnabled: false, window: 20, numStdDev: 2 },
      // bollingerExpansion: { isEnabled: false, window: 20, numStdDev: 2 },
      // bollingerBreakout: { isEnabled: false, window: 20, numStdDev: 2 },
      // bollingerPullback: { isEnabled: false, window: 20, numStdDev: 2 },
      // volumeSpike: { isEnabled: false, window: 20, numStdDev: 2 },
    },
    showWinRate: false,
    showOnlyIfAllSignalsMet: true,
    showOnlyMarketPriceAbove: 20,
    recency: 5,
    x: 20,
  });
  const [totalScreeningCount, setTotalScreeningCount] = useState(0);
  const [currentScreenedCount, setCurrentScreenedCount] = useState(0);
  const [tickerOptions, setTickerOptions] = useState([]);
  const [filteredTickers, setFilteredTickers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [screeningResults, setScreeningResults] = useState([]);

  const [isScreening, setIsScreening] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);


  useEffect(() => {
    // Fetching the list of tickers
    const fetchTickers = async () => {
      try {
        const res = await fetch('/api/fetch-tickers');
        if (!res.ok) throw new Error('Failed to fetch tickers');
        const data = await res.json();
        const tickers = Object.values(data).map(item => item.ticker);
        setTickerOptions(['Everything', ...tickers]);
      } catch (error) {
        console.error('Error fetching tickers:', error);
      }
    };
    fetchTickers();
  }, []);



  // Filtering the tickers based on the search term
  useEffect(() => {
    const filtered = tickerOptions.filter(ticker =>
      ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTickers(filtered);
  }, [searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };


  const handleTickerSelection = (selectedTicker) => {
    console.log('selectedTicker', selectedTicker);
    if (!settings.tickers.includes(selectedTicker)) {
      setSettings(prev => ({
        ...prev,
        tickers: [...prev.tickers, selectedTicker]
      }));
    }
  };

  useEffect(() => {
    if (settings.tickers.length > 0) {
      setSearchTerm('');  // Clear search term after tickers are updated
    }
  }, [settings.tickers]);


  const handleRemoveTicker = (tickerToRemove) => {
    setSettings(prev => ({
      ...prev,
      tickers: prev.tickers.filter(ticker => ticker !== tickerToRemove)
    }));
  };

  const handleIndicatorChange = (indicator) => {
    setSettings(prev => ({
      ...prev,
      indicatorSettings: {
        ...prev.indicatorSettings,
        [indicator]: {
          ...prev.indicatorSettings[indicator],
          isEnabled: !prev.indicatorSettings[indicator].isEnabled
        }
      }
    }));
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  const stopRequest = () => {
    setIsScreening(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Cancel the ongoing request
    }
  };

  const handleScreening = async () => {
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsScreening(true);
    setProgress(0);
    setScreeningResults([]);
    let tickers_to_screen = [];
    if (settings.tickers.includes("Everything")) {
      tickers_to_screen = tickerOptions
    }
    else {
      tickers_to_screen = settings.tickers
    }
    setTotalScreeningCount(tickers_to_screen.length)
    for (let i = 0; i < tickers_to_screen.length; i++) {
      const ticker = tickers_to_screen[i];
      try {
        const response = await fetch('/api/analyze-stock', {
          method: 'POST',
          signal, // Pass the signal to the fetch request
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, settings }),
        });
        const result = await response.json();
        if (result) {
          if (result.dates) {
            const newResult = { ticker, dates: result.dates };
            if (result.winRate) {
              newResult.winRate = result.winRate;
            }
            setScreeningResults(prev => [...prev, newResult]);
          }
        }
      } catch (error) {
        console.error(`Error analyzing ${ticker}:`, error);
      }
      setProgress((i + 1) / tickers_to_screen.length * 100);
      setCurrentScreenedCount(i + 1)
    }

    setIsScreening(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-4">Optilens Stock Screener</h1>
      <h2 className="text-2xl text-center mb-8">Find stocks using technical indicators</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">Select Tickers</h3>
            <Input
              type="text"
              placeholder="Search tickers..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="mb-2"
            />
            {searchTerm && filteredTickers.length > 0 && (
              <ul className="max-h-40 overflow-auto border rounded">
                {filteredTickers.map((ticker) => (
                  <li
                    key={ticker}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleTickerSelection(ticker)}
                  >
                    {ticker}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {settings.tickers.map(ticker => (
                <span key={ticker} className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
                  {ticker}
                  <button onClick={() => handleRemoveTicker(ticker)} className="ml-2 text-red-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">Indicator Settings</h3>
            {Object.entries(settings.indicatorSettings).map(([indicator, { isEnabled }]) => (
              <div key={indicator} className="flex items-center mb-2">
                <Checkbox
                  id={indicator}
                  checked={isEnabled}
                  onCheckedChange={() => handleIndicatorChange(indicator)}
                />
                <label htmlFor={indicator} className="ml-2">
                  {indicator}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent>
          <h3 className="text-lg font-semibold mb-2">Advanced Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Recency (number of days)</label>
              <Input
                type="number"
                value={settings.recency}
                onChange={(e) => handleSettingChange('recency', parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="block mb-2">Show historical win rate</label>
              <Checkbox
                checked={settings.showWinRate}
                onCheckedChange={(checked) => handleSettingChange('showWinRate', checked)}
              />
            </div>
            {settings.showWinRate && (
              <div>
                <label className="block mb-2">Days to look forward</label>
                <Input
                  type="number"
                  value={settings.x}
                  onChange={(e) => handleSettingChange('x', parseInt(e.target.value))}
                  min={1}
                />
              </div>
            )}
            <div>
              <label className="block mb-2">Minimum market price</label>
              <Input
                type="number"
                value={settings.showOnlyMarketPriceAbove}
                onChange={(e) => handleSettingChange('showOnlyMarketPriceAbove', parseFloat(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label className="block mb-2">Show only if all signals are met</label>
              <Checkbox
                checked={settings.showOnlyIfAllSignalsMet}
                onCheckedChange={(checked) => handleSettingChange('showOnlyIfAllSignalsMet', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mt-4">
        <Button onClick={handleScreening} disabled={isScreening}>
          {isScreening ? 'Screening...' : '🔎 Screen'}
        </Button>
        {isScreening && (
          <Button onClick={stopRequest} className="bg-red-500">
            Stop Screening
          </Button>
        )}
      </div>

      {isScreening && (
        <div className="mt-4">
          <Progress value={progress} />
          <p className="text-center mt-2">{`Screened ${currentScreenedCount}/${totalScreeningCount} tickers. ${progress.toFixed(2)}% done`}</p>
        </div>
      )}

      {/* show overall win rate by summing up screeningResults.winRate*/}
      {settings.showWinRate && screeningResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-center">Overall Win Rate (Stock rises {settings.x} days later)</h3>
          <p className="text-center">
            {(
              screeningResults.reduce((acc, result) => acc + (result.winRate || 0), 0) /
              screeningResults.length
            ).toFixed(2)}%
          </p>
        </div>
      )}

      {screeningResults && screeningResults.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Screening Results</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Win Rate (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {screeningResults
                .filter(({ dates }) => {
                  const recencyDate = new Date();
                  recencyDate.setDate(recencyDate.getDate() - settings.recency);
                  return dates.some(date => new Date(date) >= recencyDate);
                })
                .map(({ ticker, dates, winRate }) => (
                  <TableRow key={ticker}>
                    <TableCell>{ticker}</TableCell>
                    <TableCell>{dates.join(', ')}</TableCell>
                    <TableCell>{winRate !== undefined ? winRate.toFixed(2) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}