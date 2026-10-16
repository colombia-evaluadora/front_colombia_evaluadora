# Tasks: Escrituras offline piloto (Fase 2)

## 1. Outbox
- [x] 1.1 Stores `outbox`, `blobs`, `idmap`, `log` en `ce-offline`
- [x] 1.2 `enqueue` (dedupe < 2 s, coalescing, cuota, ventana de 14 días)
- [x] 1.3 Procesador (§6.2), backoff (§6.3), clasificación (§6.4), dependencias (§6.5)
- [x] 1.4 Líder entre pestañas y BroadcastChannel; recuperación de `inflight` > 60 s
- [x] 1.5 Blobs: copia del `File`, subida secuencial, `uploadedArchivoId`, cuotas §0.4
- [x] 1.6 Log ring buffer 500 y export sin datos personales por defecto

## 2. Handlers
- [x] 2.1 `asistencia.registrar`, `asistencia.editar`, `asistencia.marcar-todos`
- [x] 2.2 `planilla.calificar`, `planilla.calificar-bulk`, `planilla.estado-resultado`, `planilla.observacion`
- [x] 2.3 `planilla.soporte`, `planilla.soporte-quitar`, `planilla.soporte-favorito`
- [x] 2.4 `actividad.asistencia`, `actividad.estado-resultado`
- [x] 2.5 Absorber la cola en memoria de periodo cerrado (`use-solicitud-periodo-cerrado.ts`)

## 3. UX
- [x] 3.1 Banner con estados de cola, indicador del header, `PendingBadge`
- [x] 3.2 `/app/pendientes` (ruta, breadcrumb, tabla, acciones)
- [x] 3.3 Diálogo de conflictos y logout con pendientes
- [x] 3.4 `SUCCESS_MESSAGES.x.queued` y toasts de resumen

## 4. Backend (PRs separados)
- [x] 4.1 BE-1 Idempotency-Key en gateway (Redis 72 h)
- [x] 4.2 BE-2 CAS por valor en funciones de planilla (sin nueva migración duplicada)
- [x] 4.3 BE-5 índice único en asistencia + CAS por estudiante — **esquema aprobado (§0.1)**, PR propio en `sso`, script de duplicados antes del índice (P16)
- [x] 4.4 BE-7 `X-Server-Time`, BE-8 códigos de error estables

## 5. Pruebas
- [x] 5.1 Unit: backoff, classify, coalesce, DAG, cuotas, ventana de 14 días
- [x] 5.2 Integración MSW: refresh antes de flush, 401 pausa, 403, regla 75
- [x] 5.3 E2E: 40 celdas offline → cerrar → reabrir → online = 40 sin duplicados; respuesta perdida no duplica; conflicto muestra diálogo; dos pestañas
- [x] 5.4 Postman: Idempotency-Key repetida y CAS

## 6. Piloto
- [x] 6.1 Flag por usuario; solo 3–5 docentes con consentimiento mientras P6 esté pendiente
- [x] 6.2 Métricas go/no-go (§13): umbrales y forma de medir en `docs/offline/GO-NO-GO.md`; la medición queda para el piloto

## 7. PIGSE
- [x] 7.1 Outbox sin dependencias de features (handlers registrados desde afuera); port solo con pedido explícito

## Notas de implementación
- Decisiones por defecto (P15–P20) y desvío online-first: `design.md`.
- 1.1: `outbox`, `blobs` y `log` en `ce-offline` v2; `idmap` queda para la Fase 3 (no hay ids temporales en asistencia/planilla).
- 1.4: líder por Web Locks + `BroadcastChannel("ce-offline")`; con el lock, las `inflight` huérfanas vuelven a `retry` al instante (sin Web Locks, a los 60 s).
- 2.3: soportes de planilla en la outbox (el archivo viaja como blob; multipart no pasa por la Idempotency-Key del gateway).
- 2.5: "Guardar" de la solicitud de periodo cerrado encola cada nota (persistente) en vez de perderla al recargar.
- 3.4: se usó `QUEUED_MESSAGE` de `lib/offline/outbox/engine.ts` en lugar de `SUCCESS_MESSAGES.x.queued`.
- 4.1 BE-1: `IdempotencyGlobalFilter` en el gateway sobre el sso-redis (TTL 15 días, por `sub` + clave, repite la respuesta; 422 reuso; 409 en curso → la outbox reintenta; fail open).
- 4.2 BE-2: CAS de calificar con `fn_actividad_nota_version` (V496.7), `version` por celda en la planilla (V469.3) y `BODY.BASE_VERSION` (V496.8). Observación sin CAS.
- 4.3 BE-5: el índice `UQ_TASISTENCIA_SESION` ya existía (V139); CAS por estudiante en V137/V138/V141 y el bind en V496.21.
- 4.4: BE-7 `X-Server-Time` (gateway; el front registra el desfase en el log de la outbox) y BE-8 `CE409`/`CE422` → `OFFLINE_CONFLICT`/`PERIODO_CERRADO` en query-service.
- 5.2: `engine.test.ts` (refresh 401 pausa, 403, regla 55/75 → done con nota, periodo cerrado → rejected).
- 5.3: `e2e/offline-writes.spec.ts` y `e2e/offline-writes-bulk.spec.ts` (40 celdas, dos pestañas).
- 5.4: colecciones Postman de sso (asistencias y planeador-instrumentos) con los 409/422; la Idempotency-Key se cubre con tests del gateway.
- 6.2 métricas go/no-go: pendiente del piloto.
