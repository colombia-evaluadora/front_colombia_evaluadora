# Change: Foros de comunicaciones (publicaciones con hilos, estilo Discord)

## Why

El chat sirve para conversar, pero las dudas por tema o por tarea se pierden entre mensajes. El plan de comunicaciones ([`PLAN-comunicaciones.md`](../../../docs/comunicaciones/PLAN-comunicaciones.md) §3, §7 v2 y §13.2 change 9) prevé **foros**: canales donde cada publicación es un hilo con título, etiquetas y respuestas, que se puede marcar como resuelta (preguntas y respuestas) y moderar.

## What Changes

- Canal de tipo `FORO` en `comms-service` (V560 editada: `tcanal.tipo` admite `FORO`) y tablas nuevas en V585: publicaciones (`thilo`), etiquetas por foro, etiquetas por publicación, respuestas (`thilo_mensaje`) y seguidores.
- Cada publicación: título, cuerpo, etiquetas, autor, fecha, última actividad, número de respuestas, fijada, cerrada y resuelta (con la respuesta que la resolvió).
- Listado con orden (actividad reciente, más nuevas, más votadas), filtro por etiqueta y búsqueda **FTS de Postgres en español** (`websearch_to_tsquery('spanish')`, título peso A y cuerpo peso B).
- Detalle con respuestas hiladas (por respuesta citada). Cuerpo y respuestas reutilizan el modelo de mensaje del chat: menciones `<@id>`/`@canal`/`@todos`, reacciones y adjunto.
- Seguir/dejar de seguir: quien publica o responde sigue la publicación; los seguidores reciben `FORO_RESPUESTA` y los mencionados `FORO_MENCION` por el outbox existente (V561).
- Moderación: fijar, cerrar, eliminar y mover etiquetas. Modera el administrador del canal y los perfiles de `comms.politica.foros.moderar`; quién publica y responde también es configurable (política de menores).
- Tiempo real en el tópico `foro:<id>` (`publicacion.*`, `respuesta.*`, `foro.actualizado`); reacciones y ediciones siguen por `canal:<id>`.
- Front: pantalla `/app/comunicaciones/foros` (menú `FOROS`, sso V586), mocks MSW con el mismo contrato, lecturas persistidas para consulta sin conexión (`meta.offline`) y escrituras deshabilitadas sin red.

## Impact

- Specs: nueva `comunicaciones-foros`.
- Front: `src/features/comunicaciones/foros/*`, `src/router.tsx`, `src/config/paths.ts`, `src/mocks/{db,handlers}/comunicaciones-foros.ts`, `src/lib/eval-col-client.ts` (`getRow`), chat (oculta los canales `FORO`; el diálogo de crear canal también crea foros).
- Backend `sso`: V560 (editada), V585 (DDL), V586 (menú), `comms-service` (`foro/*`, política, tópico `foro:`), `notification-service` (`CatalogoTipos`: `FORO_MENCION`, `FORO_RESPUESTA`).
- Sin cambios en el gateway: `/api/eval-col/comunicaciones/**` ya enruta a `comms-service`.
