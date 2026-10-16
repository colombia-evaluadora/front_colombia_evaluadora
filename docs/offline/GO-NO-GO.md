# Métricas go/no-go offline

Fuente: [`PLAN-offline.md`](PLAN-offline.md) §11 (umbrales por fase) y §13 (métricas). Se miden en `test` (testv2) y en el piloto; hasta que exista `POST /eval-col/telemetria/offline` (P11, no implementado), se leen del **registro local** (ring log de IndexedDB, exportable desde `/app/pendientes` → "Descargar registro") que cada docente del piloto envía al cierre de la semana.

## Umbrales

| Fase | Métrica | Umbral go | Cómo medir |
|---|---|---|---|
| 0 | Tamaño persistido promedio por usuario | < 20 MB | `navigator.storage.estimate()` en el registro |
| 0 | Hidratación del cache | < 300 ms p95 | evento `hydrate` del ring log |
| 0 | Errores de Service Worker | 0 en 1 semana de `test` | consola / evento `sw-error` |
| 1 | Pantallas offline que abren sin red | 100 % del checklist (pasos 2, 7) | [`CHECKLIST-MULTINAVEGADOR.md`](CHECKLIST-MULTINAVEGADOR.md) |
| 2 | Tasa de `rejected` | < 1 % de ops encoladas | eventos `enqueue` vs `rejected` |
| 2 | Pérdidas reportadas | 0 | reporte de docentes + comparar outbox vs auditoría |
| 2 | Duplicados | 0 en auditoría | `/registro-de-actividad`: misma `Idempotency-Key` con dos inserts |
| 2 | Tiempo en cola | p95 < 10 min tras volver la red | `createdAt` → `done` |
| 3 | Sagas del planeador incompletas | 0 actividades a medio guardar tras sincronizar | revisión manual + `blocked` |
| 4 | Conflictos en referentes/observaciones | < 2 % de ops de esos `kind` | eventos `conflict` por `kind` |
| Todas | Checklist manual | sin ✘ en pasos 2–11 | checklist |

## Decisión

- **Go**: todos los umbrales de la fase en verde durante el piloto de 2 semanas (3–5 docentes, §11 Fase 2) y P6 resuelta para habilitar fuera del piloto.
- **No-go parcial**: un `kind` supera su umbral → se deshabilita ese handler (flag por feature, §11.6) y el resto sigue.
- **No-go total**: pérdida o duplicado confirmado → kill-switch `VITE_APP_OFFLINE=read` (o `off`) según [`KILL-SWITCH.md`](KILL-SWITCH.md).

## Estado (2026-10-16)

Implementación de las fases 0–2 y 4 en `dev`; Fase 3 en curso. **Ninguna métrica medida todavía**: requieren el piloto en `test`. P6 sigue pendiente (bloquea habilitar escrituras fuera del piloto).
