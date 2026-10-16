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
- [ ] 2.3 `planilla.soporte`, `planilla.soporte-quitar`, `planilla.soporte-favorito`
- [x] 2.4 `actividad.asistencia`, `actividad.estado-resultado`
- [ ] 2.5 Absorber la cola en memoria de periodo cerrado (`use-solicitud-periodo-cerrado.ts`)

## 3. UX
- [x] 3.1 Banner con estados de cola, indicador del header, `PendingBadge`
- [x] 3.2 `/app/pendientes` (ruta, breadcrumb, tabla, acciones)
- [x] 3.3 Diálogo de conflictos y logout con pendientes
- [x] 3.4 `SUCCESS_MESSAGES.x.queued` y toasts de resumen

## 4. Backend (PRs separados)
- [ ] 4.1 BE-1 Idempotency-Key en gateway (Redis 72 h)
- [ ] 4.2 BE-2 CAS por valor en funciones de planilla (sin nueva migración duplicada)
- [x] 4.3 BE-5 índice único en asistencia + CAS por estudiante — **esquema aprobado (§0.1)**, PR propio en `sso`, script de duplicados antes del índice (P16)
- [ ] 4.4 BE-7 `X-Server-Time`, BE-8 códigos de error estables

## 5. Pruebas
- [x] 5.1 Unit: backoff, classify, coalesce, DAG, cuotas, ventana de 14 días
- [ ] 5.2 Integración MSW: refresh antes de flush, 401 pausa, 403, regla 75
- [ ] 5.3 E2E: 40 celdas offline → cerrar → reabrir → online = 40 sin duplicados; respuesta perdida no duplica; conflicto muestra diálogo; dos pestañas
- [ ] 5.4 Postman: Idempotency-Key repetida y CAS

## 6. Piloto
- [x] 6.1 Flag por usuario; solo 3–5 docentes con consentimiento mientras P6 esté pendiente
- [ ] 6.2 Métricas go/no-go (§13)

## 7. PIGSE
- [x] 7.1 Outbox sin dependencias de features (handlers registrados desde afuera); port solo con pedido explícito

## Notas de implementación
- Decisiones por defecto (P15–P20) y desvío online-first: `design.md`.
- 1.1: `outbox`, `blobs` y `log` en `ce-offline` v2; `idmap` queda para la Fase 3 (no hay ids temporales en asistencia/planilla).
- 1.4: líder por Web Locks + `BroadcastChannel("ce-offline")`; sin Web Locks, una sola pestaña procesa por lote en curso (sin lease en IndexedDB).
- 2.3 (soportes de planilla: subir/quitar/favorita) sigue **solo en línea** (D-F2-12); los soportes de asistencia sí se encolan como blobs.
- 2.5 (absorber la cola en memoria de periodo cerrado) queda pendiente: la vista previa/solicitud de periodo cerrado sigue solo en línea.
- 3.4: se usó `QUEUED_MESSAGE` de `lib/offline/outbox/engine.ts` en lugar de `SUCCESS_MESSAGES.x.queued`.
- 4.1 BE-1 (Idempotency-Key en gateway con Redis) y 4.2 BE-2 (CAS de planilla) quedan pendientes: el front ya manda la clave y `BASE_VERSION` cuando la conoce.
- 4.3 BE-5: el índice `UQ_TASISTENCIA_SESION` ya existía (V139, `COALESCE(bloque,0)`); se agregó el CAS por estudiante (V137/V138/V141/V221).
- 4.4: BE-8 con SQLSTATE `CE409` → 409 `OFFLINE_CONFLICT` (+ `detail` JSON) y `CE422` → 422 `PERIODO_CERRADO` en query-service; BE-7 (`X-Server-Time`) pendiente.
- 5.2 (integración MSW de refresh/401/403/regla 75) cubierta en unit (`engine.test.ts`) salvo regla 75; 5.4 Postman: colección de asistencias en sso.
- 6.2 métricas go/no-go: pendiente del piloto.
- 5.3 parcial: E2E `e2e/offline-writes.spec.ts` (encolar con respuesta perdida → recargar → sincronizar una vez; conflicto → resolver; logout con pendientes). "40 celdas sin duplicados" y "respuesta perdida no duplica" están en `engine.test.ts`; falta el E2E de dos pestañas.
