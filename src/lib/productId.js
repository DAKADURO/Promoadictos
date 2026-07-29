// Shared product-id extraction used to dedupe offers across the DB.
// Kept separate from scraper.js so jobs that only need dedup (not scraping)
// can import it without pulling in the full scraper.
export function extractProductId(url) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();

  // Mercado Libre item ID (e.g., MLM-1234567890 or MLM1234567890)
  const mlMatch = lowerUrl.match(/mlm-?[0-9]+/);
  if (mlMatch) {
    return mlMatch[0].replace("-", ""); // Normalize to MLM1234567890
  }

  // Amazon ASIN (10-character alphanumeric, e.g. B0XXXXXXXX)
  const amzMatch = lowerUrl.match(/\/dp\/([a-z0-9]{10})/i) || lowerUrl.match(/\/gp\/product\/([a-z0-9]{10})/i);
  if (amzMatch) {
    return amzMatch[1].toUpperCase();
  }

  return lowerUrl.trim();
}
