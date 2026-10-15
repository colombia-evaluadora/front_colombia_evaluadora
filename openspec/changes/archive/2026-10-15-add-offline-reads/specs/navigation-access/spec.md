## ADDED Requirements

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
