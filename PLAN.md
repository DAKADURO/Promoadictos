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

- [ ] Agregar campos a `Offer`: `isActive Boolean @default(true)`, `lastCheckedAt DateTime?`, `failedChecks Int @default(0)`
- [ ] Filtrar `isActive: true` en el GET público de ofertas (mantener todo visible en modo admin/legacy)
- [ ] `check-links` automático: incrementa `failedChecks`; con 2-3 fallos consecutivos desactiva la oferta (no borrar, por si el link revive); resetear contador si el link responde
- [ ] Regla de caducidad: desactivar ofertas con descuento < umbral (ej. 10%) o con más de N días publicadas (umbral por env var)
- [ ] Cupones: job que desactiva los que pasaron su `expiryDate`

## Fase 3 — Descubrimiento automático de ofertas (el corazón)
**Modelo: Sonnet 5** · Esfuerzo: 3-5 sesiones

- [ ] **SPIKE PRIMERO (bloqueante):** verificar cómo generar el link de afiliado automáticamente. Los `meli.la` se generan en el panel de afiliados de ML; investigar si hay API o parámetro de tracking en URL directa. Si no es 100% automatizable, diseñar paso semi-manual (cola de aprobación).
- [ ] Job `discover-offers` (diario o 2×/día): busca en `api.mercadolibre.com/sites/MLM/search` con filtros de descuento por las categorías existentes (Gaming, Audio, Tecnología, Hogar, Moda, Deportes, Belleza)
- [ ] Deduplicar contra BD reutilizando `extractProductId` de `src/app/api/offers/route.js`
- [ ] Reglas de calidad configurables: descuento mínimo, máx. ofertas nuevas/día, cuota por categoría, auto-destacar las de mayor descuento
- [ ] Modo "borrador" inicial: ofertas descubiertas entran con `isActive: false` y se aprueban con un clic en el admin; switch para pasar a modo 100% automático

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
