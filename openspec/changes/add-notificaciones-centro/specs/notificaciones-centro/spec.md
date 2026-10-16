## ADDED Requirements

### Requirement: Bandeja persistente
El sistema SHALL guardar cada notificación en una bandeja por usuario con un `id` UUID compartido por la bandeja, el log de entrega de cada canal, el payload push y el evento de tiempo real.

#### Scenario: Nueva notificación
- **WHEN** un usuario es destinatario de un evento notificable
- **THEN** aparece no leída en su bandeja AND el contador aumenta en todas sus sesiones abiertas en menos de 2 s

#### Scenario: Evento duplicado
- **WHEN** llega dos veces un evento con el mismo `dedupeKey`
- **THEN** la bandeja conserva una sola notificación

### Requirement: Leído sincronizado entre dispositivos
Marcar una notificación como leída SHALL reflejarse en todas las sesiones del usuario mediante el evento `notification.read`.

#### Scenario: Leída en otro dispositivo
- **WHEN** el usuario abre la notificación en el celular
- **THEN** en el escritorio el contador baja AND la entrada se muestra como leída sin recargar

#### Scenario: Marcar todas
- **WHEN** el usuario pulsa "Marcar todas como leídas"
- **THEN** el contador queda en cero en todas sus sesiones

### Requirement: Deep link
Cada notificación SHALL llevar un deep link interno de la app; al abrirla el sistema SHALL navegar a ese destino y marcarla como leída.

#### Scenario: Actividad aprobada
- **WHEN** el docente hace clic en "Actividad aprobada"
- **THEN** navega a `/app/planeador/actividades?actividad=<id>` AND la notificación queda leída

#### Scenario: Deep link externo
- **WHEN** un evento trae un deep link que no empieza por `/app/`
- **THEN** el sistema lo rechaza y usa `/app/notificaciones`

### Requirement: Agrupación
Las notificaciones con la misma clave de agrupación dentro de la ventana de su tipo SHALL mostrarse como una sola entrada con el conteo de actores.

#### Scenario: Reacciones agrupadas
- **WHEN** llegan 5 reacciones al mismo mensaje en 10 minutos
- **THEN** se ve una sola entrada "Ana y 4 más reaccionaron…" AND el contador sube en uno

### Requirement: Campana y página de notificaciones
El header SHALL mostrar una campana con el contador de no leídas (`99+` como máximo) y un desplegable con las 10 últimas; la ruta `/app/notificaciones` SHALL listar todas por cursor con filtros por categoría, tipo y estado.

#### Scenario: Filtro por estado
- **WHEN** el usuario escribe `estado:(No leídas)` en la búsqueda
- **THEN** la lista muestra solo no leídas AND el filtro queda en la URL

#### Scenario: URL inválida
- **WHEN** la URL trae un filtro con un valor desconocido
- **THEN** la página carga ignorando ese filtro sin error

#### Scenario: Anuncio accesible
- **WHEN** llega una notificación nueva con la página abierta
- **THEN** se anuncia por una región `aria-live="polite"`

### Requirement: Lectura sin conexión
La lista y el contador SHALL mostrarse desde la cache persistida cuando no hay conexión, con aviso visible, y las acciones de escritura MUST deshabilitarse mientras dure el corte.

#### Scenario: Sin conexión
- **WHEN** el usuario abre la campana sin conexión
- **THEN** ve la lista cacheada con el aviso "Sin conexión" AND las acciones de marcar están deshabilitadas

### Requirement: Retención
El sistema SHALL purgar las notificaciones leídas tras 90 días y las no leídas tras 180 días, salvo configuración distinta por tipo.

#### Scenario: Purga
- **WHEN** una notificación leída supera 90 días
- **THEN** el job de purga la elimina de la bandeja
