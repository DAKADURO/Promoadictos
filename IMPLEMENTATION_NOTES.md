# Notas de Implementación - Fase 1

## Resumen
Se implementó el motor de tareas programadas que permite ejecutar jobs automáticamente en horarios predefinidos. El scheduler corre como parte del servidor Next.js y registra cada ejecución en la base de datos.

## Archivos creados/modificados

### 1. `src/lib/jobs.js` (nuevo)
Exporta:
- `startJobScheduler()`: Inicia el scheduler al startup del servidor
- `stopJobScheduler()`: Detiene todos los jobs (útil para testing/cleanup)
- `triggerJob(jobName)`: Ejecuta un job manualmente desde el admin

**Características:**
- Registry de jobs configurables por env vars
- Cada job tiene su propio schedule (cron expression)
- Los jobs se ejecutan mediante fetch interno del endpoint correspondiente
- Cada ejecución se registra en `JobLog` con resultado o error

**Jobs predefinidos:**
- `sync-prices`: Ejecuta `/api/offers/sync-prices` cada 6 horas (configurable via `SYNC_PRICES_SCHEDULE`)
- `check-links`: Ejecuta `/api/offers/check-links` diariamente a medianoche (configurable via `CHECK_LINKS_SCHEDULE`)

### 2. `instrumentation.ts` (nuevo)
Hook de Next.js 15+ que se ejecuta en el startup del servidor.
- Se ejecuta automáticamente cuando `next start` inicia
- Solo en Node.js (no en cliente)
- Llama a `startJobScheduler()` para inicializar los jobs

### 3. `prisma/schema.prisma` (modificado)
Añadido modelo `JobLog`:
```prisma
model JobLog {
  id        String   @id @default(cuid())
  job       String        // Nombre del job
  startedAt DateTime @default(now())
  endedAt   DateTime?
  result    Json?         // Resultado JSON
  error     String?       // Mensaje de error
  success   Boolean @default(true)
  createdAt DateTime @default(now())

  @@index([job])
  @@index([createdAt])
}
```

### 4. `src/app/api/offers/check-links/route.js` (modificado)
Agregado soporte de `CRON_SECRET` similar a `sync-prices`:
- Si no hay sesión autenticada, valida contra `CRON_SECRET` del query param
- Permite que el scheduler ejecute el endpoint sin sesión

### 5. `package.json` (modificado)
Instalado: `node-cron@3.0.3`

## Configuración via Environment Variables

```bash
# Cron expressions (node-cron format: minute hour day month day-of-week)
SYNC_PRICES_SCHEDULE="0 0,6,12,18 * * *"      # Defecto: cada 6 horas
CHECK_LINKS_SCHEDULE="0 0 * * *"               # Defecto: diariamente a las 0:00

# Control general
JOBS_ENABLED="true"                             # Defecto: true (activado)

# Necesario para autenticación de jobs
CRON_SECRET="[tu-secret-aqui]"

# Para que los jobs se auto-ejecuten (scheduler llama a endpoints internos)
NEXTAUTH_URL="http://localhost:3000"            # O tu URL en producción
```

## Cómo funciona

1. **Startup**: Next.js carga `instrumentation.ts` → llamaría a `startJobScheduler()`
2. **Registro**: Cada job se registra como una tarea cron con node-cron
3. **Ejecución**: Cuando la cron se dispara:
   - Se crea un registro `JobLog` con estado inicial
   - Se llama al endpoint del job con `CRON_SECRET`
   - Se registra el resultado o error en `JobLog`
   - Se actualiza `endedAt` y `success`
4. **Auditoría**: El admin puede ver el historial en `JobLog`

## Testing local

Para testear que el scheduler se inicia correctamente:

```bash
npm run dev
# En los logs deberías ver:
# [Jobs] Starting scheduled job scheduler...
# [Jobs] Scheduled: sync-prices (0 0,6,12,18 * * *)
# [Jobs] Scheduled: check-links (0 0 * * *)
```

Para testear un job manualmente (sin esperar el cron):
- Llamar a `/api/offers/sync-prices?secret=CRON_SECRET` (ya funciona)
- Llamar a `/api/offers/check-links?secret=CRON_SECRET` (modificado en esta fase)

Para inspeccionar JobLogs:
```bash
# Desde cualquier herramienta DB (psql, DBeaver, Railway console):
SELECT * FROM "JobLog" ORDER BY "createdAt" DESC LIMIT 10;
```

## Notas

- Los jobs corren **solo en producción** (Railway/next start) o si se configuran explícitamente en desarrollo
- `instrumentation.ts` se ejecuta una sola vez al startup, no en cada request
- Los jobs usan fetch interno + `CRON_SECRET` en place de auth de sesión
- El modelo `JobLog` se crea automáticamente en el primer `prisma db push` (al hacer deploy en Railway)

## Próximos pasos

- **Fase 2**: Agregar campos `isActive`, `lastCheckedAt`, `failedChecks` a `Offer`; implementar lógica de desactivación
- **Fase 3**: Descubrimiento automático de ofertas nuevas
- **Fase 4**: Digest diario en lugar de email por-oferta
- **Fase 5**: Panel de control de automatización con historial de `JobLog`
