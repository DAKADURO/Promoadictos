document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("statusBadge");
  const infoText = document.getElementById("infoText");
  const btnPublish = document.getElementById("btnPublish");

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      statusBadge.className = "status-badge invalid";
      statusBadge.textContent = "ℹ️ Sin enlace";
      infoText.textContent = "No se pudo detectar ninguna pestaña activa.";
      return;
    }

    const url = tab.url;
    const isML = url.includes("mercadolibre.com") || url.includes("meli.la");

    if (isML) {
      statusBadge.className = "status-badge valid";
      statusBadge.textContent = "✓ Link Detectado";
      infoText.textContent = "Enlace listo. Haz clic abajo para enviarlo al panel y auto-completar.";
      btnPublish.disabled = false;

      btnPublish.onclick = () => {
        const adminUrl = `https://promoadictos.com/admin?importUrl=${encodeURIComponent(url)}`;
        chrome.tabs.create({ url: adminUrl });
      };
    } else {
      statusBadge.className = "status-badge invalid";
      statusBadge.textContent = "ℹ️ Otro Sitio";
      infoText.textContent = "Ve a una página de producto en Mercado Libre o a tu perfil de creador meli.la.";
      btnPublish.disabled = true;
    }
  } catch (error) {
    statusBadge.className = "status-badge invalid";
    statusBadge.textContent = "⚠️ Error";
    infoText.textContent = "Ocurrió un error al leer la pestaña.";
  }
});
