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
