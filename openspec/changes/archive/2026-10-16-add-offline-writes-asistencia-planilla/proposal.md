# Change: Escrituras offline piloto — asistencia y planilla (Fase 2)

## Why

El valor principal del offline es registrar en el aula: asistencia y calificaciones. Hoy esas escrituras fallan sin red, hacen fan-out con `Promise.all` sin saber qué entró (B11), suben archivos dentro de la mutación (B9) y la asistencia es un upsert last-write-wins silencioso.

Fuente de diseño: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) §3 D3–D6, D9; §4.1; §5; §6; §7.1–7.8; §8.8–8.10; §9.2–9.6; §10 BE-1/2/5/7/8; §11 Fase 2.

## What Changes

- Outbox propia en IndexedDB (`outbox`, `blobs`, `idmap`, `log`) con handlers tipados por `kind`, FIFO por `entityKey`, `dependsOn`, `Idempotency-Key`, backoff `min(5 min, 2 s·2^n)·jitter`, clasificación retry/auth/conflict/rejected/fatal, coalescing, líder entre pestañas (Web Locks + BroadcastChannel; lease en IndexedDB como fallback).
- Handlers: `asistencia.registrar|editar|marcar-todos`, `planilla.calificar|calificar-bulk|estado-resultado|observacion|soporte|soporte-quitar|soporte-favorito`, `actividad.asistencia|estado-resultado`.
- Capa optimista reaplicable, badges por ítem, banner con estados de cola, indicador en el header, toasts de resumen, ruta `/app/pendientes`, resolución de conflictos, logout con pendientes, log exportable.
- Ventana de 14 días sin reautenticar (§0.2); archivos ≤ `min(límite, 10 MB)`, 150 MB / 60 archivos por usuario, 3 por op, 25 MB por request (§0.4).
- **Habilitado solo para el piloto** (3–5 docentes con consentimiento, flag por usuario) mientras P6 siga pendiente (§0.3).
- Backend: BE-1 (Idempotency-Key en gateway), BE-2 (CAS por valor en planilla), **BE-5 (índice único en asistencia, esquema aprobado, PR propio en `sso` ajustando la migración dueña de `TASISTENCIA`)**, BE-7, BE-8.

## Impact

- Specs: `asistencia`, `planeador-planilla`; nueva `offline-outbox`.
- Código: `src/lib/offline/outbox/*`, `src/lib/offline/leader.ts`, `src/lib/offline/log.ts`, `features/offline/*`, mutaciones de asistencia y planilla, `lib/success-messages.ts` (variante `queued`), `router.tsx` + `paths.ts` (`/app/pendientes`).
- Preguntas abiertas: P15 (quién gana en asistencia: propuesta conflicto manual por estudiante), P16 (índice con `BLOQUE`, `COALESCE(bloque,0)`, script de duplicados previo), P17 ("Marcar todos" offline sin optimista por estudiante), P6 (bloqueador fuera del piloto).
- Go/no-go: piloto de 2 semanas, `rejected` < 1 %, 0 pérdidas, 0 duplicados.
