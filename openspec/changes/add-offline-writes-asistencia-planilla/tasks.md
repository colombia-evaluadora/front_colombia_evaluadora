# Tasks: Escrituras offline piloto (Fase 2)

## 1. Outbox
- [ ] 1.1 Stores `outbox`, `blobs`, `idmap`, `log` en `ce-offline`
- [ ] 1.2 `enqueue` (dedupe < 2 s, coalescing, cuota, ventana de 14 días)
- [ ] 1.3 Procesador (§6.2), backoff (§6.3), clasificación (§6.4), dependencias (§6.5)
- [ ] 1.4 Líder entre pestañas y BroadcastChannel; recuperación de `inflight` > 60 s
- [ ] 1.5 Blobs: copia del `File`, subida secuencial, `uploadedArchivoId`, cuotas §0.4
- [ ] 1.6 Log ring buffer 500 y export sin datos personales por defecto

## 2. Handlers
- [ ] 2.1 `asistencia.registrar`, `asistencia.editar`, `asistencia.marcar-todos`
- [ ] 2.2 `planilla.calificar`, `planilla.calificar-bulk`, `planilla.estado-resultado`, `planilla.observacion`
- [ ] 2.3 `planilla.soporte`, `planilla.soporte-quitar`, `planilla.soporte-favorito`
- [ ] 2.4 `actividad.asistencia`, `actividad.estado-resultado`
- [ ] 2.5 Absorber la cola en memoria de periodo cerrado (`use-solicitud-periodo-cerrado.ts`)

## 3. UX
- [ ] 3.1 Banner con estados de cola, indicador del header, `PendingBadge`
- [ ] 3.2 `/app/pendientes` (ruta, breadcrumb, tabla, acciones)
- [ ] 3.3 Diálogo de conflictos y logout con pendientes
- [ ] 3.4 `SUCCESS_MESSAGES.x.queued` y toasts de resumen

## 4. Backend (PRs separados)
- [ ] 4.1 BE-1 Idempotency-Key en gateway (Redis 72 h)
- [ ] 4.2 BE-2 CAS por valor en funciones de planilla (sin nueva migración duplicada)
- [ ] 4.3 BE-5 índice único en asistencia + CAS por estudiante — **esquema aprobado (§0.1)**, PR propio en `sso`, script de duplicados antes del índice (P16)
- [ ] 4.4 BE-7 `X-Server-Time`, BE-8 códigos de error estables

## 5. Pruebas
- [ ] 5.1 Unit: backoff, classify, coalesce, DAG, cuotas, ventana de 14 días
- [ ] 5.2 Integración MSW: refresh antes de flush, 401 pausa, 403, regla 75
- [ ] 5.3 E2E: 40 celdas offline → cerrar → reabrir → online = 40 sin duplicados; respuesta perdida no duplica; conflicto muestra diálogo; dos pestañas
- [ ] 5.4 Postman: Idempotency-Key repetida y CAS

## 6. Piloto
- [ ] 6.1 Flag por usuario; solo 3–5 docentes con consentimiento mientras P6 esté pendiente
- [ ] 6.2 Métricas go/no-go (§13)

## 7. PIGSE
- [ ] 7.1 Outbox sin dependencias de features (handlers registrados desde afuera); port solo con pedido explícito
