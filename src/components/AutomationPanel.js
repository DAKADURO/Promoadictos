"use client";

import { useEffect, useState, useCallback } from "react";

const NAMES = {
  "sync-prices": "Sincronizar precios",
  "check-links": "Verificar enlaces",
  "auto-deactivate": "Desactivar ofertas viejas o sin descuento",
  "deactivate-coupons": "Desactivar cupones vencidos",
  "discover-offers": "Descubrir ofertas nuevas",
  "daily-digest": "Correo diario a suscriptores",
};

const card = { background: "rgba(26, 22, 19,0.6)", border: "1px solid var(--clr-border)", borderRadius: "1rem", padding: "1rem 1.25rem" };
const btn = (primary) => ({
  padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
  border: primary ? "none" : "1px solid var(--clr-border)", background: primary ? "var(--clr-orange)" : "transparent", color: primary ? "#fff" : "var(--clr-text)",
});

function when(d) {
  if (!d) return "nunca";
  return new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function summary(result) {
  if (!result || typeof result !== "object") return "";
  return Object.entries(result)
    .filter(([, v]) => ["number", "string", "boolean"].includes(typeof v))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

function Badge({ job }) {
  const s = job.running ? ["Ejecutando…", "#F1D6A0"] : job.paused ? ["Pausado", "#fbbf24"] : !job.lastRun ? ["Sin ejecuciones", "#9ca3af"] : job.lastRun.success ? ["OK", "#34d399"] : ["Falló", "#f87171"];
  return <span style={{ color: s[1], fontWeight: 800, fontSize: "0.78rem" }}>● {s[0]}</span>;
}

export default function AutomationPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [edits, setEdits] = useState({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOut, setPreviewOut] = useState("");

  const previewAffiliate = async () => {
    setPreviewOut("");
    const res = await fetch("/api/admin/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "affiliate-preview", url: previewUrl }) });
    const out = await res.json().catch(() => ({}));
    setPreviewOut(res.ok ? out.url : out.error || "Error");
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/automation", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error al cargar");
      setData(await res.json());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const anyRunning = !!data?.jobs?.some((j) => j.running);
  useEffect(() => {
    const t = setInterval(load, anyRunning ? 4000 : 30000);
    return () => clearInterval(t);
  }, [load, anyRunning]);

  const post = async (body, okMsg) => {
    setMsg("");
    const res = await fetch("/api/admin/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    setMsg(res.ok ? okMsg : out.error || "Error");
    await load();
  };

  if (error && !data) return <div style={card}>No se pudo cargar: {error}</div>;
  if (!data) return <div style={card}>Cargando…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "1100px" }}>
      {msg && <div style={{ ...card, color: "var(--clr-orange-lt)" }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
        {[["Visibles en el sitio", data.offers.active], ["Desactivadas o borradores", data.offers.inactive], ["Total", data.offers.total]].map(([l, v]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-muted)" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Tareas automáticas</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {data.jobs.map((j) => (
            <div key={j.name} style={{ display: "grid", gridTemplateColumns: "minmax(200px,1.4fr) minmax(160px,2fr) auto", gap: "0.75rem", alignItems: "center", padding: "0.6rem 0", borderTop: "1px solid var(--clr-border)" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{NAMES[j.name] || j.name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--clr-muted)" }}>horario (UTC): {j.schedule}</div>
              </div>
              <div style={{ fontSize: "0.78rem" }}>
                <Badge job={j} /> <span style={{ color: "var(--clr-muted)" }}>· última: {when(j.lastRun?.startedAt)}</span>
                <div style={{ color: j.lastRun && !j.lastRun.success ? "#f87171" : "var(--clr-muted)", wordBreak: "break-word" }}>
                  {j.lastRun?.error || summary(j.lastRun?.result)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <button style={btn(true)} disabled={j.running} onClick={() => post({ action: "run", job: j.name }, "Ejecución iniciada")}>
                  Ejecutar ahora
                </button>
                <button style={btn(false)} onClick={() => post({ action: "pause", job: j.name, paused: !j.paused }, j.paused ? "Tarea reanudada" : "Tarea pausada")}>
                  {j.paused ? "Reanudar" : "Pausar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>Enlaces de afiliado</h3>
        <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: "var(--clr-muted)" }}>
          Estado de las variables <code>ML_AFFILIATE_TOOL</code> y <code>ML_AFFILIATE_WORD</code> en Railway:{" "}
          <strong style={{ color: data.affiliateConfigured ? "#34d399" : "#fbbf24" }}>{data.affiliateConfigured ? "configuradas" : "faltan"}</strong>.
          Mercado Libre aún no ha confirmado que atribuya comisión a estas URLs directas: haz primero una prueba de clic en tu panel de afiliados y después enciende el interruptor de abajo (en Umbrales).
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://www.mercadolibre.com.mx/.../p/MLM123..."
            style={{ flex: "1 1 360px", padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: "1px solid var(--clr-border)", background: "rgba(0,0,0,0.3)", color: "var(--clr-text)" }} />
          <button style={btn(false)} onClick={previewAffiliate}>Ver cómo quedaría</button>
        </div>
        {previewOut && <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", wordBreak: "break-all", color: "var(--clr-orange-lt)" }}>{previewOut}</div>}
      </div>

      {data.atRisk?.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>Ofertas en riesgo ({data.atRisk.length})</h3>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "var(--clr-muted)" }}>
            El sistema no pudo confirmarlas en la última revisión (producto pausado, agotado o que ya no aparece en la página del enlace).
            Si el contador llega al umbral, la oferta se desactiva sola. Abre el enlace: si el producto sigue a la venta, pulsa «Está bien».
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.atRisk.map((o) => (
              <div key={o.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", borderTop: "1px solid var(--clr-border)", paddingTop: "0.5rem" }}>
                <div style={{ flex: "1 1 320px", fontSize: "0.82rem", wordBreak: "break-word" }}>
                  {o.title}
                  <div style={{ fontSize: "0.7rem", color: "var(--clr-muted)" }}>
                    no disponible: {o.unavailableChecks} · enlace fallido: {o.failedChecks} · {o.isActive ? "visible" : "DESACTIVADA"}
                  </div>
                </div>
                <a href={o.affiliateUrl} target="_blank" rel="noopener noreferrer" style={{ ...btn(false), textDecoration: "none" }}>Abrir enlace</a>
                <button style={btn(true)} onClick={() => post({ action: "keep-offer", id: o.id }, "Contador reiniciado")}>Está bien</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>Umbrales</h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "var(--clr-muted)" }}>Lo que guardes aquí tiene prioridad sobre las variables de Railway.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {data.settings.map((s) => {
            const cur = edits[s.key] ?? s.value;
            return (
              <div key={s.key} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", borderTop: "1px solid var(--clr-border)", paddingTop: "0.6rem" }}>
                <div style={{ flex: "1 1 280px", fontSize: "0.85rem" }}>
                  {s.label} <span style={{ color: "var(--clr-muted)", fontSize: "0.7rem" }}>(origen: {s.source === "admin" ? "este panel" : s.source === "env" ? "Railway" : "por defecto"})</span>
                </div>
                {s.type === "bool" ? (
                  <input type="checkbox" checked={!!cur} onChange={(e) => setEdits({ ...edits, [s.key]: e.target.checked })} />
                ) : (
                  <input type="number" min={s.min} max={s.max} value={cur} onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value === "" ? "" : Number(e.target.value) })}
                    style={{ width: "90px", padding: "0.35rem 0.5rem", borderRadius: "0.4rem", border: "1px solid var(--clr-border)", background: "rgba(0,0,0,0.3)", color: "var(--clr-text)" }} />
                )}
                <button style={btn(false)} disabled={edits[s.key] === undefined || edits[s.key] === s.value}
                  onClick={async () => { await post({ action: "setting", key: s.key, value: cur }, "Ajuste guardado"); setEdits((e) => { const n = { ...e }; delete n[s.key]; return n; }); }}>
                  Guardar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Historial reciente</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
          {data.history.map((h) => (
            <div key={h.id} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", color: h.success || !h.endedAt ? "var(--clr-text)" : "#f87171" }}>
              <span style={{ color: "var(--clr-muted)", minWidth: "110px" }}>{when(h.startedAt)}</span>
              <strong>{NAMES[h.job] || h.job}</strong>
              <span>{!h.endedAt ? "en curso" : h.success ? "OK" : "falló"}</span>
              <span style={{ color: "var(--clr-muted)", wordBreak: "break-word" }}>{h.error || summary(h.result)}</span>
            </div>
          ))}
          {data.history.length === 0 && <span style={{ color: "var(--clr-muted)" }}>Aún no hay ejecuciones.</span>}
        </div>
      </div>
    </div>
  );
}
