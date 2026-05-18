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

// Recursively find the highlighted recommended product ID on a creator/social page
function findFeaturedProductId(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj.polycards) && obj.polycards.length > 0) {
    const firstCard = obj.polycards[0];
    if (firstCard.metadata && firstCard.metadata.id) {
      return firstCard.metadata.id;
    }
  }

  for (const key of Object.keys(obj)) {
    const id = findFeaturedProductId(obj[key]);
    if (id) return id;
  }

  return null;
}

// Recursively find the exact highlighted recommended product details from the state polycard
function findFeaturedProductDetails(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj.polycards) && obj.polycards.length > 0) {
    const firstCard = obj.polycards[0];
    const details = { title: "", price: null, originalPrice: null, discount: null, categoryId: null };

    if (firstCard.metadata && firstCard.metadata.category_id) {
      details.categoryId = firstCard.metadata.category_id;
    }

    if (Array.isArray(firstCard.components)) {
      for (const comp of firstCard.components) {
        if (comp.type === "title" && comp.title?.text) {
          details.title = comp.title.text;
        }
        if (comp.type === "price" && comp.price) {
          details.price = comp.price.current_price?.value || null;
          details.originalPrice = comp.price.previous_price?.value || null;
          details.discount = comp.price.discount?.value || null;
        }
      }
    }

    if (details.title || details.price) {
      return details;
    }
  }

  for (const key of Object.keys(obj)) {
    const details = findFeaturedProductDetails(obj[key]);
    if (details) return details;
  }

  return null;
}

// Fetch category path from root from the official Mercado Libre categories API
async function getMercadoLibreCategoryPath(categoryId) {
  if (!categoryId) return { name: "", path: [] };
  try {
    const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}`);
    if (res.ok) {
      const data = await res.json();
      const name = data.name || "";
      const path = Array.isArray(data.path_from_root) ? data.path_from_root.map(p => p.name) : [];
      return { name, path };
    }
  } catch (err) {
    console.error("Error fetching ML category path:", err);
  }
  return { name: "", path: [] };
}

// Classify category intelligently based on title, category name, and entire path
function classifyCategory(title, categoryName, categoryPath) {
  const pathStr = Array.isArray(categoryPath) ? categoryPath.join(" ") : "";
  const searchText = `${title} ${categoryName || ""} ${pathStr}`.toLowerCase();

  // 1. Gaming
  if (
    searchText.includes("gaming") ||
    searchText.includes("gamer") ||
    searchText.includes("nintendo") ||
    searchText.includes("switch") ||
    searchText.includes("playstation") ||
    searchText.includes("xbox") ||
    searchText.includes("ps5") ||
    searchText.includes("ps4") ||
    searchText.includes("consola") ||
    searchText.includes("videojuegos") ||
    searchText.includes("rtx") ||
    searchText.includes("ryzen") ||
    searchText.includes("tarjeta gráfica")
  ) {
    return "Gaming";
  }

  // 2. Audio
  if (
    searchText.includes("audifonos") ||
    searchText.includes("auriculares") ||
    searchText.includes("bluetooth") ||
    searchText.includes("bocina") ||
    searchText.includes("parlante") ||
    searchText.includes("soundcore") ||
    searchText.includes("in-ear") ||
    searchText.includes("diadema") ||
    searchText.includes("microfono") ||
    searchText.includes("altavoz") ||
    searchText.includes("soundbar") ||
    searchText.includes("barra de sonido") ||
    searchText.includes("audio")
  ) {
    return "Audio";
  }

  // 3. Tecnología (General Tech/Electronics)
  if (
    searchText.includes("celular") ||
    searchText.includes("smartphone") ||
    searchText.includes("iphone") ||
    searchText.includes("galaxy") ||
    searchText.includes("laptop") ||
    searchText.includes("computación") ||
    searchText.includes("computadora") ||
    searchText.includes("pantalla") ||
    searchText.includes("smart watch") ||
    searchText.includes("smartwatch") ||
    searchText.includes("reloj inteligente") ||
    searchText.includes("cargador") ||
    searchText.includes("tablet") ||
    searchText.includes("kindle") ||
    searchText.includes("cámara") ||
    searchText.includes("gopro") ||
    searchText.includes("point") ||
    searchText.includes("hidrogel") ||
    searchText.includes("procesador") ||
    searchText.includes("memoria ram") ||
    searchText.includes("disco duro") ||
    searchText.includes("ssd") ||
    searchText.includes("intel") ||
    searchText.includes("amd") ||
    searchText.includes("monitor") ||
    searchText.includes("electrónica") ||
    searchText.includes("tecnología")
  ) {
    return "Tecnología";
  }

  // 4. Hogar
  if (
    searchText.includes("hogar") ||
    searchText.includes("mueble") ||
    searchText.includes("jardín") ||
    searchText.includes("sarten") ||
    searchText.includes("olla") ||
    searchText.includes("cocina") ||
    searchText.includes("licuadora") ||
    searchText.includes("aspiradora") ||
    searchText.includes("colchon") ||
    searchText.includes("almohada") ||
    searchText.includes("sabanas") ||
    searchText.includes("vaso") ||
    searchText.includes("termo") ||
    searchText.includes("comedor") ||
    searchText.includes("cuchillo") ||
    searchText.includes("herramientas") ||
    searchText.includes("foco") ||
    searchText.includes("led") ||
    searchText.includes("freidora") ||
    searchText.includes("cafetera") ||
    searchText.includes("aire acondicionado") ||
    searchText.includes("ventilador") ||
    searchText.includes("herramienta") ||
    searchText.includes("decoración") ||
    searchText.includes("batería de cocina")
  ) {
    return "Hogar";
  }

  // 5. Moda
  if (
    searchText.includes("moda") ||
    searchText.includes("ropa") ||
    searchText.includes("calzado") ||
    searchText.includes("tenis") ||
    searchText.includes("playera") ||
    searchText.includes("pantalon") ||
    searchText.includes("sudadera") ||
    searchText.includes("mochila") ||
    searchText.includes("vestido") ||
    searchText.includes("reloj de mano") ||
    searchText.includes("lentes") ||
    searchText.includes("gafas") ||
    searchText.includes("zapatos") ||
    searchText.includes("botas") ||
    searchText.includes("camisa") ||
    searchText.includes("chaqueta") ||
    searchText.includes("abrigo") ||
    searchText.includes("bolso") ||
    searchText.includes("joyería")
  ) {
    return "Moda";
  }

  // 6. Deportes
  if (
    searchText.includes("deporte") ||
    searchText.includes("balon") ||
    searchText.includes("mancuernas") ||
    searchText.includes("pesa") ||
    searchText.includes("bicicleta") ||
    searchText.includes("gym") ||
    searchText.includes("ejercicio") ||
    searchText.includes("futbol") ||
    searchText.includes("basquetbol") ||
    searchText.includes("entrenamiento") ||
    searchText.includes("suplemento") ||
    searchText.includes("proteina") ||
    searchText.includes("fitness")
  ) {
    return "Deportes";
  }

  // 7. Belleza (Cosméticos, Maquillaje, Skincare)
  if (
    searchText.includes("maquillaje") ||
    searchText.includes("cosmetico") ||
    searchText.includes("cosmético") ||
    searchText.includes("skincare") ||
    searchText.includes("crema facial") ||
    searchText.includes("protector solar") ||
    searchText.includes("bloqueador") ||
    searchText.includes("labial") ||
    searchText.includes("rimel") ||
    searchText.includes("máscara de pestañas") ||
    searchText.includes("base de maquillaje") ||
    searchText.includes("serum") ||
    searchText.includes("sérum") ||
    searchText.includes("belleza") ||
    searchText.includes("cuidado personal") ||
    searchText.includes("perfume") ||
    searchText.includes("locion") ||
    searchText.includes("loción") ||
    searchText.includes("fragancia")
  ) {
    return "Belleza";
  }

  return "General";
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
      let details = { title: "", price: null, originalPrice: null, discount: null, imageUrl: imageUrl, categoryId: null };

      if (state) {
        // 1. Try to extract details directly from the first polycard in the state (fastest, 100% accurate, no API limits!)
        const localDetails = findFeaturedProductDetails(state);
        if (localDetails && localDetails.title) {
          console.log("Extracted featured product details locally from polycard:", localDetails.title);
          details.title = localDetails.title;
          details.price = localDetails.price;
          details.originalPrice = localDetails.originalPrice;
          details.discount = localDetails.discount;
          details.categoryId = localDetails.categoryId;
        } else {
          // 2. Fallback: try to find the exact highlighted product ID to get perfect data from the official API
          const featuredId = findFeaturedProductId(state);
          if (featuredId) {
            console.log("Found featured product ID on social page, fetching from API:", featuredId);
            try {
              const apiRes = await fetch(`https://api.mercadolibre.com/items/${featuredId}`);
              if (apiRes.ok) {
                const item = await apiRes.json();
                details.title = item.title;
                details.price = item.price;
                details.originalPrice = item.original_price || null;
                details.categoryId = item.category_id || null;
                if (details.originalPrice && details.originalPrice > details.price) {
                  details.discount = Math.round(((details.originalPrice - details.price) / details.originalPrice) * 100);
                }
                if (item.pictures && item.pictures.length > 0) {
                  details.imageUrl = item.pictures[0].secure_url || item.pictures[0].url;
                }
              }
            } catch (apiErr) {
              console.error("API error while fetching featured item from social page:", apiErr);
            }
          }
        }

        // 3. Fallback: deep scan all components in the state
        if (!details.title) {
          const componentsData = findComponents(state);
          details.title = componentsData.title;
          details.price = componentsData.price;
          details.originalPrice = componentsData.originalPrice;
          details.discount = componentsData.discount;
        }
      }

      // If no title was found via state, fall back to meta tag
      if (!details.title) {
        const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/) || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
        details.title = titleMatch ? titleMatch[1] : "";
      }

      // Final dynamic calculation of discount as a fallback
      if (details.price && details.originalPrice && details.originalPrice > details.price && !details.discount) {
        details.discount = Math.round(((details.originalPrice - details.price) / details.originalPrice) * 100);
      }

      // Resolve the category intelligently
      let detectedCategory = "General";
      if (details.categoryId) {
        const catInfo = await getMercadoLibreCategoryPath(details.categoryId);
        detectedCategory = classifyCategory(details.title, catInfo.name, catInfo.path);
      } else {
        detectedCategory = classifyCategory(details.title, "", []);
      }

      return NextResponse.json({
        success: true,
        title: details.title,
        price: details.price,
        originalPrice: details.originalPrice,
        discount: details.discount,
        imageUrl: details.imageUrl || imageUrl,
        affiliateUrl: targetUrl, // Keep original meli.la affiliate link
        category: detectedCategory,
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

      // Resolve the category intelligently
      let detectedCategory = "General";
      if (item.category_id) {
        const catInfo = await getMercadoLibreCategoryPath(item.category_id);
        detectedCategory = classifyCategory(item.title, catInfo.name, catInfo.path);
      } else {
        detectedCategory = classifyCategory(item.title, "", []);
      }

      return NextResponse.json({
        success: true,
        title: item.title,
        price: price,
        originalPrice: originalPrice,
        discount: discount,
        imageUrl: imageUrl,
        affiliateUrl: targetUrl, // Use original URL
        category: detectedCategory,
      });
    }

    return NextResponse.json({ error: "Unsupported Mercado Libre URL format" }, { status: 400 });

  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: "Internal scraper error", details: error.message }, { status: 500 });
  }
}
