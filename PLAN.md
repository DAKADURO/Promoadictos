# Plan de Automatización — Promoadictos

**Objetivo:** que la plataforma descubra, publique, actualice y depure ofertas sola, sin pegar links manualmente en el admin.

**Estado de partida:** ya existen `sync-prices` (acepta `CRON_SECRET`, listo para cron), `check-links` (solo sesión admin), el scraper de Mercado Libre (`src/lib/scraper.js`) y newsletter por oferta nueva. Falta: ejecución programada, acciones automáticas y descubrimiento de ofertas nuevas.

**Cómo usar este archivo:** cada fase se implementa en una **sesión nueva de Claude Code** con el modelo indicado. Instrucción sugerida al iniciar: *"Lee PLAN.md e implementa la Fase N"*. Marcar `[x]` al completar cada tarea.

---

## Fase 1 — Motor de tareas programadas
**Modelo: Haiku 4.5** · Esfuerzo: 1-2 sesiones

- [x] Crear `src/lib/jobs.js` con registro de tareas y horarios (configurables por env vars)
- [x] Scheduler con `node-cron` arrancado desde `instrumentation.js` de Next (el deploy en Railway corre `next start` como proceso persistente, así que funciona)
- [x] Programar `sync-prices` cada 6 horas (endpoint ya soporta `CRON_SECRET`)
- [x] Agregar soporte de `CRON_SECRET` a `check-links` (hoy solo acepta sesión)
- [x] Modelo Prisma `JobLog`: job, inicio, fin, resultado (JSON), error — para que la automatización no sea caja negra

## Fase 2 — Ciclo de vida automático de ofertas
**Modelo: Haiku 4.5 (subir a Sonnet si se complica)** · Esfuerzo: 1-2 sesiones

- [x] Agregar campos a `Offer`: `isActive Boolean @default(true)`, `lastCheckedAt DateTime?`, `failedChecks Int @default(0)`
- [x] Filtrar `isActive: true` en el GET público de ofertas (mantener todo visible en modo admin/legacy)
- [x] `check-links` automático: incrementa `failedChecks`; con 2-3 fallos consecutivos desactiva la oferta (no borrar, por si el link revive); resetear contador si el link responde
- [x] Regla de caducidad: desactivar ofertas con descuento < umbral (ej. 10%) o con más de N días publicadas (umbral por env var)
- [x] Cupones: job que desactiva los que pasaron su `expiryDate`

## Fase 3 — Descubrimiento automático de ofertas (el corazón)
**Modelo: Sonnet 5** · Esfuerzo: 3-5 sesiones

- [x] **SPIKE:** confirmado que **no es 100% automatizable**. Mercado Libre no ofrece API pública de afiliados para generar `meli.la` con tracking — el link solo se genera desde la barra de afiliados/app (sesión logueada del afiliado, a veces con confirmación QR). No existe parámetro de tracking que se pueda anexar a una URL directa de producto. Diseño adoptado: **cola de aprobación** — `discover-offers` usa la API de búsqueda para encontrar y scrapear productos y los guarda como borrador con la URL directa del producto (sin comisión); un humano genera el `meli.la` en la app de ML (2 clics) y lo pega al aprobar el borrador en el admin, reutilizando el flujo existente de `scraper.js`/`extractProductId` que ya acepta tanto URLs `meli.la` como URLs directas `MLM...`.
- [x] **HALLAZGO POST-SPIKE (2026-07-29):** Mercado Libre cerró el acceso público sin autenticación a `/sites/{site}/search` (403 forbidden) y a `/items/{id}` (403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`) — rompe también el scraper de `sync-prices` para URLs directas `MLM...`, no solo el descubrimiento. `/categories/{id}` sigue siendo público. Solución: app propia registrada en developers.mercadolibre.com.mx ("Promoadictos Automation", permiso "Publicación y sincronización" en modo Lectura) + flujo OAuth2 Authorization Code con refresh token, implementado en `src/lib/mercadolibre.js` (`getValidAccessToken`/`getMlAuthHeader`), `src/app/api/ml/authorize` y `src/app/api/ml/callback`, y modelo Prisma `MercadoLibreToken`. `scraper.js` y `discover-offers` ahora mandan `Authorization: Bearer` en esas llamadas. Requiere visitar `/api/ml/authorize` logueado como admin una vez para otorgar el permiso inicial.
- [x] Job `discover-offers` (diario o 2×/día): busca en `api.mercadolibre.com/sites/MLM/search` con filtros de descuento por las categorías existentes (Gaming, Audio, Tecnología, Hogar, Moda, Deportes, Belleza)
- [x] Deduplicar contra BD reutilizando `extractProductId` (movido a `src/lib/productId.js`, usado por `src/app/api/offers/route.js` y `discover-offers`)
- [x] Reglas de calidad configurables: `DISCOVER_MIN_DISCOUNT`, `DISCOVER_MAX_NEW_PER_DAY`, `DISCOVER_MAX_PER_CATEGORY`, `DISCOVER_AUTO_FEATURE_TOP_N`
- [x] Modo "borrador" inicial: ofertas descubiertas entran con `isActive: false` (URL directa del producto, sin comisión) y se aprueban editando la oferta en el admin (pegar el `meli.la` y activar); switch `DISCOVER_AUTO_PUBLISH=true` para pasar a modo 100% automático

## Fase 4 — Comunicación automática
**Modelo: Haiku 4.5** · Esfuerzo: 1 sesión

- [ ] Reemplazar email por-oferta con **digest diario** ("Las mejores ofertas de hoy") como job programado
- [ ] Enviar en lotes de ~50 destinatarios (el BCC único actual revienta límites SMTP al crecer la lista)
- [ ] Opcional: bot de Telegram que publica cada oferta destacada en un canal

## Fase 5 — Panel de control de automatización
**Modelo: Sonnet 5** (por el tamaño de `admin/page.js`: ~2,300 líneas) · Esfuerzo: 1-2 sesiones

- [ ] Pestaña "Automatización" en el admin: historial de `JobLog`, ejecución manual de cada job, switch activar/pausar
- [ ] Modelo Prisma `Setting` (clave-valor) para umbrales editables desde el admin
- [ ] Email de alerta al admin si un job falla repetido o el descubrimiento trae 0 resultados varios días (señal de cambio en ML)

---

## Notas transversales

- **Depurar bugs raros del scraper:** usar Opus 5 solo si Sonnet se atora.
- **Ahorro de contexto:** las sesiones con Haiku NO deben leer `src/app/admin/page.js` (2,291 líneas). Solo la Fase 5 lo necesita.
- **AGENTS.md aplica siempre:** este Next.js tiene breaking changes vs. lo conocido — leer las guías en `node_modules/next/dist/docs/` antes de escribir código.
- **Orden recomendado:** Fase 1 → 2 → spike de Fase 3 → resto de Fase 3 → 4 → 5. Las fases 1-2 dan valor inmediato (precios frescos, sin links muertos) sin depender del spike.
