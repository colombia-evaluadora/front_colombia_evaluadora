# Asistencia diaria (Reglas 115, 117 y 77)

Grupos en modo **Diaria**: el Responsable de grupo registra una planilla por día para todo el grupo, y el back la reparte por clase. El modo se elige en el grupo (Establecimiento § 5.3). Contrato: `SSO/postgres/migrations/V750..V749__asistencia_diaria_*.sql`.

## Ficheros

- `api/types/asistencia-diaria.ts`: filas y bodies del contrato (calendario, planilla, bloques, registrar, por-grupo, grupos, modo).
- `api/query/use-asistencia-diaria-query.ts`: hooks de calendario, planilla, bloques, por-grupo y grupos diarios.
- `api/mutations/use-asistencia-diaria-mutation.ts`: registrar (sube antes la excusa) y justificar sin archivo.
- `api/query-keys.ts`: `asistenciaKeys.diaria.*`.
- `api/schema.ts`: `asistenciaDiariaSearchSchema` (`fecha`, `sede`, `grupo`, `desde`, `periodo`).
- `utils/asistencia-diaria.ts` (+ `.test.ts`): `toEntradaDiaria`, `etiquetaGrupo` («6°A»), `opcionesBloqueLlegada` («2 · Aritmética»), `totalesPorDia`.
- `pages/asistencia-diaria-page.tsx`: planilla diaria (A.4.SES.5 / 5b).
- `pages/asistencia-page.tsx`: aviso y leyenda del modo Diaria en el calendario.
- `components/asistencia-month-grid.tsx`: entradas «Asistencia diaria · grupo» en el calendario (A.4.CAL.1a).
- `components/asistencia-por-grupo-tab.tsx`: grupos Diaria con vista de solo lectura para el docente y totales por día para el director (A.4.GRU.1a).
- `components/table/columns-asistencia-manual.tsx`: prop `opcionesBloque` para el bloque de llegada del día.
- `components/dialogs/dialog-justificar-ausencia.tsx`: prop `guardar` para el endpoint diario.
- `api/query/use-aprobaciones-asistencia-query.ts` y `components/sheets/revision-cambios-asistencia-sheet.tsx`: solicitudes `TASISTENCIA_DIARIA` en la bandeja.
- `establishment/academic-period/api/query/use-grupo-modo-asistencia.ts`: GET y PATCH del modo del grupo.
- `establishment/academic-period/components/dialogs/dialog-create-grade-group.tsx`: campo «Modo de registro de asistencia».
- `mocks/db/asistencia/asistencia-diaria.ts` y `mocks/handlers/asistencia/asistencia.ts`: MSW con la forma exacta del contrato.

## Rutas

- `/app/asistencia/diaria?fecha&sede&grupo&desde&periodo`: planilla diaria. Volver regresa al calendario o a Asistencia por grupo según `desde`.
- `/app/asistencia` (Calendario y Asistencia por grupo): sin cambios de ruta.

## Endpoints (prefijo `/eval-col`)

| Método y ruta | Uso |
|---|---|
| GET `/asistencias/diaria/calendario?SEDE&ANIO&MES[&HOY]` | Entradas del calendario. Trae `grado_valor` para el rótulo. |
| GET `/asistencias/diaria/grupos?SEDE` | Grupos Diaria que el usuario consulta, con `puede_registrar` y sus `asignaturas`. |
| GET `/asistencias/diaria/planilla?GRUPO&FECHA` | Filas de la planilla. |
| GET `/asistencias/diaria/bloques?GRUPO&FECHA` | Opciones del bloque de llegada. Vacío = sin horario. |
| POST `/asistencias/diaria/registrar` | `{GRUPO, FECHA, REGISTROS, MOTIVO?}`. Devuelve `{rows:[{resultado}]}`. |
| PATCH `/asistencias/diaria/:ID/justificar` | `{JUSTIFICACION, FUENTE}`. FUENTE es obligatoria. |
| GET `/asistencias/diaria/por-grupo?GRUPO&PERIODO` | Totales del estudiante, contando cada día una vez. |
| GET/PATCH `/grupos/:ID/modo-asistencia` | Modo del grupo; `bloqueado` y `motivo`. |
| POST `/files/eval-col/asistencias/soporte` | Excusa (pdf, jpg, png; 10 MB), igual que la planilla por clase. |

## Probado con MSW (23/11/2026)

- Calendario del Responsable de grupo: aviso, entradas por día hábil, el día inhábil sin entrada, y la leyenda.
- Planilla diaria:
  - «Todos asistieron» solo marca a quien no tiene marca.
  - Llegó tarde con «3 · Lenguaje».
  - Aviso «Se marcó No asistido en N actividades».
  - Excusa con archivo (`excusa-medica.pdf`) que queda guardada.
  - Justificar sin archivo sobre lo ya guardado.
- Período No calificable: modal «Corregir una sesión de asistencia», Enviar a aprobación y fila «Pendiente de aprobación».
- Salir con cambios sin guardar: pregunta, y Guardar guarda y luego sale.
- Asistencia por grupo:
  - Docente: solo lectura, solo su asignatura y sin enlaces a la planilla.
  - Director: «Todas» con totales por día, o una asignatura concreta.
- Coordinador: la bandeja muestra «Asistencia diaria · grupo»; Revisar y Aprobar funcionan.
- Diálogo de grupo:
  - Por clase → Diaria guarda el modo.
  - Grupo bloqueado: solo lectura con el tooltip del back.

Capturas de la sesión en el scratchpad (`asistencia-diaria/capturas/`, 01 a 12).

## Bitácora

- **23/11/2026**: primera versión (API, MSW, calendario, planilla, justificar, por grupo, aprobaciones y modo del grupo). Ese mismo día:
  - Se añadió `GET /asistencias/diaria/grupos`.
  - El rótulo del grupo pasó a usar `grado_valor` («6°A»).
  - Se mockearon `/asistencias/por-grupo/rotulo` y `/asistencias/soporte`, que faltaban.
  - Se probó en pantalla lo que había quedado pendiente.
- **23/11/2026 (ajustes finales)**:
  - Con un grupo Diaria elegido en Asistencia por grupo se oculta «Registrar sesión» (A.4.GRU.1a); con grupos Por clase no cambia.
  - Al guardar desde «¿Guardar antes de salir?», el aviso de guardado se encola con `queueNotice` y se ve en el calendario.

## Decisiones pendientes

- **Bloque de llegada 1-based.** Se muestra `NUMERO_BLOQUE + 1`, como en la planilla por clase. Falta confirmarlo con negocio.
- **Justificación sin archivo.** No se puede quitar desde la planilla diaria, porque el endpoint exige FUENTE. Falta decidir si el back acepta `null`.
- **Título del modal de motivo.** Es «Corregir…» si el día tiene algún registro activo y «Registrar una sesión pendiente» si no. Falta confirmar el criterio (algún registro o planilla completa).
- **Pruebas contra el back.** Todo se probó solo con MSW; las respuestas reales están pendientes de probar contra el back de la rama `feature/CU-1dfvn9h8j43-BACK-Asistencia-Diaria`.

## B3 Imprimir y Exportar (Asistencia por grupo)

- **Imprimir** descarga el PDF estructurado de `downloadReport("asistencia-por-grupo")` (A4 horizontal,
  membrete y pie, leyenda de marcas, sin QR). **Exportar** abre el menú PDF / Excel del mismo reporte.
- Los filtros salen de `utils/reporte-por-grupo.ts` (`armarReportePorGrupo`): `GRUPO`, `PERIODO`,
  `ASIGNATURA` (sin ella = todas las áreas), `BUSQUEDA` del buscador y `TOTALES` visibles.
- Tras descargar, `api/mutations/export.ts` registra la impresión o exportación en la Bitácora
  (`POST /audit-cval/bitacora/exportaciones`, mismo mecanismo que exportar la Bitácora); un fallo del registro no tumba la descarga.
- Se quitaron el CSV cliente y `window.print()` (`ImpresionPorGrupo`) de la pestaña.
- MSW: `asistencia-por-grupo` en `mocks/handlers/reportes.ts` y handler de `/audit-cval/bitacora/exportaciones`.
- Back: V752/V753 nuevas y V571 editada (re-aplicar).

## B6 Planillas auxiliares (Planeador, Regla 96; A.2.PLA.3)

- **Dónde:** botón «Planillas auxiliares» en la cabecera del Planeador (título de `planeador-page.tsx` y
  `planeador-unidades-page.tsx`, o sea en todas sus pestañas), junto a «Preparar sin conexión». Ruta y menús sin cambios.
- **Gate:** el botón se ve con VER en `ASISTENCIAS` (`useMenuPermission`), el mismo que exige el back
  (`fn_asistencia_assert_puede_ver`). Grupos, [Áreas] y períodos salen del alcance del usuario:
  `GET /planeador/planillas-auxiliares/grupos` (docente: su carga; director: además sus grupos; niveles 1–3: sus sedes y jornadas).
- **Modal** (`planeador/components/dialogs/dialog-planillas-auxiliares.tsx`, `useAppForm` + zod, foco al primer error):
  Tipo de planilla y Contenido con las etiquetas de la Lista de valores (`TIPO_PLANILLA_AUXILIAR`, `CONTENIDO_PLANILLA`,
  por defecto el predeterminado «En blanco»); Grado/Grupo; [Área] con el rótulo del referente del grupo
  («Dimensión» en Formativo) y «Todas»; Período de evaluación (por defecto el en curso, fechas dd/mm/aaaa);
  Columnas en blanco 1–10 (por defecto 5) solo en Listado.
- **Calificaciones y Rúbricas:** quedan en la lista pero el modal no las ofrece. Se descartó mostrarlas
  deshabilitadas con «Próximamente» porque `SelectField` (`lib/forms`) no admite opciones deshabilitadas;
  el back las rechaza con 22023. Pendientes.
- **Descarga:** `api/mutations/descargar-planilla-auxiliar.ts` → `downloadReport("planilla-auxiliar", { params: { tipo } })`
  (Asistencia A4 horizontal, Listado A4 vertical, solo PDF) y luego la Bitácora con
  `POST /audit-cval/bitacora/exportaciones` (`MODULO: PLANEADOR`, `reporte: planilla-auxiliar`, lo elegido), como B3.
- **MSW:** `mocks/handlers/planeador/planillas-auxiliares.ts` (grupos por clase, preescolar «Dimensión» y uno Diaria),
  las dos listas en `select-catalog.ts` y `planilla-auxiliar` en `reportes.ts`.
- Test: `descargar-planilla-auxiliar.test.ts` (filtros por tipo).
