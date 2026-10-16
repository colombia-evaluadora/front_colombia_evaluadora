# navigation-access Specification

## Purpose
Describe cómo el menú del backend decide el sidebar, el acceso a rutas bajo `/app` y los permisos por pantalla (`src/router.tsx`, `src/features/navigation`).

## Requirements

### Requirement: Menú por rol desde el backend
El sistema SHALL construir el sidebar con `GET /eval-col/my-menus` (unión de menús de los roles del usuario) en un árbol de dos niveles, cacheado con `staleTime: Infinity` bajo `["navigation","menu"]`.

#### Scenario: Usuario docente
- **WHEN** un docente entra a `/app`
- **THEN** el sidebar muestra solo los ítems visibles con URL devueltos por `my-menus`, ordenados por `menuOrder`

### Requirement: Guard de acceso por menú
El `beforeLoad` de `/app` SHALL obtener el menú con `ensureQueryData(navItemsQueryOptions)` y redirigir a `/app/sin-acceso?desde=<ruta>` si la ruta no está en el menú, excepto las rutas de `isAlwaysAllowedPath` (`/app`, `/app/sin-acceso` y `/app/pendientes`) y los not-found globales. Si el menú no carga, el error MUST subir al `ErrorPage` sin conceder acceso ni cerrar sesión; si la causa es un error de red, el `ErrorPage` MUST mostrar "No pudimos comunicarnos con el servidor" con "Reintentar".

#### Scenario: Ruta no asignada
- **WHEN** el usuario navega a una ruta que no está en su menú
- **THEN** se redirige a `/app/sin-acceso?desde=<ruta>` reemplazando la entrada del historial

#### Scenario: Página de pendientes
- **WHEN** el usuario navega a `/app/pendientes`, que no está en `my-menus`
- **THEN** el guard no lo redirige a `/app/sin-acceso`

#### Scenario: Menú no disponible
- **WHEN** `my-menus` falla por error de red y no está en cache
- **THEN** se muestra "No pudimos comunicarnos con el servidor" con "Reintentar" y la sesión se conserva

### Requirement: Índice de /app
La ruta `/app/` SHALL redirigir al primer ítem navegable del menú (`getFirstNavUrl`) o a `/app/sin-acceso` si no hay ninguno.

#### Scenario: Primer ítem
- **WHEN** el usuario abre `/app/`
- **THEN** se redirige a la URL del primer ítem del sidebar

### Requirement: Permisos por pantalla
`useMenuPermission(codigo)` SHALL devolver `{ puedeCrear, puedeEditar, puedeEliminar, puedeVer }` desde `/eval-col/usuarios/permisos-menu` y MUST devolver todo denegado mientras carga.

#### Scenario: Permisos cargando
- **WHEN** la pantalla monta antes de que lleguen los permisos
- **THEN** las acciones de crear, editar y eliminar quedan denegadas

### Requirement: Menú y permisos disponibles sin conexión
El sistema SHALL persistir `["navigation","menu"]` y los permisos por pantalla con TTL de 30 días y MUST hidratarlos desde IndexedDB antes de que corra el `beforeLoad` de `/app`; si offline no hay menú persistido, MUST mostrar "Esta sección necesita conexión" en lugar del `ErrorPage` genérico.

#### Scenario: Recarga offline con menú persistido
- **WHEN** el docente recarga una ruta de su menú sin red
- **THEN** el guard la permite usando el menú hidratado

#### Scenario: Permisos no persistidos
- **WHEN** no hay permisos en cache y no hay red
- **THEN** todas las acciones de crear, editar y eliminar quedan deshabilitadas

#### Scenario: Menú persistido viejo
- **WHEN** el guard manda a `/app/sin-acceso` estando offline
- **THEN** se agrega "Tu menú se actualizó por última vez el {fecha}. Si te asignaron este módulo hace poco, conéctate para actualizarlo."

### Requirement: Vistas solo en línea
Las vistas y acciones fuera del alcance offline SHALL deshabilitarse sin red con el tooltip "Necesitas conexión para esta acción." y, sin datos en cache, MUST mostrar el título "Esta sección necesita conexión", el texto "Vuelve a intentarlo cuando tengas internet. Mientras tanto puedes usar Planeador, Planilla y Asistencia." y el botón "Reintentar".

#### Scenario: Matrícula sin red
- **WHEN** el usuario abre la lista de matrícula sin red
- **THEN** ve el empty state de sección solo en línea

#### Scenario: Escrituras de las vistas legibles offline
- **WHEN** no hay red en Referentes curriculares, Planeador, Planilla o Asistencia
- **THEN** quedan deshabilitadas (con `useOnlineOnly`) las escrituras hasta la Fase 2: activar/inactivar y eliminar referentes; crear, editar y eliminar enunciados y evidencias; calificar celda, en bloque y la vista previa de nota de periodo cerrado; "Guardar" de la solicitud de periodo cerrado; observaciones, evidencias y favorita; "No presentó" y asistencia de la actividad; aprobar/declinar (coordinador); eliminar, vincular y desvincular actividades; ponderación y puntaje; criterios de unidad; exportar/importar actividades; y registrar/editar/marcar todos en Asistencia

### Requirement: Horario y asignaciones en solo consulta sin conexión
La lista de periodos y la edición de un periodo (tabs de horario y asignaciones académicas) SHALL abrirse sin red desde la cache persistida, mientras que agregar un periodo y el resto de establecimiento y administración MUST seguir siendo solo en línea; guardar horario o asignaciones MUST estar deshabilitado sin red.

#### Scenario: Abrir el horario sin red
- **WHEN** el docente entra sin conexión a la edición de un periodo ya consultado
- **THEN** ve el horario y las asignaciones, con "Guardar" deshabilitado

#### Scenario: Administración sin red
- **WHEN** se entra sin conexión a roles y menús
- **THEN** se muestra "Esta sección necesita conexión"
