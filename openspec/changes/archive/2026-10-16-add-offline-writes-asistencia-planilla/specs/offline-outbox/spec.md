## ADDED Requirements

### Requirement: Encolado de escrituras
Toda escritura con handler registrado SHALL pasar por `runOrQueue` (online-first, decisión D-F2-7): con red se envía directo con su `Idempotency-Key`; sin red, ante un error de red o con ops abiertas de la misma `entityKey`, MUST encolarse en IndexedDB con la misma clave, `kind`, `entityKey`, `dependsOn` y `userSub`. Si no se puede guardar, la operación MUST rechazarse visiblemente (nunca perder en silencio).

#### Scenario: Respuesta perdida con red
- **WHEN** la escritura sale con red pero la respuesta no llega
- **THEN** queda en la cola con la misma `Idempotency-Key` y el reintento no duplica el cambio

#### Scenario: Guardar sin red
- **WHEN** el docente guarda una calificación sin red
- **THEN** la operación queda pendiente y se muestra "Guardado en este equipo. Se enviará cuando haya conexión."

#### Scenario: Cuota excedida
- **WHEN** IndexedDB lanza `QuotaExceededError` al encolar
- **THEN** se muestra "No hay espacio en este equipo para guardar el cambio sin conexión." y el formulario no se limpia

### Requirement: Ventana de 14 días
La outbox SHALL dejar de aceptar operaciones nuevas cuando pasan 14 días desde `lastOnlineAuthAt`, conservando y enviando las existentes al reconectar, y MUST avisar desde el día 12.

#### Scenario: Día 12
- **WHEN** han pasado 12 días sin autenticarse online
- **THEN** aparece el chip "Conéctate antes del {fecha} para seguir trabajando sin conexión."

#### Scenario: Día 14
- **WHEN** han pasado 14 días
- **THEN** no se aceptan ops nuevas y se muestra "Llevas 14 días sin conectarte. Conéctate para seguir registrando sin conexión; lo que ya guardaste está a salvo."

### Requirement: Sincronización ordenada e idempotente
El procesador SHALL correr en la página con un único líder entre pestañas, asegurar el token antes de enviar, enviar solo ops del `sub` actual, respetar FIFO por `entityKey` y `dependsOn`, reutilizar la `Idempotency-Key` en cada reintento y aplicar backoff `min(5 min, 2 s·2^intentos)` con jitter, sin límite para errores de red y con máximo 8 para 5xx.

#### Scenario: Respuesta perdida
- **WHEN** el servidor aplica una op pero la respuesta no llega
- **THEN** el reintento con la misma `Idempotency-Key` no duplica el cambio

#### Scenario: Refresh 401 al sincronizar
- **WHEN** el refresh previo al envío responde 401
- **THEN** se pausa la cola, se muestra "Tu sesión expiró. Inicia sesión para enviar N cambios pendientes. No se perderán." y la outbox se conserva

#### Scenario: Pestaña cerrada a mitad
- **WHEN** una op queda `inflight` más de 60 s tras reabrir
- **THEN** vuelve a `retry`

### Requirement: Versión base por celda y estudiante
Cada escritura encolable de asistencia SHALL llevar la versión del registro que vio el docente (`version_registro`, `updated_at`; `NONE` si no había registro) cuando la outbox está habilitada, y el servidor MUST responder 409 `OFFLINE_CONFLICT` con el valor y la versión actuales en lugar de pisar el dato.

#### Scenario: Otro docente registró la misma sesión
- **WHEN** el registro del estudiante cambió en el servidor desde la versión enviada
- **THEN** nada se escribe y la op queda `conflict` con una fila por estudiante

### Requirement: Conflictos y rechazos visibles
Un 409 de CAS SHALL marcar la op como `conflict` y ofrecer "Conservar el mío", "Usar el del servidor" y "Editar"; un rechazo de negocio MUST marcarla `rejected` con el mensaje del servidor y bloquear sus dependientes.

#### Scenario: Coordinador editó la misma calificación
- **WHEN** el servidor responde 409 con el valor actual
- **THEN** se abre "Este dato cambió mientras estabas sin conexión" con ambas versiones

### Requirement: Archivos en la cola
Los adjuntos offline SHALL copiarse como Blob, con tope `min(límite de la superficie, 10 MB)` por archivo, 3 por op, 25 MB por request y 150 MB / 60 archivos por usuario, avisando al 80 %.

#### Scenario: Cuota de archivos llena
- **WHEN** se alcanzan 150 MB o 60 archivos pendientes
- **THEN** se rechaza el adjunto con "Ya no hay espacio para más archivos sin conexión en este equipo. Sincroniza o adjunta este archivo cuando tengas conexión."

### Requirement: Página de cambios pendientes
El sistema SHALL ofrecer `/app/pendientes`, disponible offline y fuera del menú del backend, con filtro por estado, reintentar, ver detalle, resolver, descartar (con confirmación y dependientes) y exportar registro.

#### Scenario: Sin pendientes
- **WHEN** la outbox está vacía
- **THEN** se muestra "No tienes cambios pendientes. Todo está sincronizado."

### Requirement: Logout con pendientes
El logout con operaciones pendientes SHALL ofrecer "Sincronizar y salir", "Salir y conservar en este equipo" (no en modo compartido) y "Descartar y salir".

#### Scenario: Equipo compartido
- **WHEN** el usuario cierra sesión con pendientes en modo compartido
- **THEN** no aparece "Salir y conservar en este equipo"
