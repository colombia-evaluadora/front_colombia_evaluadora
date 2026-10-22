# Design: Foros de comunicaciones

Fuente: [`PLAN-comunicaciones.md`](../../../docs/comunicaciones/PLAN-comunicaciones.md) §3, §5 (`thilo`), §6 y §7. Depende de `add-tiempo-real-gateway` y `add-notificaciones-eventos-dominio` (outbox).

## Context

- `comms-service` ya resuelve el chat sobre el schema `comunicaciones` (V560) con JDBC directo, publica eventos de tiempo real tras cada commit y encola notificaciones en `toutbox_evento` (V561/V561.1).
- El modelo de mensaje del chat (`tmensaje` + menciones + reacciones + adjunto) ya está probado en el front y en el servicio.

## Decisiones

### D-1 Un foro es un `tcanal` de tipo `FORO`
Reutiliza membresía, roles de canal (ADMIN/MIEMBRO), bloqueo, silencio y la creación de `POST /conversaciones` (`TIPO: "FORO"`). **Descartado**: tabla `tforo` propia — duplicaría membresía y autorización del socket.
El cambio del `CHECK` de `tcanal.tipo` y del índice de nombre único se hace **editando V560** (dueña del objeto), con `DROP ... IF EXISTS` + `ADD` para que una base ya creada lo reciba al reaplicar.

### D-2 Cuerpo y respuestas son `tmensaje`; `thilo_mensaje` los ata
`thilo.fk_tmensaje_raiz` es el cuerpo; cada respuesta tiene una fila en `thilo_mensaje`. Así reacciones, menciones, adjunto, edición e idempotencia (`client_msg_id`) se heredan del chat sin tocar `tmensaje`. **Descartado**: columna `fk_thilo` en `tmensaje` — obligaba a una FK circular entre V560 y la migración nueva.
El chat rechaza escribir sueltos en un `FORO` (400) y no deja borrar ni editar el cuerpo desde sus endpoints (lo hace el foro, que recalcula la búsqueda).

### D-3 Hilado por respuesta citada
Las respuestas forman un árbol por `fk_respuesta` (la "respuesta citada" del chat), con sangría hasta 3 niveles. **Descartado**: hilos anidados con tabla propia — el árbol ya está en `fk_respuesta`.

### D-4 Búsqueda FTS en español con `tsvector` mantenido por el servicio
`thilo.busqueda = setweight(to_tsvector('spanish', titulo),'A') || setweight(to_tsvector('spanish', cuerpo),'B')`, índice GIN, consulta con `websearch_to_tsquery('spanish', :q)`. **Descartado**: columna generada — el cuerpo vive en `tmensaje` y una columna generada no puede leer otra tabla.

### D-5 Contadores calculados, actividad guardada
`respuestas` y `reacciones` se cuentan al leer (escala de colegio, índice por hilo); `ultima_actividad` se guarda porque ordena el listado. "Más votadas" = respuestas + reacciones del cuerpo.

### D-6 Política configurable (menores)
`comms.politica.foros.{publicar,responder,moderar}` por perfil (DIRECTIVO, DOCENTE, ACUDIENTE, ESTUDIANTE); por defecto todos publican y responden y modera DIRECTIVO, más el ADMIN del canal. Se expone en `GET /comunicaciones/politica` (`foros`) y en la cabecera del foro (`puedePublicar`, `puedeResponder`, `puedeModerar`). El front solo oculta; el servidor aplica (403).

### D-7 Notificaciones por el outbox
`FORO_MENCION` (mencionados, ALTA) y `FORO_RESPUESTA` (seguidores y autor del mensaje citado, agrupable 10 min). Nadie recibe ambos por la misma respuesta; se excluyen el autor y los miembros con el canal silenciado. Deep link `/app/comunicaciones/foros?foro=&publicacion=&mensaje=`.

### D-8 Tiempo real
Tópico `foro:<id>` autorizado igual que `canal:<id>` (miembro activo no bloqueado). Eventos neutros (sin `esPropia`/`siguiendo`): el cliente conserva `siguiendo` y calcula lo propio por `autor.id`.

### D-9 Offline
Lecturas con `meta.offline` (TTL de detalle, 3 días): foros, cabecera, listados, detalle y respuestas ya visitados se ven sin red. Escrituras **no se encolan**: publicar, responder o moderar sobre datos viejos genera conflictos difíciles de explicar en un foro; se deshabilitan con `useOnlineOnly`. **Descartado**: outbox offline de respuestas — queda para la "cola offline de envío" del chat (v2).
