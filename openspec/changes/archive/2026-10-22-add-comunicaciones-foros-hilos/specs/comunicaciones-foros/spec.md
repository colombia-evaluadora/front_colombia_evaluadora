## ADDED Requirements

### Requirement: Canal de tipo foro
El sistema SHALL permitir crear canales de tipo `FORO` cuyas conversaciones son publicaciones con título, cuerpo, etiquetas, autor, fecha, última actividad, número de respuestas y estados fijada, cerrada y resuelta. Un foro MUST NOT aceptar mensajes sueltos fuera de una publicación.

#### Scenario: Mensaje suelto en un foro
- **WHEN** alguien envía un mensaje del chat a un canal `FORO`
- **THEN** el servidor responde 400 AND el mensaje no se guarda

#### Scenario: Publicación nueva
- **WHEN** un miembro con permiso de publicar envía título, cuerpo y hasta 5 etiquetas del foro
- **THEN** la publicación aparece en el listado AND su autor queda siguiéndola

### Requirement: Listado con orden, etiqueta y búsqueda
El listado SHALL ordenarse por actividad reciente, más nuevas o más votadas (respuestas + reacciones), siempre con las fijadas primero, filtrarse por una etiqueta y buscarse con FTS de Postgres en español sobre título y cuerpo.

#### Scenario: Búsqueda por raíz
- **WHEN** se busca "planta"
- **THEN** aparece la publicación cuyo cuerpo dice "plantas"

#### Scenario: Orden desconocido
- **WHEN** se pide un orden que no es `ACTIVIDAD`, `NUEVAS` ni `TOP`
- **THEN** el servidor responde 400

### Requirement: Respuestas hiladas con el modelo del chat
El detalle SHALL mostrar las respuestas en árbol según la respuesta citada; cuerpo y respuestas MUST admitir menciones, reacciones y adjunto como los mensajes del chat.

#### Scenario: Respuesta a una respuesta
- **WHEN** alguien responde citando una respuesta de la misma publicación
- **THEN** la nueva respuesta se muestra anidada bajo la citada

#### Scenario: Cita de otra publicación
- **WHEN** la respuesta cita un mensaje que no pertenece a la publicación
- **THEN** el servidor responde 404

### Requirement: Seguir publicaciones y notificaciones
Quien sigue una publicación SHALL recibir `FORO_RESPUESTA` por cada respuesta ajena, y quien es mencionado SHALL recibir `FORO_MENCION`, ambos por el outbox de notificaciones. Una persona MUST NOT recibir los dos avisos por la misma respuesta, ni avisos de sus propias respuestas o de un canal que silenció.

#### Scenario: Mención y seguimiento
- **WHEN** una respuesta menciona a la autora, que además sigue la publicación
- **THEN** ella recibe solo `FORO_MENCION`

#### Scenario: Dejar de seguir
- **WHEN** un miembro deja de seguir la publicación
- **THEN** no recibe `FORO_RESPUESTA` de las respuestas siguientes

### Requirement: Preguntas y respuestas
Quien publicó o la moderación SHALL poder marcar la publicación como resuelta, opcionalmente indicando la respuesta que la resolvió; otras personas MUST recibir 403.

#### Scenario: Solución eliminada
- **WHEN** se elimina la respuesta marcada como solución
- **THEN** la publicación conserva "resuelta" AND deja de tener solución

### Requirement: Moderación configurable
Fijar, cerrar, eliminar publicaciones o respuestas ajenas y poner etiquetas de moderación SHALL estar reservado al administrador del canal y a los perfiles configurados como moderadores. Qué perfiles publican y responden MUST ser configurable por institución (política de menores). Una publicación cerrada MUST NOT aceptar respuestas salvo de la moderación.

#### Scenario: Publicación cerrada
- **WHEN** un estudiante responde una publicación cerrada
- **THEN** el servidor responde 409

#### Scenario: Etiqueta de moderación
- **WHEN** alguien sin moderación usa una etiqueta "solo moderadores"
- **THEN** el servidor responde 403

### Requirement: Tiempo real del foro
El servidor SHALL publicar en `foro:<id>` los eventos `publicacion.creada|actualizada|eliminada`, `respuesta.creada|actualizada|eliminada` y `foro.actualizado`, solo para miembros activos del foro; el cliente SHALL aplicarlos sobre la cache sin perder si sigue la publicación.

#### Scenario: Suscripción ajena
- **WHEN** alguien que no es miembro se suscribe a `foro:<id>`
- **THEN** recibe `error` con código `forbidden`

### Requirement: Consulta sin conexión
Los foros, publicaciones y respuestas ya visitados SHALL poder leerse sin conexión; publicar, responder, reaccionar y moderar MUST estar deshabilitados sin red con el aviso estándar.

#### Scenario: Sin red
- **WHEN** el usuario abre una publicación visitada sin conexión
- **THEN** la ve completa AND los botones de escritura están deshabilitados con "Necesitas conexión para esta acción."
