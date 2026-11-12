# Prevención y retención — módulo front

Estado: alcance actual implementado y probado en navegador (ver «Probado»). Tarea CU-86e3yf6qa.

Rama: `feature/CU-86e3yf6qa-FRONT-G-estudiantil-Prevencion-y-retencion-tablero-valoraciones-y-planes-gestion-de-alertas-e-indicadores`

## Alcance y fuera de alcance

**En alcance**

- 9.1 Tablero de alertas (G.8.TAB.1–7).
- 9.2 Señal `REPORTE_DOCENTE` dentro del tablero.
- 9.3 Valoraciones y planes: listado, detalle de plan y de valoración, avance, aceptación presencial, marcar, anular plan y valoración, modificar plan.
- 9.4 Indicadores (G.8.IND.1–2), incluido IE-01 (`/indicadores/gestion`) y export Excel con clave `prevencion-indicadores`.
- 9.5 Parámetros de riesgo (G.10.RIE.1): pestaña solo para el Rector.
- 9.6 Salud mental: listado, reporte, valoración (con modal crítico), atención y cierre con bloqueo.
- Regla 24: abrir caso de convivencia desde el plan (página que reutiliza piezas de Convivencia).

**Fuera de alcance**

- 9.7–9.11, territorial y metas.
- SIMPADE (G.8.VAL.4): sin estructura. El botón se muestra deshabilitado.
- Gestionar (9.11, G.8.GAL): sin backend. La acción se muestra deshabilitada.

## Decisiones

**2026-11-12**

- Parámetros de riesgo, Salud mental e Indicadores son pestañas dentro de Prevención. Cada una aparece solo si su sondeo de acceso responde: `GET /parametros`, `GET /salud-mental` y `GET /indicadores`. Con 403 la pestaña no se muestra. Por rol: Docente ve Tablero y Valoraciones.
- Establecimiento y sede/jornada salen de `GET /prevencion/opciones/sedes-jornadas` sin `ESTABLECIMIENTO` (requiere el cambio de SSO PR #994). Nunca de `/informes/sedes`.
- Diseño: páginas propias para lo que el prototipo dibuja como página (historial, valorar, nuevo y editar plan, detalle de plan, detalle de valoración, señal, reporte, abrir caso). Diálogos solo para modales (ofrecer plan, avance, aceptación, marcar, anular, valoración crítica, atención, cerrar señal).
- Lógica en hooks; componentes atómicos. Las acciones de fila son `AccionesFila`: iconos en el hover si son cuatro o menos, cuatro iconos más ⋮ si son cinco o más.
- «Columnas visibles» lista todas las columnas salvo las de acciones (`accessorFn` + `meta.label`).
- Páginas a todo el ancho; `max-w` solo en diálogos.
- Las acciones que llegan con la bandera en `false` se muestran deshabilitadas.
- El nivel de riesgo puede llegar `null` (rol sin acceso sensible): se muestra «—».
- Las listas (`NIVEL_RIESGO`, `TIPO_ACCION_PREVENTIVA`) se muestran por su etiqueta, nunca por código.
- La aceptación presencial sube primero el soporte (`POST /prevencion/soporte`, multipart, campo `SOPORTE`, PDF o imagen de hasta 10 MB) y envía el pk resultante como `FK_SOPORTE`.

## Rutas de la app

Declaradas en `src/config/paths.ts` (bajo `/app`):

| Ruta (sin `/app`) | Pantalla |
|---|---|
| `gestion-estudiantil/prevencion-retencion` | Página de Prevención con pestañas (menú `PREVENCION_RETENCION`, V639) |
| `gestion-estudiantil/prevencion-retencion/valorar` | Valorar (página) |
| `gestion-estudiantil/prevencion-retencion/plan/nuevo` | Nuevo plan |
| `gestion-estudiantil/prevencion-retencion/plan/$planId/editar` | Modificar plan |
| `gestion-estudiantil/prevencion-retencion/plan/$planId` | Detalle de plan |
| `gestion-estudiantil/prevencion-retencion/plan/$planId/caso-convivencia` | Abrir caso de convivencia (Regla 24) |
| `gestion-estudiantil/prevencion-retencion/valoracion/$valoracionId` | Detalle de valoración |
| `gestion-estudiantil/prevencion-retencion/historial/$matricula` | Historial del estudiante |
| `gestion-estudiantil/prevencion-retencion/salud-mental/nuevo` | Reporte de salud mental |
| `gestion-estudiantil/prevencion-retencion/salud-mental/$senalId` | Detalle de señal de salud mental |

## Endpoints usados

Prefijo de servicio: `eval-col`, base `/gestion-estudiantil/prevencion`. Solo los del alcance.

**Tablero**

- `GET /tablero`
- `GET /estudiantes/:MATRICULA/alertas`
- `GET /estudiantes/:MATRICULA/historial`
- `POST /valoraciones`
- `POST /planes`
- `PUT /planes/:ID`

**Valoraciones y planes**

- `GET /valoraciones`
- `GET /valoraciones/:ID`
- `POST /valoraciones/:ID/anular`
- `GET /planes/:ID`
- `POST /planes/:ID/marcar`
- `POST /planes/:ID/anular`
- `POST /planes/:ID/aceptacion-presencial`
- `GET /planes/:ID/soporte`
- `POST /planes/:ID/caso-convivencia` (Regla 24)
- `POST /soporte` (file-service)
- `POST /acciones/:ID/avances`

**Salud mental**

- `GET /salud-mental`
- `GET /salud-mental/:ID`
- `POST /salud-mental`
- `POST /salud-mental/:ID/valoracion`
- `POST /salud-mental/:ID/atenciones`
- `POST /salud-mental/:ID/cerrar`

**Indicadores**

- `GET /indicadores`
- `GET /indicadores/gestion`
- `POST /indicadores/exportar` (reporting-service, clave `prevencion-indicadores`)

**Parámetros de riesgo**

- `GET /parametros`
- `PUT /parametros`

**Opciones de filtros y formularios**

- `GET /opciones/estudiantes`
- `GET /opciones/estudiantes-salud-mental`
- `GET /opciones/responsables`
- `GET /opciones/grupos`
- `GET /opciones/periodos`
- `GET /opciones/periodos-academicos`
- `GET /opciones/motivos-retiro`
- `GET /opciones/sedes-jornadas`
- `GET /select/:CATEGORIA` (`NIVEL_RIESGO`, `TIPO_ACCION_PREVENTIVA`)

## Ficheros

Rutas relativas a `src/features/gestion-estudiantil/prevencion/`.

**api/** (16)

- `api/query-keys.ts`: claves de React Query del módulo.
- `api/types.ts`: tipos de filas y cuerpos de escritura.
- `api/ui-mappings.ts`: etiquetas y colores de estados y niveles.
- `api/query/use-tablero-query.ts`: tablero, alertas, historial y `BASE_PREVENCION`.
- `api/query/use-valoraciones-query.ts`: listado y detalle de valoraciones, plan y soporte.
- `api/query/use-salud-mental-query.ts`: listado, acceso y detalle de señal.
- `api/query/use-opciones-prevencion-query.ts`: opciones de filtros y formularios.
- `api/query/use-parametros-indicadores-query.ts`: parámetros, indicadores e IE-01.
- `api/mutations/use-prevencion-mutation.ts`: base de mutaciones que invalida las claves.
- `api/mutations/valoraciones.ts`: valorar, anular valoración.
- `api/mutations/planes.ts`: crear, modificar, marcar y anular plan.
- `api/mutations/soporte-prevencion.ts`: subida del soporte de aceptación.
- `api/mutations/caso-convivencia.ts`: abrir caso de convivencia desde el plan.
- `api/mutations/salud-mental.ts`: reportar, valorar, atender y cerrar señal.
- `api/mutations/parametros.ts`: guardar parámetros de riesgo.
- `api/mutations/exportar-indicadores.ts`: export Excel de indicadores.

**hooks/** (16)

- `hooks/use-ambito-prevencion.ts`: establecimiento y sede/jornada del usuario.
- `hooks/use-navegacion-prevencion.ts`: navegación entre pantallas del módulo.
- `hooks/use-selector-estudiante-prevencion.ts`: selector de estudiante.
- `hooks/use-tablero-filtros.ts`: filtros del tablero.
- `hooks/use-valoraciones-filtros.ts`: filtros del listado de valoraciones.
- `hooks/use-indicadores-filtros.ts`: filtros de indicadores.
- `hooks/use-salud-mental-filtros.ts`: filtros del listado de salud mental.
- `hooks/use-salud-mental-lista.ts`: listado de señales.
- `hooks/use-valorar-form.ts`: formulario de valoración.
- `hooks/use-plan-form.ts`: formulario de plan.
- `hooks/use-opciones-plan.ts`: opciones de los selectores del plan.
- `hooks/use-plan-detalle.ts`: datos del detalle de plan.
- `hooks/use-valoracion-detalle.ts`: datos del detalle de valoración.
- `hooks/use-abrir-caso-form.ts`: formulario de abrir caso de convivencia.
- `hooks/use-reporte-salud-mental-form.ts`: formulario de reporte de salud mental.
- `hooks/use-senal-detalle.ts`: datos del detalle de señal.

**utils/** (9)

- `utils/alertas.ts`: reglas de presentación de alertas.
- `utils/historial.ts`: agrupación de la línea de tiempo.
- `utils/indicadores.ts`: cálculo y formato de indicadores.
- `utils/indicadores.test.ts`: pruebas de `indicadores.ts`.
- `utils/parametros.ts`: validación y formato de parámetros de riesgo.
- `utils/parametros.test.ts`: pruebas de `parametros.ts`.
- `utils/formularios.ts`: validaciones de formularios de valoración y plan.
- `utils/formularios-seguimiento.ts`: validaciones de avance, aceptación y marcado.
- `utils/formularios-salud-mental.ts`: validaciones de salud mental.

**components/** (53)

- tablero/ (4)
  - `components/tablero/tablero-tab.tsx`: pestaña Tablero de alertas.
  - `components/tablero/columns-tablero.tsx`: columnas del tablero.
  - `components/tablero/search-tablero.tsx`: buscador y filtros del tablero.
  - `components/tablero/menu-acciones-tablero.tsx`: acciones de fila del tablero.
- dialogos/ (6)
  - `components/dialogos/use-dialogos-prevencion.tsx`: apertura de los diálogos del módulo.
  - `components/dialogos/dialog-ofrecer-plan.tsx`: ofrecer plan tras valorar.
  - `components/dialogos/dialog-registrar-avance.tsx`: registrar avance de acción.
  - `components/dialogos/dialog-aceptacion-presencial.tsx`: aceptación presencial con soporte.
  - `components/dialogos/dialog-marcar-plan.tsx`: marcar plan.
  - `components/dialogos/dialog-anular-prevencion.tsx`: anular plan o valoración.
- historial/ (2)
  - `components/historial/linea-tiempo.tsx`: línea de tiempo del historial.
  - `components/historial/resumen-historial.tsx`: resumen del historial.
- valoraciones/ (4)
  - `components/valoraciones/valoraciones-tab.tsx`: pestaña Valoraciones y planes.
  - `components/valoraciones/columns-valoraciones.tsx`: columnas del listado.
  - `components/valoraciones/search-valoraciones.tsx`: buscador y filtros del listado.
  - `components/valoraciones/menu-acciones-valoracion.tsx`: acciones de fila de valoraciones.
- indicadores/ (5)
  - `components/indicadores/indicadores-tab.tsx`: pestaña Indicadores.
  - `components/indicadores/columns-indicadores.tsx`: columnas de indicadores.
  - `components/indicadores/search-indicadores.tsx`: filtros de indicadores.
  - `components/indicadores/resumen-indicadores.tsx`: tarjetas de resumen.
  - `components/indicadores/tabla-simple.tsx`: tabla de agrupamiento.
- parametros/ (1)
  - `components/parametros/parametros-tab.tsx`: pestaña Parámetros de riesgo.
- plan/detalle/ (7)
  - `components/plan/detalle/plan-detalle-contenido.tsx`: contenido de la página de detalle de plan.
  - `components/plan/detalle/encabezado-plan.tsx`: encabezado del plan.
  - `components/plan/detalle/resumen-origen.tsx`: origen del plan (valoración).
  - `components/plan/detalle/seccion-acciones-plan.tsx`: sección de acciones.
  - `components/plan/detalle/seccion-avances.tsx`: sección de avances.
  - `components/plan/detalle/seccion-aceptacion.tsx`: sección de aceptación.
  - `components/plan/detalle/soporte-aceptacion.tsx`: soporte de aceptación presencial.
- plan/caso/ (1)
  - `components/plan/caso/formulario-abrir-caso.tsx`: formulario de abrir caso de convivencia.
- form/ (2)
  - `components/form/pantalla-plan.tsx`: pantalla compartida de nuevo y modificar plan.
  - `components/form/accion-plan-item.tsx`: ítem de acción del plan.
- valoracion/detalle/ (3)
  - `components/valoracion/detalle/valoracion-detalle-contenido.tsx`: contenido de la página de detalle de valoración.
  - `components/valoracion/detalle/encabezado-valoracion.tsx`: encabezado de la valoración.
  - `components/valoracion/detalle/seccion-valoracion.tsx`: sección de datos de la valoración.
- salud-mental/ (6)
  - `components/salud-mental/salud-mental-tab.tsx`: pestaña Salud mental.
  - `components/salud-mental/columns-salud-mental.tsx`: columnas del listado.
  - `components/salud-mental/search-salud-mental.tsx`: filtros del listado.
  - `components/salud-mental/acciones-senal.tsx`: acciones de la señal.
  - `components/salud-mental/menu-acciones-salud-mental.tsx`: acciones de fila.
  - `components/salud-mental/badges-senal.tsx`: insignias de severidad y estado.
- salud-mental/dialogos/ (5)
  - `components/salud-mental/dialogos/use-dialogos-salud-mental.tsx`: apertura de los diálogos de salud mental.
  - `components/salud-mental/dialogos/resumen-senal-dialogo.tsx`: resumen de la señal en diálogo.
  - `components/salud-mental/dialogos/dialog-valoracion-critica.tsx`: valoración con modal crítico.
  - `components/salud-mental/dialogos/dialog-registrar-atencion.tsx`: registrar atención.
  - `components/salud-mental/dialogos/dialog-cerrar-senal.tsx`: cerrar señal.
- salud-mental/detalle/ (5)
  - `components/salud-mental/detalle/senal-detalle-contenido.tsx`: contenido de la página de detalle de señal.
  - `components/salud-mental/detalle/encabezado-senal.tsx`: encabezado de la señal.
  - `components/salud-mental/detalle/resumen-senal.tsx`: resumen de la señal.
  - `components/salud-mental/detalle/seccion-valoracion-senal.tsx`: sección de valoración.
  - `components/salud-mental/detalle/seccion-atencion.tsx`: sección de atención.
- salud-mental/form/ (1)
  - `components/salud-mental/form/campos-reporte-salud-mental.tsx`: campos del reporte.
- raíz de components/ (1)
  - `components/boton-volver.tsx`: botón de volver.

**pages/** (9)

- `pages/prevencion-page.tsx`: página con pestañas (Tablero, Valoraciones, Salud mental, Indicadores, Parámetros).
- `pages/historial-page.tsx`: historial del estudiante.
- `pages/valorar-page.tsx`: valorar.
- `pages/plan-form-page.tsx`: nuevo y modificar plan.
- `pages/plan-detalle-page.tsx`: detalle de plan.
- `pages/valoracion-detalle-page.tsx`: detalle de valoración.
- `pages/abrir-caso-page.tsx`: abrir caso de convivencia.
- `pages/senal-salud-mental-page.tsx`: detalle de señal.
- `pages/reporte-salud-mental-page.tsx`: reporte de salud mental.

## Fases

1. Hecha. API, tipos y claves; página con pestañas y ruta; Tablero.
2. Hecha. Historial, valorar, nuevo y modificar plan, diálogos del tablero.
3. Hecha. Valoraciones y planes: listado, detalles, avance, aceptación presencial, marcar, anular.
4. Hecha. Indicadores y Parámetros de riesgo.
5. Hecha. Salud mental (9.6) y Regla 24.

## Probado

Probado en navegador contra el servidor local, sin mocks:

- Tablero: rector, orientación, coordinador, trabajo social y docente.
- Historial.
- Valorar, ofrecer plan y nuevo plan (valoración 206).
- Detalle de plan.
- Anular valoración y anular plan (408), como rector.
- Salud mental completa: señal 139289, de Crítico a atención y cerrada.
- Página abrir caso: caso CC-2026-0031 vinculado al plan 409 (creado por API).
- Pestañas por rol.

Sin probar por infraestructura local:

- Aceptación presencial, avance y marcar: no hay almacenamiento de archivos (502).
- Export Excel: reporting-service (503).
- Avisos: notificaciones (503).

Comprobaciones:

- `tsc`: solo los 7 errores previos (`segundo-factor.tsx`, `campus-maps.tsx`).
- `oxlint`: limpio.
- `vitest`: completo, 232 ficheros, 1529 tests. Una story de Storybook falló una vez y pasa sola.

## Bitácora

**2026-11-12**

- Plan aprobado y rama creada según el nombre previsto.
- Entorno local verificado: login de cuatro usuarios de prueba y siete endpoints en 200.
- Los 403 en parámetros para quien no es Rector son esperados.
- Fase 1: API, tipos, claves, página con pestañas y ruta; Tablero.
- Historial, valorar y plan pasan a páginas propias (no diálogos).
- Sedes y jornadas por `opciones/sedes-jornadas` de prevención.
- Refactor a hooks y componentes atómicos.
- Detalle de plan atómico.
- Columnas ocultables en «Columnas visibles».
- Páginas a todo el ancho.
- Lote de completitud B1–B7, G1, G5, G6 y G9.
- Pestaña Indicadores por rol.
- Salud mental (9.6) y Regla 24 abrir caso desde el plan.

## Decisiones pendientes

**(a) Gestor administrativo sin acceso a Parámetros.** Mientras no exista menú propio, no ve la pestaña. Suposición: la pestaña es solo para el Rector.

**(b) Gestionar 9.11 sin backend.** Suposición: la acción queda deshabilitada.

**(c) SIMPADE sin estructura.** Suposición: el botón queda deshabilitado.

**(d) Oferta de Crear plan tras valorar.** Usa `puede_valorar` más plan abierto, no `puede_crear_plan` (Regla 40, coordinador). Pedir la bandera al backend en el historial.

**(e) Mensaje tras acciones de salud mental.** Muestra la etiqueta de auditoría del backend («Prevención y retención: …»). Revisar el origen.

**(f) Etiqueta de asignaturas reprobadas.** El prototipo dice «Asignaturas reprobadas» y la spec «[Áreas] reprobadas». Decidir cuál usar.

**(g) Menú «Columnas visibles».** Trunca «Fecha de valoración». Componente compartido: corregir en el común.

**(h) Sondeo de Indicadores.** Pide el listado completo: el endpoint no tiene `PAGESIZE`.
