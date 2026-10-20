## ADDED Requirements

### Requirement: Duración máxima offline configurable
La app SHALL permitir trabajar sin conexión hasta `VITE_APP_OFFLINE_MAX_DAYS` días (default 180) desde la última autenticación en línea, y la sesión offline, la ventana de la outbox, el snapshot del menú y la retención de datos guardados MUST usar ese mismo valor.

#### Scenario: Roster con más de una semana
- **WHEN** el docente abre la app sin red 60 días después de preparar
- **THEN** ve el roster y la planilla guardados, marcados como antiguos

#### Scenario: Vencida la ventana
- **WHEN** pasan más días que el máximo
- **THEN** la outbox deja de aceptar cambios nuevos y conserva los pendientes hasta la próxima sincronización

### Requirement: Almacenamiento persistente
Al preparar el equipo la app SHALL pedir `navigator.storage.persist()`, mostrar si el almacenamiento es persistente, el uso y la cuota, y MUST avisar en rojo si no es persistente, si el uso supera el 80% o si es iOS sin la PWA instalada.

#### Scenario: iOS sin instalar
- **WHEN** el docente prepara desde Safari en iPhone sin la app instalada
- **THEN** ve el aviso de que Safari borra los datos a los 7 días y cómo instalarla

### Requirement: Instante de captura
Toda escritura enviada por la outbox SHALL llevar `X-Client-Captured-At` con el instante en que el usuario capturó el cambio.

### Requirement: Ninguna carga infinita sin conexión
Sin conexión, ninguna pantalla, tabla, select, combobox ni diálogo SHALL quedar en un estado de carga indefinido: en uno o dos segundos MUST mostrar lo guardado en el equipo o un aviso claro ("Sin conexión: esta información no está guardada en este equipo", con la sugerencia de usar "Preparar sin conexión" cuando haya red, o "Esta sección necesita conexión" en las vistas de administración).

#### Scenario: Pantalla nunca preparada
- **WHEN** el docente abre sin red una pantalla cuyos datos no se guardaron
- **THEN** a los 3 s no hay skeletons ni spinners y la pantalla dice que la información no está guardada en este equipo

#### Scenario: Pantalla con datos guardados
- **WHEN** el docente abre sin red una pantalla que sí preparó
- **THEN** ve los datos guardados (con su fecha) y el refetch espera a que vuelva la red sin mostrar un error
