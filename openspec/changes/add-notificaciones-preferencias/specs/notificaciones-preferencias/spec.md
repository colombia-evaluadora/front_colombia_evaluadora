## ADDED Requirements

### Requirement: Matriz de preferencias por tipo y canal
El usuario SHALL poder activar o desactivar push y email por tipo de notificación; la bandeja in-app MUST recibir siempre la notificación independientemente de sus preferencias.

#### Scenario: Push desactivado para reacciones
- **WHEN** el usuario desactiva push para "reacciones" y alguien reacciona a su mensaje
- **THEN** no recibe push AND sí ve la notificación en la bandeja

#### Scenario: Email desactivado
- **WHEN** el usuario desactiva email para un tipo
- **THEN** no se incluye ese tipo en su digest

### Requirement: Horario silencioso con entrega diferida
Durante el horario silencioso el sistema MUST NOT enviar push ni email y SHALL entregarlos al terminar el horario si siguen sin leer, salvo prioridad `URGENTE_INSTITUCIONAL`.

#### Scenario: Mención en horario silencioso
- **WHEN** llega una mención dentro del horario silencioso
- **THEN** no hay push AND se envía al terminar el horario

#### Scenario: Leída antes de terminar el horario
- **WHEN** el usuario lee la notificación en la bandeja durante el horario silencioso
- **THEN** no se envía el push diferido

#### Scenario: Aviso urgente institucional
- **WHEN** la institución emite un aviso con prioridad `URGENTE_INSTITUCIONAL` en horario silencioso
- **THEN** el push se entrega de inmediato

### Requirement: Piso institucional por rol
La institución SHALL poder fijar por rol un horario silencioso mínimo y tipos no silenciables; la preferencia efectiva MUST ser la más restrictiva entre la del usuario y la institucional.

#### Scenario: Estudiante intenta quitar el horario
- **WHEN** un estudiante intenta desactivar el horario silencioso fijado por su institución
- **THEN** el control aparece bloqueado con "Definido por tu institución" AND el servidor rechaza el cambio

### Requirement: Silencio temporal por tipo
El usuario SHALL poder silenciar un tipo hasta una fecha y hora; mientras dure no recibe push ni email de ese tipo.

#### Scenario: Silenciar desde la bandeja
- **WHEN** el usuario elige "Silenciar este tipo por 8 horas" en una notificación
- **THEN** durante 8 horas no recibe push de ese tipo AND las notificaciones siguen llegando a la bandeja

### Requirement: Email digest self-hosted
El sistema SHALL enviar, a quien lo active, un resumen diario de notificaciones no leídas usando el provider de email configurado en la infraestructura propia.

#### Scenario: Digest diario
- **WHEN** a la hora del digest el usuario tiene notificaciones no leídas con email activo
- **THEN** recibe un único correo con el resumen y enlaces a `/app/notificaciones`
