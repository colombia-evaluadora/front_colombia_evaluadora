# Gestión de alertas de inasistencia — módulo front

Estado: pantallas G.8.GAL.1–8 implementadas y probadas en local el 2026-11-19. Brechas B4 y B5 del backend resueltas en la rama SSO del PR #1020 (ver «Brechas del backend»).

Tarea: CU-86e3yf6qd (§9.11 Gestión de la alerta de inasistencia).

Fuentes: especificación publicada (§9.11, manda sobre el prototipo), prototipos G.8.GAL.* y contrato real del backend (V665, V669, V696; plantilla `reportes/remision-externa.jrxml`).

## Alcance

**En alcance**

- 9.11 Gestión de la alerta de inasistencia: pestaña «Gestión de alertas (N)» con su listado, buscador y filtros (G.8.GAL.1 y G.8.GAL.4), detalle de la gestión (G.8.GAL.2 y G.8.GAL.6), registrar contacto (G.8.GAL.3), activar la ruta de protección (G.8.GAL.5), remisión y respuesta de la ruta (G.8.GAL.8), y las acciones Tomar, Solicitar apoyo de orientación, Escalar y Resolver.
- Acceso desde el Tablero de alertas: la acción «Gestionar» de la fila abre la gestión de la alerta de inasistencia.

**Fuera de alcance**

- Exportar del prototipo: sin endpoint ni requisito en la especificación.
- Insignia del contador en el menú lateral: no implementada (ver «Decisiones pendientes»).

## Endpoints

Prefijo de servicio: `eval-col` (gateway `/api/eval-col`), base `/gestion-estudiantil/prevencion`.

| Uso | Método y ruta | Fichero front |
|---|---|---|
| Listado (filtros ESTADO, UMBRAL, GRUPO, RESPONSABLE; sin ESTADO excluye las Resueltas) | GET /gestion-alertas | `api/query/use-gestion-alertas-query.ts` |
| Detalle (JSON `datos`) | GET /gestion-alertas/:ID | `api/query/use-gestion-alertas-query.ts` |
| Listas del módulo con su etiqueta | GET /gestion-alertas/opciones | `api/query/use-gestion-alertas-query.ts` |
| Contador de la pestaña | GET /gestion-alertas/contador | `api/query/use-gestion-alertas-query.ts` |
| Guardar causas, medidas y fecha prevista | PUT /gestion-alertas/:ID | `api/mutations/gestion-alertas.ts` |
| Registrar contacto | POST /gestion-alertas/:ID/contactos | `api/mutations/gestion-alertas.ts` |
| Tomar (Supervisor de sede, Regla 44) | POST /gestion-alertas/:ID/tomar | `api/mutations/gestion-alertas.ts` |
| Solicitar apoyo de orientación | POST /gestion-alertas/:ID/apoyo-orientacion | `api/mutations/gestion-alertas.ts` |
| Escalar a la entidad territorial | POST /gestion-alertas/:ID/escalar | `api/mutations/gestion-alertas.ts` |
| Resolver (FECHA_VERIFICACION no posterior a hoy) | POST /gestion-alertas/:ID/resolver | `api/mutations/gestion-alertas.ts` |
| Activar ruta de protección (remisión externa) | POST /gestion-alertas/:ID/ruta-proteccion | `api/mutations/gestion-alertas.ts` |
| Detalle común de la remisión (hook de Reintegración) | GET /remisiones-externas/:ID | `reintegracion/api/query/use-remisiones-query` (reutilizado) |
| Registrar gestión y registrar respuesta de la remisión (hooks de Reintegración) | POST …/gestiones, POST …/respuesta | `reintegracion/api/mutations/remisiones` (reutilizado) |
| Reporte de caso | reporte clave `remision-externa` con `FK_REMISION` | `src/lib/report-client.ts`, `ruta-proteccion.tsx` |

Lista de opciones (`OpcionesGestionAlertas`): causas (con marca de reservada), estados de causa, medios, con quién, resultados de contacto, entidades, actuaciones, estados y umbrales.

## Ficheros

Una línea por fichero, comprobada al abrirlo.

**Capa de API y tipos**

- `prevencion/api/query/use-gestion-alertas-query.ts`: `BASE_GESTION_ALERTAS` y las consultas de listado, detalle, opciones y contador; `toGestionAlertasFilters` traduce los filtros.
- `prevencion/api/mutations/gestion-alertas.ts`: una mutación por operación (guardar, contacto, tomar, apoyo, escalar, resolver y activar ruta).
- `prevencion/api/types.ts`: `GestionAlertaRow`, `GestionAlertaDetalle`, `GestionBanderas`, `OpcionesGestionAlertas`, eventos del historial y entradas de cada acción; banderas de acceso `ver_gestion_alertas`, `gestion_alertas_contador` y `gestion_alertas_ver_todas_defecto`.
- `prevencion/api/ui-mappings.ts`: `ESTADO_GESTION_COLOR` y `UMBRAL_GESTION_COLOR`; la etiqueta sale del backend.

**Listado y tablero**

- `prevencion/components/gestion-alertas/gestion-alertas-tab.tsx`: pestaña «Gestión de alertas (N)» (G.8.GAL.1).
- `prevencion/components/gestion-alertas/columns-gestion-alertas.tsx`: `buildColumnsGestionAlertas`; el responsable va abreviado y, sin persona, por su rol.
- `prevencion/components/gestion-alertas/marcas-gestion.tsx`: marcas separadas Reincidente, Seguimiento reforzado, Vencida y Sin responsable (Regla 44).
- `prevencion/components/gestion-alertas/acciones-gestion.tsx`: `accionesGestion` construye las acciones por fila (ver, tomar, contacto, apoyo, ruta, escalar y resolver).
- `prevencion/components/gestion-alertas/search-gestion-alertas.tsx`: buscador por estudiante y panel de Estado, Umbral, Grado/Grupo y Responsable (G.8.GAL.4).
- `prevencion/hooks/use-gestion-alertas-lista.ts`: consulta, tabla y envío de acciones del listado, con las columnas y las acciones de fila.
- `prevencion/components/tablero/tablero-tab.tsx`: «Gestionar» de cada fila navega a la gestión con `irGestionAlerta` cuando hay gestión abierta y el usuario la ve.
- `prevencion/components/tablero/menu-acciones-tablero.tsx`: la acción «Gestionar» se deshabilita si no hay `fk_gestion_alerta` o si `puede_gestionar` es falso.

**Detalle**

- `prevencion/pages/gestion-alerta-detalle-page.tsx`: `GestionAlertaDetallePage`, página del detalle por id.
- `prevencion/components/gestion-alertas/detalle/detalle-gestion.tsx`: contenido del detalle (G.8.GAL.2 y GAL.6).
- `prevencion/components/gestion-alertas/detalle/causas-medidas.tsx`: causas con su estado, medidas y fecha prevista; las reservadas se muestran como «Información reservada».
- `prevencion/components/gestion-alertas/detalle/historial-gestion.tsx`: historial de eventos; persona abreviada o, sin persona, su rol.
- `prevencion/components/gestion-alertas/detalle/ruta-proteccion.tsx`: ruta de protección (G.8.GAL.6); completa la remisión con `GET /remisiones-externas/:ID` y descarga el reporte `remision-externa`.

**Diálogos**

- `prevencion/components/gestion-alertas/dialogos/use-dialogos-gestion.tsx`: un solo modal de la gestión abierto a la vez, compartido por listado y detalle.
- `prevencion/components/gestion-alertas/dialogos/use-opciones-gestion.ts`: lee las listas TLV de `/opciones` para los modales.
- `prevencion/components/gestion-alertas/dialogos/dialog-confirmar-gestion.tsx`: confirma Tomar, Solicitar apoyo y Escalar antes de enviar.
- `prevencion/components/gestion-alertas/dialogos/dialog-contacto-gestion.tsx`: registrar contacto (G.8.GAL.3); cada intento, también el fallido, queda registrado.
- `prevencion/components/gestion-alertas/dialogos/dialog-resolver-gestion.tsx`: resolver; «Matrícula retirada» la pone el sistema, quien resuelve solo verifica el regreso.
- `prevencion/components/gestion-alertas/dialogos/dialog-ruta-proteccion.tsx`: activar la ruta (G.8.GAL.5); la fecha esperada se propone con el plazo de seguimiento y cambiarla pide motivo de 10 a 1000 caracteres.
- `prevencion/components/gestion-alertas/dialogos/dialogos-remision-ruta.tsx`: registrar gestión y registrar respuesta de la remisión de la ruta (G.8.GAL.8), reutilizando las mutaciones de Reintegración.
- `prevencion/components/gestion-alertas/dialogos/resumen-gestion.tsx`: línea bajo el título de los modales (estudiante, grupo, umbral y estado).

**Utilidades y rutas**

- `prevencion/utils/formularios-gestion.ts`: límites de texto (`RAZON_MAX`, `MEDIDAS_MAX`, `RUTA_TEXTO_MIN/MAX`, `RESPUESTA_REMISION_MAX`) y validaciones de contacto, resolver, ruta y remisión; `causasParaBackend` convierte las causas al formato del backend.
- `prevencion/pages/prevencion-page.tsx`: pestaña «Gestión de alertas» con el contador en el texto de la pestaña; oculta si `ver_gestion_alertas` es falso.
- `src/config/paths.ts`: `prevencionGestionAlerta` (`gestion-estudiantil/prevencion-retencion/gestion-alertas/$gestionId`).
- `src/router.tsx`: `prevencionGestionAlertaRoute` con carga diferida de la página de detalle.
- `src/features/navigation/lib/route-menu-ownership.test.ts`: la ruta de la gestión pertenece al menú Prevención y retención.
- `src/lib/report-client.ts`: clave `remision-externa`, usada por el reporte de caso de la ruta.

## Lo probado

Probado en local el 2026-11-19:

- Coordinador: toma la gestión 60123, registra contacto, activa la ruta de protección (remisión 412) y resuelve.
- Director (usuario seed): en la gestión 60124, registra contacto, registra causas y medidas, ve la remisión 411, registra gestión y respuesta, y descarga el reporte.
- Rector: escala la gestión.
- Orientación: consulta; el «Gestionar» del tablero abre la gestión.
- `tsc` 0 errores; oxlint limpio; vitest 248 ficheros y 1632 tests.

## Brechas del backend

- **B4 y B5:** resueltas en la rama SSO del PR #1020 (V665, V669, V696; plantilla `reportes/remision-externa.jrxml`).
- **Abiertas:**
  - La fecha prevista no se puede vaciar: `COALESCE` en `fn_prevencion_gestion_guardar`.
  - El Responsable de grupo puede editar causas, pero las recibe enmascaradas; el front bloquea la edición cuando hay causas reservadas.
  - Registrar respuesta no sube soportes en el front.

## Decisiones pendientes

- Mensajes exactos de la especificación («Contacto registrado.», «Alerta resuelta.», «Alerta escalada a la entidad territorial.») pisados por `X-Mensaje` (etiqueta de auditoría, V590): decisión de plataforma.
- El contador de gestiones aparece en la pestaña, no en el menú lateral: la navegación no tiene insignias y no está implementado.
- «Exportar» del prototipo: sin endpoint ni requisito en la especificación.
- Confirmar que el Responsable de la gestión, aunque sea director, ve su ruta de protección.

## Bitácora

**2026-11-19**

- Fase 1: API (tipos, claves, consultas y mutaciones) y pestaña «Gestión de alertas» en `prevencion-page.tsx`.
- Fase 2: listado, buscador, detalle, contacto, causas y medidas, acciones Tomar, apoyo, escalar y resolver, activar ruta de protección.
- Fase 3: remisión y respuesta de la ruta, reporte `remision-externa`, y conexión del «Gestionar» del tablero.
- Corrección: Switch redondeado.
- Brechas B4 y B5 del backend conectadas en el front.
