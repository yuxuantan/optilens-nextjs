// app/api/fetch-tickers/route.js
export const experimental_ppr = true

export async function GET() {
    try {
      const response = await fetch('https://www.sec.gov/files/company_tickers.json');
      if (!response.ok) {
        return new Response('Error fetching data', { status: response.status });
      }
      const data = await response.json();
  
      // Return a new JSON Response
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
  