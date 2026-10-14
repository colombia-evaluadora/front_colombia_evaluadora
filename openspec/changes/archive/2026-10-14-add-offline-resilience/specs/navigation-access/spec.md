## MODIFIED Requirements

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
