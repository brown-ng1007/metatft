export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
  
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    const queue = req.query.queue || '1100';
    const type = req.query.type || 'comps';
  
    let targetUrl = `https://api-hc.metatft.com/tft-comps-api/comps_data?queue=${queue}`;
    if (type === 'lookups') {
      targetUrl = 'https://data.metatft.com/lookups/TFTSet18_latest_en_us.json';
    }
  
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
          'Referer': 'https://www.metatft.com/',
          'Origin': 'https://www.metatft.com'
        }
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch MetaTFT data' });
    }
  }