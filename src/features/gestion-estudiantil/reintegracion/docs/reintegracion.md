# Ruta de Reintegración — módulo front

Estado: fases 1, 2 y 3 hechas (2026-11-13). Quedan pendientes de la sección «Pendiente» más abajo.

Tarea: CU-86e3yf6qh (Gestión Estudiantil, Ruta de Reintegración de Estudiantes, §10.1 a §10.4).

Rama: `feature/CU-86e3yf6qh-FRONT-G-estudiantil-Ruta-de-Reintegracion-de-Estudiantes`

Backend: SSO PR #992, aún sin fusionar. La base local ya lo tiene y query-service ya lo carga.

## Alcance y fuera de alcance

**En alcance**

- §10.1 Bandeja de casos de reintegración, abrir caso, detalle del caso con acciones, modales y acta de retiro.
- §10.2 Ficha del estudiante dentro del caso: datos de la matrícula, caracterización familiar y de vivienda, observaciones del profesional de trabajo social e historial de prevención.
- §10.3 Intervenciones: registro desde el caso (lectura en la pestaña).
- §10.4 Remisiones: registro desde el caso (lectura en la pestaña).

**Fuera de alcance**

- Generación del PDF del acta de retiro: no existe en reporting-service. Se muestra una vista imprimible.
- La edición de la caracterización vive en Prevención: «Actualizar caracterización» navega a esa página y requiere su menú.

## Rutas

Declaradas bajo `/app`. La ruta base coincide con el menú `REINTEGRACION` sembrado en V672.

| Ruta (sin `/app`) | Pantalla | Estado |
|---|---|---|
| `gestion-estudiantil/reintegracion` | Bandeja de casos | Hecha (fase 1) |
| `gestion-estudiantil/reintegracion/abrir` | Abrir caso | Hecha (fase 2) |
| `gestion-estudiantil/reintegracion/caso/$casoId` | Detalle del caso: cabecera, resumen y pestañas Ficha, Historial de prevención, Intervenciones y Remisiones | Hecha (fase 2) |
| `gestion-estudiantil/reintegracion/caso/$casoId/convivencia` | Abrir caso de convivencia desde el caso | Hecha (fase 3) |

Cada ruta se registra en `ROUTE_OWNERS` de `src/features/navigation/lib/route-menu-ownership.test.ts` con su `MENU.reintegracion`.

Las rutas están en `src/config/paths.ts` (`reintegracion`, `reintegracionAbrir`, `reintegracionCaso`, `reintegracionConvivencia`) y en `src/router.tsx`.

## Endpoints que consume

Base de los endpoints del módulo: `/gestion-estudiantil/reintegracion`. Las rutas, los binds, las salidas y los errores están en el contrato de endpoints (fuente única); aquí se agrupan por función, tal como las llama el front.

**Lecturas (`api/query`)**

- `GET /casos`: bandeja paginada en servidor (PAGEINDEX / PAGESIZE) con filtros.
- `GET /casos/:ID`: detalle del caso (columna `datos`). No se cachea.
- `GET /casos/:ID/intervenciones` y `GET /casos/:ID/intervenciones/:INTERVENCION`.
- `GET /casos/:ID/remisiones`: con `puede_gestionar`.
- `GET /gestion-estudiantil/remisiones-externas/:ID` (común, V669).
- `GET /gestion-estudiantil/configuracion-remisiones/plazo` (común).
- `GET /permisos`: banderas `puede_*` del establecimiento (por ejemplo `puede_abrir`).
- Opciones: `GET /opciones/matriculas`, `GET /opciones/profesionales` (por sede y jornada), `GET /opciones/listas/:lista`, `GET /opciones/funcionarios` (Digitado por del SIMPADE), `GET /opciones/razones`.

**Escrituras (`api/mutations`)**

- Casos: `POST /casos` (abrir), `PUT /casos/:ID` (modificar), `POST /casos/:ID/asignar`, `POST /casos/:ID/estado`, `POST /casos/:ID/validar`, `POST /casos/:ID/aprobar-reingreso`, `POST /casos/:ID/cerrar`, `POST /casos/:ID/acta` (respuesta JSON), `POST /casos/:ID/simpade`, `POST /casos/:ID/caso-convivencia`.
- Intervenciones: `POST /casos/:ID/intervenciones`, `PUT /casos/:ID/intervenciones/:INTERVENCION`.
- Remisiones: `POST /casos/:ID/remisiones`, `POST /gestion-estudiantil/remisiones-externas/:ID/respuesta`, `POST .../:ID/gestiones`, `PUT .../:ID/recordatorios`, `PUT /gestion-estudiantil/configuracion-remisiones/plazo`.
- Soporte de evidencias: `POST` a file-service (campo `SOPORTE`, PDF o imagen hasta 10 MB).

Todas las mutaciones usan `useReintegracionMutation`, que invalida la raíz de claves `["reintegracion"]`.

Abrir caso de convivencia reutiliza las mutaciones y la subida de soporte del módulo de convivencia.

**Permisos**

- Las acciones se habilitan con las banderas `puede_*` del caso y con `estados_siguientes` para el cambio de estado.

## Fases

1. **Hecha.** API, tipos, claves de consulta y mutaciones; bandeja con filtros, paginación, columnas y acciones por fila; ruta, breadcrumb y `ROUTE_OWNERS`.
2. **Hecha.** Página Abrir caso (G.9.ABR.1) y página de detalle del caso con ficha (G.9.CAS.1 y G.9.CAS.2): cabecera, menú de acciones, resumen, retiro, razones, acta, SIMPADE y enlaces; pestañas Ficha, Historial de prevención, Intervenciones y Remisiones.
3. **Hecha.** Modales de acciones con `dialogo-operacion-shell`: Modificar, Reasignar, Cambiar estado, Validar caso, Aprobar reingreso, Cerrar el caso, Marcar como ingresado al SIMPADE, Acta de retiro (vista imprimible), Abrir caso de convivencia y Registrar intervención (§10.3).

## Ficheros

Todos bajo `src/features/gestion-estudiantil/reintegracion/`.

**api/**

- `api/types.ts`: contrato de la Ruta (V675-V677); columnas en snake_case y binds en MAYÚSCULAS.
- `api/query-keys.ts`: claves de consulta; la raíz `reintegracionKeys.all` la invalidan todas las escrituras.
- `api/ui-mappings.ts`: etiquetas de los siete estados y colores de estado (§10.5).
- `api/query/use-casos-query.ts`: `BASE_REINTEGRACION`, bandeja (`GET /casos`) y detalle (`GET /casos/:ID`).
- `api/query/use-intervenciones-query.ts`: lista y detalle de intervenciones.
- `api/query/use-remisiones-query.ts`: remisiones del caso, remisión externa y plazo de remisiones.
- `api/query/use-opciones-query.ts`: matrículas, profesionales, listas de valores, funcionarios y razones.
- `api/query/use-permisos-query.ts`: banderas `puede_*` del establecimiento.
- `api/mutations/use-reintegracion-mutation.ts`: envoltorio de mutación que invalida la raíz de claves.
- `api/mutations/casos.ts`: abrir, modificar, asignar, estado, validar, aprobar reingreso, cerrar, acta, SIMPADE y caso de convivencia.
- `api/mutations/intervenciones.ts`: registrar y modificar intervención; subida de soporte a file-service.
- `api/mutations/remisiones.ts`: registrar remisión, respuesta, gestión, recordatorios y plazo.

**pages/**

- `pages/reintegracion-page.tsx`: bandeja de casos (Gestión Estudiantil §10).
- `pages/abrir-caso-page.tsx`: Abrir caso de reintegración (§10.1).
- `pages/caso-detalle-page.tsx`: detalle del caso (G.9.CAS.1-2); no se cachea.
- `pages/abrir-convivencia-page.tsx`: Abrir caso de convivencia desde el caso (Regla 24).

**hooks/**

- `hooks/use-casos-lista.tsx`: consulta, tabla y acciones de la bandeja; Sede y Jornada ocultas de entrada.
- `hooks/use-casos-filtros.ts`: búsqueda, filtros aplicados y borrador del panel; cascada Sede → Jornada.
- `hooks/use-abrir-caso-form.ts`: estado, validación y envío de Abrir caso.
- `hooks/use-abrir-convivencia-form.ts`: estado, validación y envío de Abrir caso de convivencia.
- `hooks/use-navegacion-reintegracion.ts`: navegación entre bandeja, abrir caso, caso, convivencia y el formulario de caracterización de Prevención.
- `hooks/use-volver-reintegracion.ts`: «Atrás» del historial; sin historial, a la bandeja.

**components/**

- `components/columns-casos.tsx`: columnas de la bandeja (todas ocultables; `meta.label` para «Columnas visibles»).
- `components/acciones-caso.tsx`: las once acciones de una fila, en el orden de §10.1.
- `components/menu-acciones-caso.tsx`: acciones de la fila: cuatro iconos al pasar el ratón y el resto en el menú; las no aplicables van deshabilitadas.
- `components/badges-caso.tsx`: badge de estado del caso y «Pendiente de validación».
- `components/search-casos.tsx`: buscador de la bandeja y su panel de filtros.
- `components/campos-razones.tsx`: razones del abandono agrupadas por dimensión (Anexo A), con «Otra razón».
- `components/formulario-abrir-caso.tsx`: campos de Abrir caso; Origen y Fecha de apertura son de solo lectura.
- `components/formulario-abrir-convivencia.tsx`: campos de Abrir caso de convivencia.
- `components/use-dialogos-caso.tsx`: qué acción abre un modal; «ver» y «convivencia» navegan.

**components/detalle/**

- `caso-detalle-contenido.tsx`: cabecera, resumen y las cuatro pestañas.
- `encabezado-caso.tsx`: «Caso · Estudiante · grado/grupo», badges y acciones.
- `resumen-caso.tsx`: origen, apertura, profesional, retiro, razones, acta, SIMPADE y vínculos.
- `tab-ficha.tsx`: matrícula (solo lectura), caracterización y observaciones del profesional de trabajo social.
- `bloque-caracterizacion.tsx`: caracterización del año, de solo lectura, con «Actualizar caracterización».
- `tab-historial.tsx`: línea de tiempo del historial de prevención del estudiante.
- `tab-intervenciones.tsx`: intervenciones del caso (solo lectura) y «Registrar intervención».
- `tab-remisiones.tsx`: remisiones del caso (solo lectura).

**components/dialogos/**

- `resumen-caso-dialogo.tsx`: línea de contexto bajo el título de los modales.
- `use-dialogos-caso.tsx` (ver arriba) y `dialogo-con-caso.tsx`: cargan el caso que necesita el diálogo y lo montan.
- `dialogo-modificar.tsx`: Modificar el caso (alta complejidad, razones con causa principal, observaciones).
- `dialogo-asignar.tsx`: Reasignar o Asignar el profesional de la sede y jornada del caso.
- `dialogo-estado.tsx`: cambio de estado solo entre `estados_siguientes`; Diagnóstico pide razones.
- `dialogo-validar.tsx`: Validar o Devolver (observación de 10 a 500).
- `dialogo-aprobar-reingreso.tsx`: confirmación de aprobar reingreso.
- `dialogo-cerrar.tsx`: cierre con motivo; la reevaluación abre un caso nuevo vinculado.
- `dialogo-simpade.tsx`: marcar como ingresado al SIMPADE (fecha no posterior a hoy; Digitado por).
- `dialogo-acta.tsx`: hoja imprimible del acta de retiro.
- `dialogo-intervencion.tsx`: secciones de la intervención con su máximo.
- `dialogo-remision.tsx`: registrar remisión (entidad, fecha, motivo y ajuste de plazo opcional).

**utils/**

- `utils/razones.ts`: razones del abandono como las edita el formulario; agrupa por dimensión en el orden del Anexo A.

**docs/**

- `docs/reintegracion.md`: este documento.

## Probado

Verificado el 2026-11-13.

- Verificación de código: `tsc -b` sin errores; oxlint sin hallazgos; vitest unit 1379/1379.
- Bandeja: filtros, paginación y acciones de cada fila guiadas por banderas.
- Abrir caso: validaciones del formulario.
- Detalle: ficha, historial de prevención, intervenciones y remisiones.
- Flujo de estados: Pendiente → En contacto (requiere intervención Realizada) → Diagnóstico (con razones) → Intervención.
- Remitir y reasignar.
- Cerrar con motivo y con reevaluación (caso nuevo vinculado).
- Alta complejidad: pendiente de validación, devolver y validar.
- Observaciones guardadas por Trabajo social.
- Orientación: acciones deshabilitadas.
- Caracterización: caso con caracterización confirmada, caso sin diligenciar, y «Actualizar caracterización» como Rector, Trabajo social y Orientación.

**Sin probar (en curso)**

- Guardar una caracterización completa desde cero.
- Usuario sin acceso a lo sensible.
- Trabajo social sin caso asignado.
- Guardado de un caso de convivencia.
- Subida de evidencias.
- SIMPADE, acta y aprobar reingreso (no hay casos con retiro para probarlos).

## Pendiente

- UI de registrar gestión, respuesta, recordatorios y plazo de remisiones (las mutaciones existen en `api/mutations/remisiones.ts`).
- Detalle y descarga de remisión.
- Edición de intervención y ficha de visita.
- Acta sin PDF: hoy es una vista imprimible; falta el PDF de reporting-service.
- La página de edición de caracterización es de Prevención y requiere ese menú.

## Decisiones

- **Acciones guiadas por el backend.** Cada acción se habilita con su bandera `puede_*` y con `estados_siguientes` para el cambio de estado. Las acciones no permitidas se deshabilitan, no se ocultan. «Remitir» queda deshabilitado mientras no tenga bandera (§10.4).
- **Origen y Fecha de apertura no son editables.** Son de solo lectura: Origen es «Apertura manual» y la fecha es la del día de apertura. La especificación gana sobre el prototipo en este punto.
- **Acceso por menú.** La pantalla se controla con `useMenuPermission("REINTEGRACION")`.
- **Colores de estado (§10.5).** Pendiente: advertencia. En contacto, Diagnóstico e Intervención: informativo. Reingreso aprobado y Permanencia verificada: éxito. Cerrado: neutro. Se mapean con `commons/utils/badge-color.ts`. Badges extra: «Pendiente de validación» y «Alta complejidad».
- **Reglas de /ge-front aplicadas.** Reutilizar `DataTable`, `AccionesFila` y `anchoAccionesFila`, `Field outlined`, `DatePicker`, `ComboOpciones`, `TextoLargo`, `Alert`, `dialogo-operacion-shell`, `useCatalogo`, `formatFecha` y `abreviarPersona`. Columnas ocultables; Sede y Jornada ocultas por defecto. Etiquetas de lista, nunca códigos. Fechas dd/mm/aaaa. Estado vacío «No hay casos de reintegración.». Errores del backend mostrados tal cual.

## Decisiones pendientes

- **Celdas pequeñas del tablero.** Decisión pendiente.
- **Motivo de la novedad del acta.** El acta necesita el motivo de la novedad y el backend hoy no lo entrega. Pendiente de confirmar con el backend o con producto.
- **Caracterización familiar (§9.8) en backend.** La ficha muestra `Alert` cuando `caracterizacion_disponible = false`: «El estudiante aún no tiene la caracterización familiar y de vivienda del año.». El campo ya se consume; falta que el backend lo entregue completo (PR #992).

## Bitácora

**2026-11-13**

- Plan del front aprobado y arranque de la fase 1: API, tipos, claves, mutaciones, bandeja y ruta.
- Fase 1 cerrada: bandeja con filtros, paginación, columnas y acciones guiadas por banderas.
- Fase 2 hecha: Abrir caso, detalle del caso con ficha, historial, intervenciones y remisiones.
- Fase 3 hecha: modales de acciones, acta de retiro en vista imprimible y Abrir caso de convivencia.
- Pestaña Ficha con caracterización (confirmada, sin diligenciar, actualizar como Rector, Trabajo social y Orientación).
- Verificación: `tsc -b` sin errores, oxlint sin hallazgos, vitest unit 1379/1379.
