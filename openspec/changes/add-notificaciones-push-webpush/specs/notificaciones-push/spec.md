## ADDED Requirements

### Requirement: Emisor Web Push self-hosted
El emisor de push SHALL ser `notification-service` con claves VAPID propias y cifrado `aes128gcm`; el sistema MUST NOT usar Firebase SDK, FCM como emisor ni servicios como OneSignal.

#### Scenario: Envío de push
- **WHEN** una notificación corresponde a push según las preferencias
- **THEN** `notification-service` la firma con la clave VAPID propia y la envía al endpoint de la suscripción

### Requirement: Suscripción por dispositivo tras gesto del usuario
El permiso de notificaciones SHALL pedirse solo tras una acción explícita del usuario; al concederlo el front SHALL registrar la suscripción con la clave VAPID pública propia.

#### Scenario: Activar en este dispositivo
- **WHEN** el usuario pulsa "Activar en este dispositivo" y concede el permiso
- **THEN** se registra una suscripción con la clave VAPID pública propia AND aparece en su lista de dispositivos

#### Scenario: Carga de la app
- **WHEN** el usuario abre la app por primera vez
- **THEN** no se le pide permiso de notificaciones

#### Scenario: Permiso denegado
- **WHEN** el permiso está denegado en el navegador
- **THEN** se muestran instrucciones para habilitarlo AND el usuario sigue recibiendo notificaciones in-app

### Requirement: Payload mínimo
El payload push SHALL contener solo `id`, `tipo` y texto genérico, y MUST NOT incluir contenido de mensajes ni nombres o datos de estudiantes.

#### Scenario: Mención en el chat
- **WHEN** se envía el push de una mención
- **THEN** el payload no contiene el texto del mensaje ni el nombre del autor

### Requirement: Suscripciones inválidas
Una respuesta 404 o 410 del push service SHALL marcar la suscripción como inválida y el sistema MUST NOT reintentar con ella.

#### Scenario: Push service responde 410
- **WHEN** el push service responde 410
- **THEN** la suscripción queda inválida AND no se reintenta

### Requirement: Limpieza en logout
Al cerrar sesión o cambiar de usuario en el mismo navegador el front SHALL eliminar la suscripción del dispositivo en el navegador y en el backend.

#### Scenario: Cierre de sesión
- **WHEN** el usuario cierra sesión
- **THEN** se elimina la suscripción del dispositivo AND el siguiente usuario no recibe sus avisos

### Requirement: Interacción con la notificación del sistema
Al hacer clic en una notificación push el Service Worker SHALL enfocar una pestaña existente o abrir el deep link, y la notificación SHALL marcarse como leída; al leerse en otro dispositivo la notificación del sistema con `tag = id` SHALL cerrarse si es posible.

#### Scenario: Clic en la notificación
- **WHEN** el usuario hace clic en el push
- **THEN** se abre el deep link AND la notificación queda leída

#### Scenario: Leída en otro dispositivo
- **WHEN** llega `notification.read` para un id con notificación del sistema visible
- **THEN** la pestaña abierta pide al Service Worker cerrar la notificación con ese `tag`

### Requirement: iOS sin PWA instalada
En Safari iOS/iPadOS sin la PWA instalada el front SHALL mostrar una guía de instalación en lugar del botón de permiso.

#### Scenario: Safari iOS en navegador
- **WHEN** el usuario abre preferencias en Safari iOS sin la PWA instalada
- **THEN** ve la guía de instalación en lugar del botón "Activar en este dispositivo"
