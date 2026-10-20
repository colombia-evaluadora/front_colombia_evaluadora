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

### Requirement: La app instalada guarda todo
Cuando la app corre instalada (PWA) y el modo offline no está apagado, el equipo SHALL considerarse personal sin pedir confirmación ni pertenecer al piloto, SHALL preparar todo el año automáticamente al primer ingreso mostrando el progreso, y MUST seguir preparando de forma incremental en segundo plano mientras haya conexión.

#### Scenario: Primer ingreso en la app instalada
- **WHEN** un docente inicia sesión por primera vez en la app instalada
- **THEN** no ve "Este es un equipo compartido", y sin tocar nada la app guarda todo el año con una barra de progreso y luego muestra "Datos guardados: hace X"

### Requirement: Cerrar sesión en la app instalada no borra
En la app instalada, cerrar sesión SHALL conservar los datos guardados y los cambios sin sincronizar y MUST bloquear la entrada sin red hasta verificar la contraseña o el PIN; borrar los datos del equipo MUST ser una acción explícita con aviso, y con cambios sin sincronizar MUST pedir una segunda confirmación.

#### Scenario: Cierre de sesión por error sin red
- **WHEN** el docente cierra sesión sin red y vuelve a entrar con su correo y contraseña
- **THEN** recupera sus datos guardados y sus cambios pendientes

#### Scenario: Borrar con pendientes
- **WHEN** el docente elige "Borrar los datos de este equipo" con cambios sin sincronizar
- **THEN** la app lo advierte y solo borra tras una segunda confirmación
