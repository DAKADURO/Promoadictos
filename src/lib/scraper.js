// Helper function to resolve the target URL of any meli.la redirect
async function resolveUrl(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (res.status === 404) {
      throw new Error("Link expired or not found");
    }

    if (res.url === url) {
      throw new Error("Link did not redirect (may be expired)");
    }

    return res.url;
  } catch (err) {
    console.error("Resolve URL error:", err.message);
    throw new Error(`Failed to resolve meli.la shortlink: ${err.message}`);
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

function findAllProductDetails(obj, products = []) {
  if (!obj || typeof obj !== "object") return products;

  if (Array.isArray(obj.polycards) && obj.polycards.length > 0) {
    for (const card of obj.polycards) {
      const details = { title: "", price: null, originalPrice: null, discount: null, categoryId: null, id: null };
      if (card.metadata) {
        if (card.metadata.category_id) details.categoryId = card.metadata.category_id;
        if (card.metadata.id) details.id = card.metadata.id;
      }
      if (Array.isArray(card.components)) {
        for (const comp of card.components) {
          if (comp.type === "title" && comp.title?.text) details.title = comp.title.text;
          if (comp.type === "price" && comp.price) {
            details.price = comp.price.current_price?.value || null;
            details.originalPrice = comp.price.previous_price?.value || null;
            details.discount = comp.price.discount?.value || null;
          }
        }
      }
      if (details.title || details.price) {
        products.push(details);
      }
    }
  }

  for (const key of Object.keys(obj)) {
    findAllProductDetails(obj[key], products);
  }

  return products;
}

export function getSimilarity(target, candidate) {
  if (!target || !candidate) return 0;
  const targetWords = target.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 2);
  if (targetWords.length === 0) return 0;
  const candidateLower = candidate.toLowerCase();
  let matches = 0;
  for (const w of targetWords) {
    if (candidateLower.includes(w)) matches++;
  }
  return matches / targetWords.length;
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

const CATEGORY_KEYWORDS = {
  Gaming: [
    "gaming", "gamer", "nintendo", "switch", "playstation", "xbox", "ps5", "ps4",
    "consola", "videojuegos", "rtx", "ryzen", "tarjeta gráfica"
  ],
  Audio: [
    "audifonos", "auriculares", "bluetooth", "bocina", "parlante", "soundcore",
    "in-ear", "diadema", "microfono", "altavoz", "soundbar", "barra de sonido", "audio"
  ],
  Tecnología: [
    "celular", "smartphone", "iphone", "galaxy", "laptop", "computación",
    "computadora", "pantalla", "smart watch", "smartwatch", "reloj inteligente",
    "cargador", "tablet", "kindle", "cámara", "gopro", "point", "hidrogel",
    "procesador", "memoria ram", "disco duro", "ssd", "intel", "amd", "monitor",
    "electrónica", "tecnología"
  ],
  Hogar: [
    "hogar", "mueble", "jardín", "jardin", "sarten", "olla", "cocina", "licuadora",
    "aspiradora", "colchon", "almohada", "sabanas", "vaso", "termo", "comedor",
    "cuchillo", "herramientas", "foco", "led", "freidora", "cafetera",
    "aire acondicionado", "ventilador", "herramienta", "decoración", "batería de cocina"
  ],
  Moda: [
    "moda", "ropa", "calzado", "tenis", "playera", "pantalon", "sudadera",
    "mochila", "vestido", "reloj de mano", "lentes", "gafas", "zapatos", "botas",
    "camisa", "chaqueta", "abrigo", "bolso", "joyería"
  ],
  Deportes: [
    "deporte", "balon", "mancuernas", "pesa", "bicicleta", "gym", "ejercicio",
    "futbol", "basquetbol", "entrenamiento", "suplemento", "proteina", "fitness"
  ],
  Belleza: [
    "maquillaje", "cosmetico", "cosmético", "skincare", "crema facial",
    "protector solar", "bloqueador", "labial", "rimel", "máscara de pestañas",
    "base de maquillaje", "serum", "sérum", "belleza", "cuidado personal",
    "perfume", "locion", "loción", "fragancia"
  ]
};

// Classify category intelligently based on title, category name, and entire path
function classifyCategory(title, categoryName, categoryPath) {
  const pathStr = Array.isArray(categoryPath) ? categoryPath.join(" ") : "";
  const searchText = `${title} ${categoryName || ""} ${pathStr}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return category;
    }
  }

  const mapped = mapMercadoLibreCategory(categoryPath);
  if (mapped) return mapped;

  return "General";
}

// Map any Mercado Libre category path to a beautiful simplified name dynamically
function mapMercadoLibreCategory(path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  
  const topLevel = path[0].toLowerCase();
  
  if (topLevel.includes("belleza") || topLevel.includes("cuidado personal")) return "Belleza";
  if (topLevel.includes("computación") || topLevel.includes("computacion") || topLevel.includes("celulares") || topLevel.includes("cámaras") || topLevel.includes("camaras")) return "Tecnología";
  if (topLevel.includes("electrónica") || topLevel.includes("electronica")) {
    if (path.some(p => p.toLowerCase().includes("audio") || p.toLowerCase().includes("audífonos") || p.toLowerCase().includes("bocina"))) {
      return "Audio";
    }
    return "Tecnología";
  }
  if (topLevel.includes("hogar") || topLevel.includes("muebles") || topLevel.includes("jardín") || topLevel.includes("jardin")) return "Hogar";
  if (topLevel.includes("ropa") || topLevel.includes("bolsas") || topLevel.includes("calzado") || topLevel.includes("joyas") || topLevel.includes("relojes")) return "Moda";
  if (topLevel.includes("consolas") || topLevel.includes("videojuegos") || topLevel.includes("juegos de video")) return "Gaming";
  if (topLevel.includes("deportes") || topLevel.includes("fitness")) return "Deportes";
  
  // Dynamic categories:
  if (topLevel.includes("juegos y juguetes") || topLevel.includes("juguetes")) return "Juguetes";
  if (topLevel.includes("herramientas")) return "Herramientas";
  if (topLevel.includes("bebés") || topLevel.includes("bebes")) return "Bebés";
  if (topLevel.includes("automotriz") || topLevel.includes("accesorios para vehículos")) return "Automotriz";
  if (topLevel.includes("instrumentos musicales")) return "Música";
  if (topLevel.includes("libros")) return "Libros";
  if (topLevel.includes("alimentos y bebidas") || topLevel.includes("despensa")) return "Alimentos";
  if (topLevel.includes("mascotas")) return "Mascotas";
  
  // Fallback: Use the second-level path if it exists, otherwise use the first word of the top-level path capitalized!
  if (path.length > 1 && path[1] && path[1].length < 25) {
    // Capitalize first letter of each word
    return path[1].trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  
  const rawWord = path[0].split(/[,\s&]/)[0]; // First word of top category
  return rawWord.charAt(0).toUpperCase() + rawWord.slice(1).toLowerCase();
}

/**
 * Main scraping function that accepts any Mercado Libre or meli.la URL,
 * resolves redirection, extracts target attributes (price, originalPrice, etc.),
 * and returns details.
 */
export async function scrapeProduct(targetUrl, expectedTitle = null) {
  if (!targetUrl) {
    throw new Error("Missing url parameter");
  }

  // 1. Resolve meli.la redirect if applicable
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
    let details = { title: "", price: null, originalPrice: null, discount: null, imageUrl: imageUrl, categoryId: null, brand: "" };

    if (state) {
      const allProducts = findAllProductDetails(state);
      let bestProduct = null;
      let featuredId = null;

      if (allProducts.length > 0) {
        if (expectedTitle) {
          let maxScore = -1;
          for (const p of allProducts) {
            const score = getSimilarity(expectedTitle, p.title);
            if (score > maxScore) {
              maxScore = score;
              bestProduct = p;
            }
          }
          if (maxScore < 0.2) {
             console.warn(`Low title match (${maxScore}) for expected title: ${expectedTitle}`);
          }
        } else {
          bestProduct = allProducts[0];
        }
      }

      if (bestProduct && bestProduct.title) {
        console.log("Extracted product details locally from polycard:", bestProduct.title);
        details.title = bestProduct.title;
        details.price = bestProduct.price;
        details.originalPrice = bestProduct.originalPrice;
        details.discount = bestProduct.discount;
        details.categoryId = bestProduct.categoryId;
        featuredId = bestProduct.id;
      } else {
        featuredId = findFeaturedProductId(state);
      }

      if (featuredId) {
        try {
          const apiRes = await fetch(`https://api.mercadolibre.com/items/${featuredId}`);
          if (apiRes.ok) {
            const item = await apiRes.json();
            if (!details.title) details.title = item.title;
            if (!details.price) details.price = item.price;
            if (!details.originalPrice) details.originalPrice = item.original_price || null;
            if (!details.categoryId) details.categoryId = item.category_id || null;
            if (details.originalPrice && details.originalPrice > details.price && !details.discount) {
              details.discount = Math.round(((details.originalPrice - details.price) / details.originalPrice) * 100);
            }
            if (item.pictures && item.pictures.length > 0) {
              details.imageUrl = item.pictures[0].secure_url || item.pictures[0].url;
            }
            if (item.attributes && Array.isArray(item.attributes)) {
              const brandAttr = item.attributes.find(a => a.id === "BRAND");
              if (brandAttr && brandAttr.value_name) {
                details.brand = brandAttr.value_name;
              }
            }
          }
        } catch (apiErr) {
          console.error("API error while fetching featured item from social page:", apiErr);
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

    return {
      success: true,
      title: details.title,
      price: details.price,
      originalPrice: details.originalPrice,
      discount: details.discount,
      imageUrl: details.imageUrl || imageUrl,
      affiliateUrl: targetUrl, // Keep original affiliate link
      category: detectedCategory,
      brand: details.brand,
    };
  }

  // B. Handle Direct Product pages
  const mlmMatch = resolvedUrl.match(/(MLM-?[0-9]+)/i);
  if (mlmMatch) {
    const itemId = mlmMatch[1].replace("-", ""); // Format MLM123456789
    console.log("Extracted Item ID:", itemId);

    const apiRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
    if (!apiRes.ok) {
      throw new Error(`Failed to fetch item from Mercado Libre API. Status: ${apiRes.status}`);
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

    // Extract brand
    let brand = "";
    if (item.attributes && Array.isArray(item.attributes)) {
      const brandAttr = item.attributes.find(a => a.id === "BRAND");
      if (brandAttr && brandAttr.value_name) {
        brand = brandAttr.value_name;
      }
    }

    // Resolve the category intelligently
    let detectedCategory = "General";
    if (item.category_id) {
      const catInfo = await getMercadoLibreCategoryPath(item.category_id);
      detectedCategory = classifyCategory(item.title, catInfo.name, catInfo.path);
    } else {
      detectedCategory = classifyCategory(item.title, "", []);
    }

    return {
      success: true,
      title: item.title,
      price: price,
      originalPrice: originalPrice,
      discount: discount,
      imageUrl: imageUrl,
      affiliateUrl: targetUrl,
      category: detectedCategory,
      brand: brand,
    };
  }

  throw new Error(`Unsupported Mercado Libre URL format: ${resolvedUrl}`);
}
