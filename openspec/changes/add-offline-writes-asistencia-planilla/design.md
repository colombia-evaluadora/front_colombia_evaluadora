# Design: Escrituras offline piloto (Fase 2)

Fuente: `docs/offline/PLAN-offline.md` §3–§7, §8.8–8.10, §10, §11 Fase 2.

## Arquitectura

- `src/lib/offline/outbox/`: infraestructura sin dependencias de features.
  - `types.ts` — op, estados, contrato del handler.
  - `policy.ts` — funciones puras: backoff, clasificación de errores, selección de ops listas (FIFO por `entityKey` + `dependsOn`), resumen, ventana de 14 días.
  - `store.ts` — CRUD sobre `ce-offline` (`outbox`, `blobs`, `log`), con fallback en memoria si no hay IndexedDB; emite cambios por `BroadcastChannel("ce-offline")`.
  - `registry.ts` — handlers registrados desde los features.
  - `processor.ts` — lote de sincronización con líder único (Web Locks; sin Web Locks, lease en `meta`).
  - `run-or-queue.ts` — punto de entrada de las mutaciones.
  - `hooks.ts` — `useOutboxSummary`, `useOutboxOps`, `usePendingFor`, `useOfflineWritable`.
- `src/features/offline/`: página `/app/pendientes`, indicador del header, `PendingBadge`, diálogo de conflicto, diálogo de logout con pendientes, registro de handlers.

## Decisiones tomadas por defecto (revisables)

El usuario no respondió P15–P20. Se tomaron defaults conservadores, coherentes con el plan; cualquiera se puede revisar sin cambiar la arquitectura.

| # | Decisión | Detalle |
|---|---|---|
| D-F2-1 (P15) | **Conflicto manual por celda/estudiante; el servidor gana hasta que el usuario decida.** | Cada escritura encolada lleva la **versión base** que vio el docente (`BASE_VERSION` = `updated_at` del registro/celda). Si el servidor tiene otra versión responde 409 `OFFLINE_CONFLICT` con el valor y la versión actuales. La op queda `conflict` y no se aplica nada; el usuario elige "Conservar el mío" (reenvía con la versión del servidor), "Usar el del servidor" (descarta) o "Editar". Aplica igual al docente vs. coordinador. |
| D-F2-2 | **TTL de la outbox = ventana de 14 días** de la sesión offline. | Pasados 14 días desde `lastOnlineAuthAt` no se aceptan ops nuevas (las existentes se conservan y se envían al reconectar). Aviso desde el día 12. |
| D-F2-3 | **Periodo cerrado = `rejected` visible**. | Si al sincronizar el periodo ya no es calificable y el backend responde 422 `PERIODO_CERRADO`, la op queda `rejected` con el motivo. Si el backend convierte el cambio en solicitud (regla 55/75, `solicitudes_pendientes`), la op queda `done` con la nota "quedó como solicitud al coordinador". Nunca se pierde en silencio. |
| D-F2-4 | **Reenvío idempotente con `Idempotency-Key`**. | La clave se fija al encolar y se reutiliza en cada reintento. El gateway guarda `(sub, key)` 72 h y repite la respuesta; misma clave con otro body → 422 `IDEMPOTENCY_KEY_REUSED` (op `rejected`, fatal). |
| D-F2-5 | **FIFO por entidad**. | Una op se envía solo si es la más antigua no terminada de su `entityKey` y sus `dependsOn` están `done`. Concurrencia 3 entre entidades distintas. |
| D-F2-6 | **La outbox solo se borra tras sync exitosa o descarte explícito**. | El logout con pendientes muestra "Sincronizar y salir" / "Salir y conservar en este equipo" / "Descartar y salir"; nunca borra sin avisar. Las ops `done` se purgan a las 24 h. |
| D-F2-7 | **Online-first** (desvío del plan §6.1.3, aprobado). | Con conexión, la mutación se envía directo con su `Idempotency-Key` (mismo comportamiento y mensajes que hoy, incluida la regla 75). Solo si falla **por red**, o si ya no hay conexión, o si hay ops pendientes de la misma entidad (para no romper el FIFO), se encola con la **misma** clave. Así el reenvío del encolado no duplica lo que pudo haber llegado. |
| D-F2-8 | **Solo piloto y modo personal**. | Escrituras offline habilitadas solo si: modo offline `full` (kill-switch), equipo `personal` (que solo se permite a usuarios del piloto, `pilot.ts`) y sesión dentro de 14 días. Fuera de eso los botones siguen con `useOnlineOnly`. |
| D-F2-9 (P16) | Índice único de asistencia con `COALESCE(bloque,0)` y contexto asignatura/actividad; script de duplicados previo en la migración. | |
| D-F2-10 (P17) | "Marcar todos" offline sin optimista por estudiante. | El día muestra "Pendiente" y "Se marcará Asistió a quienes no tengan registro cuando se sincronice." |
| D-F2-11 (P18–P20) | Se mantienen las propuestas del plan. | Recursos > 10 MB solo online; orden real de la saga (Fase 3); el SW sirve el shell de `/verificar/b`. |
| D-F2-12 | Adjuntos offline (soportes) en Fase 2: **solo asistencia**. | Las evidencias de observación de planilla nuevas siguen siendo solo en línea; observación de texto sí se encola. |
| D-F2-13 | El SW no se actualiza mientras haya ops `inflight` o un lote en curso (`isSyncInProgress`). | |

## Flujo de sincronización

1. Disparadores: `online` del `connectivityStore`, `visibilitychange`, encolado, mensaje del SW (`sync` → `outbox:wake`), "Sincronizar ahora", temporizador del `nextAttemptAt` mínimo.
2. Lock `ce-outbox` (Web Locks, `ifAvailable`). Otra pestaña ya procesa → salir.
3. Asegurar token: si no hay, refresh (inyectado desde `lib/auth`). 401 → `needsLogin`, se pausa y se conserva la cola.
4. Ops del `sub` actual, listas, en orden; `send` con `Idempotency-Key` y `background: true`.
5. Clasificación (§6.4): red/502-524/429 → retry sin límite; 5xx → retry hasta 8; 401 → auth; 409 `OFFLINE_CONFLICT` → conflict; otros 409/400/422/404/403 → rejected; idempotencia reusada → rejected (fatal).
6. Fin del lote: invalidación agrupada, toast de resumen, `notifySyncIdle()` para el SW.
