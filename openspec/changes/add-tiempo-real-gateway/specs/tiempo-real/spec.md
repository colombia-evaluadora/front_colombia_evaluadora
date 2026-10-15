## ADDED Requirements

### Requirement: Gateway de tiempo real self-hosted
El sistema SHALL entregar eventos servidor→cliente mediante un gateway WebSocket operado en la infraestructura propia (servicio propio o Centrifugo self-hosted sobre el Redis existente) y MUST NOT depender de servicios de tiempo real de terceros (Pusher, Ably, Stream, Firebase).

#### Scenario: Evento entregado en vivo
- **WHEN** un servicio publica un evento para un usuario conectado
- **THEN** el cliente lo recibe en menos de 2 s p95

#### Scenario: Sin dependencias SaaS
- **WHEN** se revisa la configuración de despliegue del gateway
- **THEN** todos los endpoints de tiempo real resuelven a hosts propios

### Requirement: Autenticación por ticket de un solo uso
El cliente SHALL obtener con `POST /comms/ws-ticket` (Bearer) un ticket válido 30 s y de un solo uso para abrir el socket; el access token MUST NOT viajar en la URL ni en cookies del socket.

#### Scenario: Ticket reutilizado
- **WHEN** se intenta abrir un segundo socket con un ticket ya consumido
- **THEN** el servidor rechaza el handshake

#### Scenario: Ticket vencido
- **WHEN** el ticket tiene más de 30 s
- **THEN** el servidor rechaza el handshake AND el cliente pide uno nuevo

### Requirement: Reautenticación al vencer el token
El servidor SHALL cerrar el socket con el código `4001` cuando vence la sesión asociada, y el cliente SHALL refrescar la sesión, pedir un ticket nuevo y reconectar; ante `4003` el cliente MUST NOT reintentar.

#### Scenario: Token expirado
- **WHEN** el token del usuario expira con el socket abierto
- **THEN** el servidor cierra con `4001` AND el cliente reconecta con un ticket nuevo sin intervención del usuario

#### Scenario: Acceso revocado
- **WHEN** el servidor cierra con `4003`
- **THEN** el cliente no reintenta la conexión

### Requirement: Reanudación sin duplicados
Cada evento SHALL llevar un `seq` monotónico por tópico; al reconectar el cliente SHALL pedir los eventos posteriores a su último `seq` y MUST descartar los ya aplicados.

#### Scenario: Reconexión tras corte
- **WHEN** el socket se reconecta después de un corte de red
- **THEN** el cliente pide eventos desde su último `seq` AND no aplica ninguno dos veces

#### Scenario: Historial no disponible
- **WHEN** el servidor ya no conserva los eventos pedidos
- **THEN** responde `resync` AND el cliente invalida las queries del tópico

### Requirement: Autorización de tópicos en el servidor
El servidor SHALL decidir a qué tópicos se suscribe cada conexión según la identidad del ticket; un cliente MUST NOT recibir eventos de tópicos de otro usuario.

#### Scenario: Suscripción ajena
- **WHEN** un cliente pide suscribirse a `user:<otro-sub>`
- **THEN** el servidor rechaza la suscripción

### Requirement: La cache de consultas es la fuente de verdad del front
El cliente SHALL usar los eventos solo para parchear o invalidar la cache de TanStack Query; las lecturas SHALL seguir por REST.

#### Scenario: Gateway desactivado
- **WHEN** `VITE_APP_REALTIME_URL` está vacío
- **THEN** el cliente no abre socket AND las pantallas funcionan con su polling actual

### Requirement: Ciclo de vida ligado a la sesión
El socket SHALL abrirse solo con sesión activa y MUST cerrarse en logout y al cambiar de usuario.

#### Scenario: Logout
- **WHEN** el usuario cierra sesión
- **THEN** el socket se cierra AND no se reconecta
