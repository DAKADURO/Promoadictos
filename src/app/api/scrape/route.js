import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Helper function to resolve the target URL of any meli.la redirect
async function resolveUrl(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    return res.url;
  } catch (err) {
    console.error("Resolve URL error:", err);
    return url;
  }
}

// Helper function to parse JSON state inside script tags via brace matching
function extractNordicState(html) {
  const scriptMatch = html.match(/<script id="__NORDIC_RENDERING_CTX__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;

  const scriptContent = scriptMatch[1].trim();
  const jsonStart = scriptContent.indexOf("{");
  if (jsonStart === -1) return null;

  let braceCount = 0;
  let jsonEnd = -1;
  let inString = false;
  let escape = false;

  for (let i = jsonStart; i < scriptContent.length; i++) {
    const char = scriptContent[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
  }

  if (jsonEnd === -1) return null;

  try {
    return JSON.parse(scriptContent.substring(jsonStart, jsonEnd + 1));
  } catch (e) {
    console.error("Failed to parse Nordic JSON state:", e.message);
    return null;
  }
}

// Recursively find specific components in the parsed state object
function findComponents(obj, result = { title: null, price: null, originalPrice: null, discount: null }) {
  if (!obj || typeof obj !== "object") return result;

  if (Array.isArray(obj.components)) {
    for (const comp of obj.components) {
      if (comp.type === "title" && comp.title?.text) {
        result.title = comp.title.text;
      }
      if (comp.type === "price" && comp.price) {
        result.price = comp.price.current_price?.value || result.price;
        result.originalPrice = comp.price.previous_price?.value || result.originalPrice;
        result.discount = comp.price.discount?.value || result.discount;
      }
    }
  }

  for (const key of Object.keys(obj)) {
    findComponents(obj[key], result);
  }

  return result;
}

export async function GET(req) {
  // 1. Secure authorization check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    // 2. Resolve meli.la redirect if applicable
    let resolvedUrl = targetUrl;
    if (targetUrl.includes("meli.la")) {
      resolvedUrl = await resolveUrl(targetUrl);
    }

    console.log("Scraping URL:", resolvedUrl);

    // A. Handle Social / Creator pages
    if (resolvedUrl.includes("/social/")) {
      const res = await fetch(resolvedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const html = await res.text();

      // Extract image URL from meta tags
      const imageMatch = html.match(/<meta\s+name="image"\s+content="([^"]+)"/) || html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
      const imageUrl = imageMatch ? imageMatch[1] : "";

      // Extract details from Nordic State JSON
      const state = extractNordicState(html);
      let details = { title: "", price: null, originalPrice: null, discount: null };
      if (state) {
        details = findComponents(state);
      }

      // If no title was found via state, fall back to meta tag
      if (!details.title) {
        const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/) || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
        details.title = titleMatch ? titleMatch[1] : "";
      }

      return NextResponse.json({
        success: true,
        title: details.title,
        price: details.price,
        originalPrice: details.originalPrice,
        discount: details.discount,
        imageUrl: imageUrl,
        affiliateUrl: targetUrl, // Keep original meli.la affiliate link
      });
    }

    // B. Handle Direct Product pages
    const mlmMatch = resolvedUrl.match(/(MLM-?[0-9]+)/i);
    if (mlmMatch) {
      const itemId = mlmMatch[1].replace("-", ""); // Format MLM123456789
      console.log("Extracted Item ID:", itemId);

      const apiRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
      if (!apiRes.ok) {
        return NextResponse.json({ error: "Failed to fetch item from Mercado Libre API" }, { status: apiRes.status });
      }

      const item = await apiRes.json();

      // Get high res image
      const imageUrl = item.pictures && item.pictures.length > 0
        ? item.pictures[0].secure_url || item.pictures[0].url
        : item.thumbnail;

      // Extract original price or current price
      const price = item.price;
      const originalPrice = item.original_price || null;
      let discount = null;

      if (originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      return NextResponse.json({
        success: true,
        title: item.title,
        price: price,
        originalPrice: originalPrice,
        discount: discount,
        imageUrl: imageUrl,
        affiliateUrl: targetUrl, // Use original URL
      });
    }

    return NextResponse.json({ error: "Unsupported Mercado Libre URL format" }, { status: 400 });

  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: "Internal scraper error", details: error.message }, { status: 500 });
  }
}
