# Tasks: Resto del alcance offline (Fase 4)

## 1. Referentes curriculares
- [x] 1.1 Handlers `referente.enunciado.crear|editar|eliminar` y `referente.evidencia.crear` (una op por evidencia)
- [x] 1.2 Handler `referente.estado`; inactivar sin red deshabilitado (requiere consultar impacto)
- [x] 1.3 Diálogos con `useOfflineWritable` y aviso `QUEUED_MESSAGE`

## 2. Informes
- [x] 2.1 P8: se aprueba solo la edición manual; handler `informe.observacion` (guardar/eliminar fusionados)
- [x] 2.2 "Generar con IA" deshabilitado sin red
- [x] 2.3 Historial del informe persistido con `estudiantesMeta`

## 3. Consulta sin red
- [x] 3.1 Excepciones de solo consulta en `online-only-paths.ts` (periodos, edición de periodo)
- [x] 3.2 Guardar horario y asignaciones deshabilitado sin red

## 4. Cierre
- [x] 4.1 Matriz Playwright Chromium/Firefox/WebKit (`playwright.matrix.config.ts`)
- [x] 4.2 Checklist manual multi-navegador (`docs/offline/CHECKLIST-MULTINAVEGADOR.md`)
- [x] 4.3 Métricas go/no-go (`docs/offline/GO-NO-GO.md`)
- [x] 4.4 Plan del port a PIGSE (`docs/offline/PORT-PIGSE.md`), sin código
