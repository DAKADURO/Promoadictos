# Fase 2 — Ciclo de vida automático de ofertas

**Estado:** ✅ Implementada en sesión 2026-07-29

## Resumen de cambios

### 1. Schema de Prisma (`prisma/schema.prisma`)
Se agregaron tres campos a la entidad `Offer`:
- `isActive Boolean @default(true)` — controla si la oferta se muestra públicamente
- `lastCheckedAt DateTime?` — timestamp de la última verificación de link
- `failedChecks Int @default(0)` — contador de fallos de link consecutivos

### 2. Filtrado público vs admin (`src/app/api/offers/route.js`)
- **GET público:** Solo muestra ofertas con `isActive: true`
- **GET admin:** Muestra todas las ofertas (si está autenticado)
- El filtro aplica en paginación y en el array legacy

### 3. Mejoras al job `check-links` (`src/app/api/offers/check-links/route.js`)
**Lógica de desactivación automática:**
- Cada fallo incrementa `failedChecks` en 1
- Si `failedChecks >= MAX_FAILED_CHECKS` (default: 3), desactiva la oferta
- Si el link funciona, resetea `failedChecks` a 0
- Actualiza `lastCheckedAt` en cada verificación

**Variables de entorno:**
- `MAX_FAILED_CHECKS` (default: 3) — umbral de fallos para desactivar

### 4. Nuevo endpoint de caducidad (`src/app/api/offers/auto-deactivate/route.js`)
**Desactiva ofertas por:**
- Descuento < umbral (p. ej., 10%)
- Más de N días desde su creación

**Variables de entorno:**
- `MIN_DISCOUNT_THRESHOLD` (default: 10) — descuento mínimo en %
- `MAX_DAYS_PUBLISHED` (default: 30) — días máximos activos

**Respuesta incluye:** lista de ofertas desactivadas con razón (descuento bajo o antigüedad)

### 5. Job de cupones expirados (`src/app/api/coupons/deactivate-expired/route.js`)
- Desactiva cupones con `expiryDate < now()`
- Se ejecuta diariamente a las 3 AM (por defecto)

### 6. Nuevos jobs en el scheduler (`src/lib/jobs.js`)
Se agregaron dos jobs al registro:

**Job: `auto-deactivate`**
```javascript
{
  name: "auto-deactivate",
  schedule: process.env.AUTO_DEACTIVATE_SCHEDULE || "0 2 * * *", // 2 AM diario
  handler: autoDeactivate
}
```

**Job: `deactivate-coupons`**
```javascript
{
  name: "deactivate-coupons",
  schedule: process.env.DEACTIVATE_COUPONS_SCHEDULE || "0 3 * * *", // 3 AM diario
  handler: deactivateCoupons
}
```

## Configuración por entorno

### Variables por defecto
```bash
MAX_FAILED_CHECKS=3               # Fallos consecutivos para desactivar
MIN_DISCOUNT_THRESHOLD=10         # Descuento mínimo en %
MAX_DAYS_PUBLISHED=30             # Días máximos activos
SYNC_PRICES_SCHEDULE="0 0,6,12,18 * * *"      # Cada 6 horas
CHECK_LINKS_SCHEDULE="0 0 * * *"              # Diario a medianoche
AUTO_DEACTIVATE_SCHEDULE="0 2 * * *"          # Diario a las 2 AM
DEACTIVATE_COUPONS_SCHEDULE="0 3 * * *"       # Diario a las 3 AM
```

### Ejemplos de configuración
```bash
# Más estricto: desactivar después de 1 fallo, o si descuento < 5%
MAX_FAILED_CHECKS=1
MIN_DISCOUNT_THRESHOLD=5

# Más flexible: 5 fallos, descuento mínimo 15%, 60 días de vida
MAX_FAILED_CHECKS=5
MIN_DISCOUNT_THRESHOLD=15
MAX_DAYS_PUBLISHED=60
```

## Flujo de desactivación

```
[Offer creada]
    ↓
[Check links cada día a medianoche]
    ├─ ✅ Link funciona → failedChecks = 0
    ├─ ❌ Link roto → failedChecks++
    │   └─ Si failedChecks >= 3 → isActive = false
    ↓
[Auto-deactivate cada día a las 2 AM]
    ├─ Descuento < 10% → isActive = false
    ├─ Antigüedad > 30 días → isActive = false
    ↓
[Usuario solo ve ofertas con isActive = true]
```

## Endpoints para disparo manual

Todos estos endpoints aceptan `?secret=CRON_SECRET` y pueden ser disparados manualmente desde admin o CLI:

```bash
# Check links
GET /api/offers/check-links?secret=YOUR_CRON_SECRET

# Auto-deactivate
GET /api/offers/auto-deactivate?secret=YOUR_CRON_SECRET

# Deactivate expired coupons
GET /api/coupons/deactivate-expired?secret=YOUR_CRON_SECRET
```

## Respuesta típica de `check-links`
```json
{
  "broken": [
    {
      "id": "offer-id",
      "title": "Producto XYZ",
      "failedChecks": 2,
      "willDeactivate": false,
      "reason": "Timeout (sin respuesta en 8s)"
    }
  ],
  "total": 42,
  "brokenCount": 3,
  "deactivated": 0,
  "updated": 42
}
```

## Deploy a Railway

1. `prisma db push` se ejecutará automáticamente en `npm start`
2. Los jobs se inicializarán al arrancar el servidor
3. Verificar logs en Railway para confirmar que los 4 jobs están programados

## Testing local

### Con DB simulada (sin Railway):
```bash
# Verificar que los jobs se cargan sin errores
JOBS_ENABLED=true npm start

# En otra terminal, disparar manualmente un job
curl "http://localhost:3000/api/offers/check-links?secret=test_secret" \
  -H "Cookie: auth_session=..."
```

### Variables de test:
```bash
# Acelerar jobs para testing
SYNC_PRICES_SCHEDULE="*/5 * * * *"          # Cada 5 minutos
CHECK_LINKS_SCHEDULE="*/10 * * * *"         # Cada 10 minutos
AUTO_DEACTIVATE_SCHEDULE="*/15 * * * *"     # Cada 15 minutos
```

## Changelog Fase 2

- ✅ Agregar campos `isActive`, `lastCheckedAt`, `failedChecks` a Offer
- ✅ Filtrar público por `isActive: true` (admin ve todo)
- ✅ Lógica de desactivación automática en `check-links` (3 fallos = baja)
- ✅ Endpoint `auto-deactivate` por descuento bajo o antigüedad
- ✅ Endpoint `deactivate-coupons` para cupones expirados
- ✅ Agregar jobs al scheduler (2 nuevos)
- ✅ Documentación de variables de entorno

## Próximos pasos (Fase 3)

- Spike: verificar cómo generar links de afiliado automáticamente
- Job `discover-offers`: buscar en API de Mercado Libre
- Deduplicación automática de ofertas
- Modo "borrador" para aprobación manual antes de publicar
