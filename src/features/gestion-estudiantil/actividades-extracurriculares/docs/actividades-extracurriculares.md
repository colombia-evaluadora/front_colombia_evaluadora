# Actividades extracurriculares y servicio social — módulo front

Estado: fases 1 a 3 implementadas y probadas en local (2026-11-13). Quedan los puntos de «Sin probar» y las brechas B1 a B6.

Tarea: CU-86e3yf6q2 (Gestión Estudiantil, Actividades extracurriculares y servicio social, §6.1 a §6.4).

Rama: `feature/CU-86e3yf6q2-FRONT-G-estudiantil-Actividades-extracurriculares-y-servicio-social`

Backend: migraciones V617 a V623 de SSO. Menú `ACTIVIDADES_EXTRACURRICULARES`.

## Alcance y fuera de alcance

**En alcance**

- §6.1 Listado de actividades, formulario de alta y modificación, detalle de la actividad y activar o inactivar.
- §6.2 Participantes: inscribir estudiante y retirar participante.
- §6.3 Sesiones: listado, detalle y registro de nueva sesión con asistentes, horas y soporte.
- §6.4 Servicio social: listado por estudiante, detalle con horas y certificado.

**Fuera de alcance**

- Exportar (listado de actividades y de servicio social): no hay endpoint en el backend (B1). El botón se muestra deshabilitado.
- Parámetros del servicio social: pantalla del menú Configuración (CONFIG_SERVICIO_SOCIAL), fuera de esta entrega (B5).
- Certificado con QR, firmas y documento emitido (B4).
- Portal del acudiente (B6).

## Rutas

Declaradas bajo `/app`. La ruta base coincide con el menú `ACTIVIDADES_EXTRACURRICULARES`.

| Ruta (sin `/app`) | Pantalla | Estado |
|---|---|---|
| `gestion-estudiantil/actividades-extracurriculares` | Listado de actividades (pestaña Actividades) | Hecho |
| `gestion-estudiantil/actividades-extracurriculares?tab=servicio-social` | Listado de servicio social (pestaña Servicio social) | Hecho |
| `gestion-estudiantil/actividades-extracurriculares/nueva` | Nueva actividad | Hecho |
| `gestion-estudiantil/actividades-extracurriculares/:id` | Detalle de actividad: pestañas Participantes y Sesiones | Hecho |
| `gestion-estudiantil/actividades-extracurriculares/:id/editar` | Modificar actividad | Hecho |
| `gestion-estudiantil/actividades-extracurriculares/servicio-social/:matricula` | Detalle de servicio social del estudiante y certificado | Hecho |

Cada ruta se registra en `ROUTE_OWNERS` de `src/features/navigation/lib/route-menu-ownership.test.ts` con su `MENU.actividadesExtracurriculares`.

## Endpoints

Cliente `evalCol`, prefijo `eval-col`. Binds en MAYÚSCULAS; `PAGEINDEX` base 0.

Estado: **Cubierto** (el backend entrega lo que la pantalla necesita), **Parcial** (cubierto con una brecha B# que condiciona la acción), **Falta** (el backend no tiene endpoint), **Fuera** (fuera de esta entrega).

| Pantalla · Qué muestra o hace | Endpoint | Estado |
|---|---|---|
| Listado de actividades (G.5.ACT.LIS): tabla, búsqueda y filtros Período, Sede, Jornada, Tipo, Responsable y Estado | `GET /gestion-estudiantil/actividades` | Cubierto |
| Detalle de actividad (G.5.ACT.DET): cabecera, resumen y grados | `GET /actividades/:ID` | Cubierto |
| Nueva actividad (G.5.ACT.NUE): alta | `POST /actividades` | Cubierto |
| Modificar actividad: edición sin sede, jornada, período ni estado | `PUT /actividades/:ID` | Cubierto |
| Activar o inactivar actividad: acción de fila y modal de estado | `PUT /actividades/:ID/estado` | Parcial (B2) |
| Selector de responsables: campo Responsable del formulario y filtro | `GET /actividades/responsables` | Cubierto |
| Pestaña Participantes: tabla, búsqueda y filtro de estado | `GET /actividades/:ID/participantes` | Cubierto |
| Selector de estudiante candidato al inscribir | `GET /actividades/:ID/candidatos` | Cubierto |
| Inscribir estudiante: diálogo desde la pestaña Participantes | `POST /actividades/:ID/participantes` | Cubierto |
| Retirar participante: modal «Retirar a [Estudiante]» con texto exacto §6.3 | `PUT /actividades/participantes/:ID/retirar` | Parcial (B3) |
| Pestaña Sesiones: tabla con fecha, duración, asistentes e inscritos | `GET /actividades/:ID/sesiones` | Cubierto |
| Detalle de sesión: observación y soporte | `GET /actividades/sesiones/:ID` | Cubierto |
| Nueva sesión: fecha, duración, asistentes, horas por asistente en servicio social, observación y soporte | `POST /actividades/:ID/sesiones` | Parcial (B3) |
| Subida del soporte de la sesión (obligatorio si hay entidad externa) | `POST /files/eval-col/gestion-estudiantil/actividades/soporte` (campo `SOPORTE`) | Cubierto |
| Servicio social, listado (G.5.SOC.LIS): estudiante, grado, horas (N de M), estado y filtros | `GET /servicio-social` | Cubierto |
| Detalle de servicio social (G.5.SOC.DET): «N de M horas · le faltan X» y tabla de sesiones | `GET /servicio-social/estudiante/:MATRICULA` | Cubierto |
| Certificado (G.5.SOC.DOC): vista imprimible, habilitado si estado Cumplido | `GET /servicio-social/certificado/:MATRICULA` | Parcial (B4) |
| Grados del servicio social: limita los grados cuando el tipo es Servicio social | `GET /servicio-social/parametros` | Cubierto |
| Exportar actividades y servicio social (ambas pestañas) | — | Falta (B1) |
| Pantalla de parámetros del servicio social (menú Configuración) | — | Fuera (B5) |
| Portal del acudiente (Regla 5) | — | Fuera (B6) |

Selectores: Sede, Jornada y Grados desde `useOpcionesCascada`. Grados usa `gradoOpciones` (grados únicos por `gradoId`/`gradoNombre`) y `gradoCodigos` (código del catálogo GRADOS por `gradoId`). Período desde `usePeriodoAcademicoDeJornada`, que lee `/informes/jornadas`. Tipo desde `useCatalogo("TIPO_ACTIVIDAD_EXTRA")`.

**Brechas del backend**

- **B1 Exportar.** No hay endpoint para actividades ni para servicio social. Front: botón deshabilitado.
- **B2 Activar o inactivar.** La spec lo da también al Responsable; el backend (role_query y gate de V622) solo lo da a Supervisor y Administrador. Front: la acción usa `puede_editar`.
- **B3 Sin banderas por fila.** No hay bandera para retirar, registrar sesión ni certificado. Front: retirar y nueva sesión usan `puede_inscribir` (mismo gate en V622) y el estado; el certificado se habilita si el estado es CUMPLIDO y el gate decide el rol.
- **B4 Certificado parcial.** Sin QR ni firmas configuradas; el documento emitido queda fuera.
- **B5 Parámetros del servicio social.** Pantalla de Configuración. Fuera de esta entrega.
- **B6 Portal del acudiente (Regla 5).** Fuera.

## Reglas de la spec que pinta el front

- **Listado.** Columnas Nombre, Tipo, Responsable, Grados, Inscritos («N de cupo»; sin cupo, «N»), Fechas («dd/mm/aaaa a dd/mm/aaaa») y Estado (badge Activa o Inactiva). Búsqueda por nombre. Acciones de fila: Ver detalle, Modificar, Inactivar o Activar. Vacío: «Aún no hay actividades en este período.».
- **Formulario.** Campos y ayudas de §6.1. «Registra asistencia» activo y bloqueado si el tipo es Servicio social. Entidad y supervisor externos solo en Servicio social; el supervisor es obligatorio si hay entidad. Cupo vacío significa sin límite. Estado Activa por defecto, solo al crear.
- **Detalle.** Cabecera con nombre, badge de tipo y estado; botones «Modificar» e «Inscribir estudiante» (pestaña Participantes) o «Nueva sesión» (pestaña Sesiones, solo si registra asistencia); resumen «Responsable · Sede · Jornada · grados · N de M cupos», «Horario · fechas · Registra asistencia» y «Entidad externa · Supervisor externo».
- **Retirar.** Modal con actividad, grado y grupo, fecha de inscripción y texto exacto §6.3.
- **Inactivar.** Modal con tipo, grados, responsable, estado y texto exacto.
- **Nueva sesión.** Fecha; duración de 0,5 a 12 con un decimal; asistentes como casillas de inscritos con «Marcar todos» y contador. En servicio social, campo Horas por asistente marcado (por defecto la duración; de 0,5 a la duración). Observación. Soporte obligatorio si hay entidad externa. Mensaje de servicio social exacto.
- **Servicio social.** Columnas Estudiante, Grado y grupo, Horas (N de M) y Estado (Cumplido o En curso). Filtros Grado y Estado. Acción Ver detalle. En el detalle, tabla Fecha, Actividad o entidad externa, Horas y Responsable; botón Certificado solo si está Cumplido.

## Ficheros

Todos bajo `src/features/gestion-estudiantil/actividades-extracurriculares/`.

- `api/mutations/actividades.ts`: mutaciones de actividad, participantes, sesiones y subida del soporte (`subirSoporteActividad`); cada una invalida la raíz de claves.
- `api/mutations/use-actividades-mutation.ts`: wrapper genérico de `useMutation` del módulo y el tipo `MutationCfg`.
- `api/query-keys.ts`: claves de React Query (`actividadesKeys`); toda escritura invalida la raíz.
- `api/query/use-actividades-query.ts`: listado, detalle, responsables y participantes de actividad; `BASE_ACTIVIDADES` y `toActividadesFilters`.
- `api/query/use-periodo-academico-query.ts`: `usePeriodoAcademicoDeJornada`, período de una sede y jornada desde `/informes/jornadas`.
- `api/query/use-servicio-social-query.ts`: listado de servicio social, detalle por estudiante, certificado y parámetros.
- `api/types.ts`: contrato de backend (snake_case) de actividades y servicio social, binds y filtros.
- `api/ui-mappings.ts`: opciones de filtro de estado y colores de badge de actividad y servicio social.
- `components/columns-actividades.tsx`: columnas del listado de actividades (`buildColumnsActividades`).
- `components/columns-servicio-social.tsx`: columnas del listado de servicio social, con barra de horas (`buildColumnsServicioSocial`).
- `components/detalle/actividad-detalle-contenido.tsx`: `ActividadDetalleContenido`, cabecera, resumen y pestañas Participantes y Sesiones.
- `components/detalle/encabezado-actividad.tsx`: `EncabezadoActividad`, título, badges y botones de acción del detalle.
- `components/detalle/resumen-actividad.tsx`: `ResumenActividad`, bloques de responsable, horario, cupos y entidad externa.
- `components/detalle/tab-participantes.tsx`: `TabParticipantes`, tabla de inscritos con búsqueda, filtro de estado y acciones.
- `components/detalle/tab-sesiones.tsx`: `TabSesiones`, tabla de sesiones de la actividad.
- `components/dialogos/dialogo-certificado.tsx`: `DialogoCertificado`, vista imprimible del certificado de servicio social.
- `components/dialogos/dialogo-estado-actividad.tsx`: `DialogoEstadoActividad`, modal para activar o inactivar.
- `components/dialogos/dialogo-inscribir.tsx`: `DialogoInscribir`, inscripción de un estudiante candidato.
- `components/dialogos/dialogo-nueva-sesion.tsx`: `DialogoNuevaSesion`, registro de sesión normal o de servicio social con horas por asistente y soporte.
- `components/dialogos/dialogo-retirar.tsx`: `DialogoRetirar`, modal de retiro de un participante.
- `components/dialogos/dialogo-ver-sesion.tsx`: `DialogoVerSesion`, detalle de sesión con observación y soporte.
- `components/form/campo-grados.tsx`: `CampoGrados`, selector múltiple de grados con ayuda.
- `components/form/formulario-actividad.tsx`: `FormularioActividad`, campos del alta y modificación con validación inline.
- `components/listado-actividades.tsx`: `ListadoActividades`, tabla de actividades con paginación y columnas ocultables.
- `components/listado-servicio-social.tsx`: `ListadoServicioSocial`, tabla de servicio social por estudiante.
- `components/menu-acciones-actividad.tsx`: `MenuAccionesActividad`, acciones de fila (ver, modificar, estado) en el hover.
- `components/search-actividades.tsx`: `SearchActividades`, barra de búsqueda y filtros del listado de actividades.
- `components/search-servicio-social.tsx`: `SearchServicioSocial`, barra de búsqueda y filtros de servicio social.
- `components/servicio-social/servicio-social-contenido.tsx`: `ServicioSocialContenido`, detalle del estudiante con horas, tabla de sesiones y certificado.
- `docs/actividades-extracurriculares.md`: este documento.
- `hooks/use-actividad-form.ts`: `useActividadForm`, estado, validación y envío del formulario de actividad.
- `hooks/use-actividades-filtros.ts`: `useActividadesFiltros`, estado de filtros del listado de actividades.
- `hooks/use-actividades-lista.tsx`: `useActividadesLista`, tabla y paginación del listado de actividades.
- `hooks/use-navegacion-actividades.ts`: `useNavegacionActividades`, navegación entre listado, actividad y servicio social.
- `hooks/use-servicio-social-filtros.ts`: `useServicioSocialFiltros`, estado de filtros del listado de servicio social.
- `pages/actividad-detalle-page.tsx`: `ActividadDetallePage`, página de detalle de actividad.
- `pages/actividad-form-page.tsx`: `ActividadFormPage`, página de alta (sin id) y modificación (con id).
- `pages/actividades-page.tsx`: `ActividadesPage`, página del listado con pestañas Actividades y Servicio social.
- `pages/servicio-social-estudiante-page.tsx`: `ServicioSocialEstudiantePage`, página del detalle de servicio social por matrícula.
- `utils/avisos.ts`: `avisarExito` y `encolarExito`, avisos de éxito con el mensaje del servidor.
- `utils/formatos-actividad.ts`: formatos y conversiones (fechas ISO, horas, cupos, decimales).

Fuera del módulo:

- `src/config/paths.ts`: 5 rutas nuevas en `paths.app`: `actividadesExtracurriculares`, `actividadNueva`, `actividadDetalle`, `actividadEditar` y `servicioSocialEstudiante`.
- `src/router.tsx`: rutas de la lista, nueva, detalle, editar y servicio social, con carga diferida de las páginas y migas de pan.
- `src/features/navigation/lib/route-menu-ownership.test.ts`: `ROUTE_OWNERS` con las rutas del módulo y su menú `actividadesExtracurriculares`.
- `src/features/gestion-estudiantil/commons/hooks/use-opciones-cascada.ts`: añade `gradoOpciones` y `gradoCodigos` (aditivo; no cambia lo existente).

## Probado

Como Rector, base local, 2026-11-13.

- Listado de actividades con datos: columnas, 9 en «Columnas visibles», y acciones en el hover.
- Pestaña Servicio social con «N de 80» y barra de progreso.
- Formulario de crear y modificar: validación inline; en servicio social, asistencia bloqueada y supervisor obligatorio si hay entidad.
- Detalle con pestañas Participantes y Sesiones.
- Inscribir; cupo lleno con el mensaje del backend «La actividad … tiene su cupo completo (1 estudiantes).»; retirar; inactivar y activar.
- Nueva sesión normal y de servicio social, con horas por asistente y el aviso «Sesión guardada; se sumaron las horas de 2 estudiantes a su servicio social.».
- Ver sesión.
- Estudiante que llega a Cumplido y certificado imprimible.

## Sin probar

- Subida del soporte: el almacenamiento local devuelve 502 UPLOAD_FAILED.
- Descarga del soporte.
- Filtros del listado con valores.
- Estado vacío.
- Otros roles: Coordinador, Docente Responsable y Director de grupo.

## Bitácora

**2026-11-13**

- Plan del front y comparación prototipo contra backend.
- Fase 1: API y listados.
- Fase 2: formulario y detalles.
- Fase 3: diálogos, sesión y certificado.
- Corrección de nombres completos de estudiantes y de avisos.

## Decisiones pendientes

- **B2 Activar o inactivar para el Responsable.** Decide el Responsable del módulo si la spec se aplica en backend (V622: role_query y gate). Suposición vigente: el front muestra la acción solo cuando `puede_editar` es verdadera, es decir, a Supervisor y Administrador.
- **B3 Banderas para retirar, registrar sesión y certificado.** Suposición vigente: retirar y nueva sesión usan `puede_inscribir` más el estado del caso; el certificado se habilita con estado CUMPLIDO y el gate del backend decide el rol.
- **Etiqueta de auditoría.** El servidor registra la etiqueta genérica «Actividades extracurriculares: modifica una actividad» en todas las operaciones. El front la sustituye con `utils/avisos.ts`. Pedir al backend una etiqueta por operación.
- **Período académico.** Se resuelve desde `/informes/jornadas` (`use-periodo-academico-query.ts`). Confirmar que es la fuente correcta para el período de la actividad.
