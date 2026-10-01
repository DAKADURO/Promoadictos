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

  const setState = (kind, badge, info, buttonLabel, onClick) => {
    statusBadge.className = `status-badge ${kind}`;
    statusBadge.textContent = badge;
    infoText.textContent = info;
    if (onClick) {
      btnPublish.disabled = false;
      btnPublish.lastChild.textContent = ` ${buttonLabel}`;
      btnPublish.onclick = onClick;
    } else {
      btnPublish.disabled = true;
    }
  };

  const openAdmin = (url) => {
    chrome.tabs.create({ url: `https://promoadictos.com/admin?importUrl=${encodeURIComponent(url)}` });
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
      setState("valid", "✓ Enlace de afiliado", "Listo. Haz clic para enviarlo al panel y auto-completar.", "Importar a Admin", () => openAdmin(cleanUrl));
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
      setState("valid", "✓ Enlace de afiliado detectado", `${affiliateLink.replace("https://", "")} · listo para enviar al panel.`, "Importar a Admin", () => openAdmin(affiliateLink));
    } else {
      setState(
        "invalid",
        "ℹ️ Falta el enlace de afiliado",
        "Abre «Generar link» en la barra de afiliados y vuelve a abrir esta extensión. Si importas sin él, la oferta no llevará tu comisión.",
        "Importar sin afiliado",
        () => openAdmin(cleanUrl)
      );
    }
  } catch (error) {
    setState("invalid", "⚠️ Error", "Ocurrió un error al leer la pestaña.");
  }
});
