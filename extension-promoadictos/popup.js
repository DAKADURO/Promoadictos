// Se ejecuta DENTRO de la página de Mercado Libre (por eso es autocontenida):
// busca el enlace de afiliado `meli.la` que muestra el cuadro "Generar link"
// de la barra de afiliados (campo "Link del producto" o "Texto sugerido").
function findAffiliateLink() {
  const re = /https:\/\/meli\.la\/[A-Za-z0-9]+/;
  for (const el of document.querySelectorAll("input, textarea")) {
    const m = (el.value || "").match(re);
    if (m) return m[0];
  }
  const m = ((document.body && document.body.innerText) || "").match(re);
  return m ? m[0] : null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("statusBadge");
  const infoText = document.getElementById("infoText");
  const btnPublish = document.getElementById("btnPublish");

  const btnReview = document.getElementById("btnReview");

  // primary: botón principal; secondary (opcional): botón "revisar antes"
  const setState = (kind, badge, info, primary, secondary) => {
    statusBadge.className = `status-badge ${kind}`;
    statusBadge.textContent = badge;
    infoText.textContent = info;
    if (primary) {
      btnPublish.disabled = false;
      btnPublish.lastChild.textContent = ` ${primary.label}`;
      btnPublish.onclick = primary.onClick;
    } else {
      btnPublish.disabled = true;
    }
    if (secondary) {
      btnReview.style.display = "block";
      btnReview.textContent = secondary.label;
      btnReview.onclick = secondary.onClick;
    } else {
      btnReview.style.display = "none";
    }
  };

  // autoPublish=true: el admin guarda la oferta solo si está completa y tiene descuento.
  const openAdmin = (url, autoPublish = false) => {
    const extra = autoPublish ? "&autoPublish=1" : "";
    chrome.tabs.create({ url: `https://promoadictos.com/admin?importUrl=${encodeURIComponent(url)}${extra}` });
  };

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      setState("invalid", "ℹ️ Sin enlace", "No se pudo detectar ninguna pestaña activa.");
      return;
    }

    const url = tab.url;
    // Sin el fragmento (#…): Mercado Libre le añade identificadores de tu sesión.
    const cleanUrl = url.split("#")[0];

    // 1) Si la pestaña ya es un enlace de afiliado, se manda tal cual.
    if (url.includes("meli.la")) {
      setState(
        "valid", "✓ Enlace de afiliado",
        "Listo. Se publica solo si la oferta viene completa y con descuento.",
        { label: "Publicar directo", onClick: () => openAdmin(cleanUrl, true) },
        { label: "Importar para revisar antes", onClick: () => openAdmin(cleanUrl, false) }
      );
      return;
    }

    if (!url.includes("mercadolibre.com")) {
      setState("invalid", "ℹ️ Otro sitio", "Ve a un producto de Mercado Libre (con la barra de afiliados) para importarlo.");
      return;
    }

    // 2) Página de Mercado Libre: se intenta leer el meli.la del cuadro "Generar link".
    let affiliateLink = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: findAffiliateLink,
      });
      affiliateLink = (results || []).map((r) => r && r.result).find(Boolean) || null;
    } catch (err) {
      // páginas donde no se puede inyectar: se sigue con el aviso de abajo
    }

    if (affiliateLink) {
      setState(
        "valid", "✓ Enlace de afiliado detectado",
        `${affiliateLink.replace("https://", "")} · se publica solo si viene completa y con descuento.`,
        { label: "Publicar directo", onClick: () => openAdmin(affiliateLink, true) },
        { label: "Importar para revisar antes", onClick: () => openAdmin(affiliateLink, false) }
      );
    } else {
      setState(
        "invalid",
        "ℹ️ Falta el enlace de afiliado",
        "Abre «Generar link» en la barra de afiliados y vuelve a abrir esta extensión. Si importas sin él, la oferta no llevará tu comisión.",
        { label: "Importar sin afiliado (revisar)", onClick: () => openAdmin(cleanUrl, false) }
      );
    }
  } catch (error) {
    setState("invalid", "⚠️ Error", "Ocurrió un error al leer la pestaña.");
  }
});
