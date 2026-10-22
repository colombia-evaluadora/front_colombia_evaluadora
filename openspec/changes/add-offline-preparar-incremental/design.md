# Design: "Preparar sin conexión" incremental

"Preparar todo el año" bajaba y REESCRIBÍA todo en cada corrida (~440 requests,
~1,5-2 min, cada fila cifrada y escrita de nuevo en IndexedDB aunque nada
hubiera cambiado). Ahora cada corrida escribe solo lo que cambió y no vuelve a
bajar lo que el servidor confirma igual. Sin cambio de esquema.

## D-1. Escribir solo lo que cambió (front, sin backend)

`lib/offline/query-persister.ts`

- Por cada query persistida se recuerda la huella del JSON guardado
  (`hashString`, cyrb53 sobre el JSON ya pasado por `persistSelect`) y la
  referencia del dato en memoria.
- Al terminar bien una query:
  1. misma referencia (TanStack conserva la referencia si el dato nuevo es
     igual, `structuralSharing`) → ni se serializa;
  2. si no, misma huella → no se cifra ni se escribe;
  3. en los dos casos se anota "verificado a las…" en un mapa liviano
     (`meta["verified:<sub>"]`, una sola escritura por lote).
- Al restaurar, la fecha efectiva del dato es `max(dataUpdatedAt, verificado)`:
  el indicador de antigüedad, el borrado por antigüedad máxima y el LRU la
  usan. La fila cifrada no se toca.
- El lote (`dirty`, throttle de 1 s) ya era por query; ahora además filtra lo
  que no cambió. `getPersistStats()` cuenta filas escritas / sin cambios.

## D-2. No volver a bajar lo que no cambió (ETag / 304)

### Backend (sso, query-service)

`ConditionalReadFilter`: en toda lectura (`GET`, o `POST` sin
`Idempotency-Key`) que responde 200 pone `ETag` = SHA-256 (base64url) del
cuerpo; si la request trae ese valor en `If-None-Match` responde **304 sin
cuerpo**. La consulta se ejecuta igual (el ETag sale del cuerpo): se ahorra la
transferencia, el parseo, el mapeo, el cifrado y la escritura en el cliente.
Una escritura (lleva `Idempotency-Key`, o es PUT/PATCH/DELETE) nunca responde
304. La comparación ignora `W/` (Cloudflare debilita el ETag al comprimir).
CORS del gateway y de query-service: `If-None-Match` permitido, `ETag`
expuesto (hoy no hace falta: `/api` es mismo origen vía Worker/Vite).

No sirve `ShallowEtagHeaderFilter` de Spring: solo mira GET y se apaga con el
`Cache-Control: no-store` que agrega Spring Security.

### Front

Una query de TanStack no es UNA request (su `queryFn` puede pedir varias y
mapearlas) y lo guardado es el resultado mapeado, no los cuerpos: no hay cuerpo
que devolverle a la `queryFn` ante un 304. Por eso el 304 se usa ANTES de
correrla (`lib/offline/conditional-requests.ts`):

1. Al bajar una query, Preparar **graba** sus lecturas (método, URL, cuerpo,
   `ETag`): son sus *validadores* y se guardan cifrados en la misma fila
   (`PersistedQueryRow.validators`, campo opcional: no sube `DB_VERSION`).
2. En la siguiente corrida, si la query está en el equipo, se **sondean** esas
   lecturas con `If-None-Match` desde un cliente axios aparte (sin el
   interceptor que desenvuelve ni toasts). Todo 304 → la query no se baja ni
   se reescribe; `setQueryData` con la MISMA referencia la marca fresca.
3. Alguna 200 → se corre la `queryFn` normal; la respuesta 200 del sondeo queda
   un minuto en `stash` y la misma request la toma sin volver a la red
   (`config.adapter`), así no se baja dos veces.

Reglas de la grabación (por ventana de tiempo: las tareas van en serie):

- Se marca toda request que ARRANCA durante la tarea. Una que no sea lectura
  repetible (escritura, multipart, outbox) o que falle invalida la grabación:
  nunca se repite una escritura y el sondeo nunca deja afuera una lectura.
- Una lectura sin `ETag` (otro microservicio, backend viejo) → sin validadores
  → la query se baja completa, como antes.
- Si la pantalla ya estaba pidiendo esa query al empezar la tarea, sus
  lecturas arrancaron antes de grabar: no se guardan validadores.
- Los validadores valen solo para el dato que dieron (misma referencia en
  memoria): si el dato cambió por otro camino (la pantalla lo refrescó con
  otro contenido, una escritura offline lo editó en el cache), no se sondea y
  se baja. Un sondeo que vuelve después de que la query se invalidó tampoco
  vale.
- Una lectura de la pantalla que se cuele en la ventana solo agrega un
  validador de más (repetir una lectura es inocuo; si cambió, provoca una
  descarga de más y la próxima grabación ya sale limpia).

Interceptores: el de grabación va ANTES del que desenvuelve `response.data`
(necesita headers y config). Los sondeos de una misma corrida se memorizan por
request (dos queries que comparten una lectura la preguntan una vez) y van en
paralelo: hasta 8 en vuelo a mano, 3 en la autopreparación, mirando hasta 60
tareas hacia adelante. Las descargas siguen en serie.

## D-3. Saltear lo que está fresco

`features/offline/lib/prepare-freshness.ts` + `prepare-query.ts`

| Clase | Ventana |
|---|---|
| Catálogos y proveedores (TTL ≥ 14 d: catálogos, sedes, periodos, referentes) | 24 h |
| Datos de grupo (actividades, unidades, informes, listas de estudiantes) | 4 h |
| Planilla, asistencia, notificaciones, chat y foros | 0: siempre, pero condicional |

- Dentro de la ventana (contando la fecha de verificación) no se pide nada; las
  listas que expanden a otras tareas devuelven lo guardado y sus hijas deciden
  solas.
- Una query invalidada por una escritura no cuenta como fresca ni se sondea: se baja.
- La misma key repetida en dos secciones se resuelve una vez por corrida.
- La autopreparación usa las mismas ventanas (ya no lleva un `staleTime` global de 2 h).
- **"Forzar todo"** (Opciones del diálogo) ignora ventanas y sondeos.
- El menú no es una tarea de Preparar: vive en la sesión offline
  (`menuSnapshot`) y se refresca al iniciar sesión (`staleTime: Infinity`).

El diálogo muestra cuánto ya estaba al día y cuánto se actualizó en la última
corrida (`PrepareRunStats`, también en la consola).

## Mediciones (MSW, `e2e/offline-prepare-incremental.spec.ts`)

Docente de prueba, "Preparar todo" dos veces seguidas:

| | Primera | Segunda |
|---|---|---|
| Duración | ~85 s | ~13-16 s |
| Requests a `/api` | 384 (todas con cuerpo) | 271: 266 condicionales → 304 sin cuerpo, 5 completas |
| Queries bajadas | 365 | 2 |
| Frescas / 304 | 11 / 0 | 185 / 267 |
| Escrituras en IndexedDB (`queries`) | 376 | **0** |

Línea base (origin/dev antes del cambio): ver el PR; la segunda corrida bajaba
y reescribía todo igual que la primera.

Los 13-16 s restantes son los 266 sondeos de planilla/asistencia contra los
`delay()` de 200-300 ms de MSW con 8 en vuelo. Contra el backend real el 304
cuesta lo que la consulta SQL (se ejecuta para calcular el ETag) sin la
transferencia.

## D-4. Follow-up (solo diseño): deltas "cambiado desde X"

Para planilla y asistencia el sondeo sigue ejecutando la consulta completa en
el servidor. El siguiente paso, cuando haga falta, son endpoints delta:

- `POST /planeador/planilla/calificaciones/cambios` y
  `POST /asistencias/cambios` con `{ ..., DESDE: <timestamp del servidor> }`
  que devuelven solo las filas con `modified_at > DESDE` (y las bajas lógicas)
  más el `X-Server-Time` del corte.
- El front aplica el delta sobre la query guardada (merge por pk) y guarda el
  nuevo corte junto a los validadores.
- Requiere `modified_at` confiable (con trigger) en `tactividad_estudiante` y
  en la tabla de asistencia, y un índice por (grupo, `modified_at`): **es cambio
  de esquema y NO se hace en este cambio**; queda para aprobar aparte.
- Con ETag + ventanas el costo ya bajó a "una consulta por grupo sin
  transferencia"; los deltas solo valen la pena si el SQL de la planilla pesa
  en el servidor.

Otros follow-ups:

- ETag en los demás microservicios (comms, notificaciones): hoy sus lecturas
  no traen `ETag` y esas queries se bajan completas (como antes).
- El sondeo podría ir en un solo request batch (`POST /condicional` con la
  lista de validadores) para no pagar la latencia por request.
