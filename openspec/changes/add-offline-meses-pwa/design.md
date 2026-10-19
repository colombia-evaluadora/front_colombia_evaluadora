# Design: Offline de meses (PWA)

Todas las decisiones son **defaults revisables**. Las que tocan datos de
menores dependen de **P6** (política institucional sobre datos de estudiantes
en equipos personales), que sigue pendiente con el usuario.

## D-0. Bug de testv2 (resuelto en #730)
`/app` redirigía al primer ítem del menú (Cobertura/Establecimiento, solo en
línea); el login marcaba "equipo compartido" por defecto (nada se persistía);
y el banner usaba una lista positiva desincronizada. Ver
`docs/offline/AUDITORIA-RUTAS.md`.

## D-1. Almacenamiento persistente e instalación (implementado)
- Al preparar se llama `navigator.storage.persist()` y se muestra el estado
  (`StorageStatusCard`): persistente / NO persistente, uso y cuota
  (`navigator.storage.estimate()`), días máximos offline.
- Riesgos en rojo (`storageRisks`): iOS sin instalar, no persistido, uso ≥ 80%.
- Instalación: botón con `beforeinstallprompt` (Chromium); en iOS, instrucciones
  ("Compartir" y "Agregar a inicio").
- Riesgos de evicción documentados:
  - **Safari/iOS**: ITP borra todo el almacenamiento de script de un sitio tras
    7 días de uso del navegador sin interacción con ese sitio, **salvo que la
    PWA esté instalada** en la pantalla de inicio (la app instalada tiene su
    propio contenedor y no aplica el contador). Recomendación fuerte: instalar
    y abrir siempre desde el ícono.
  - **Chromium/Firefox**: sin `persist()` concedido, el almacenamiento es
    "best-effort" y se desaloja por LRU bajo presión de disco. Chromium concede
    `persist()` de forma heurística (instalada, marcada, con engagement alto);
    Firefox pregunta al usuario.
  - Borrar datos de navegación / modo privado siempre borra todo.
- Follow-up: aviso periódico (al abrir la app) si el estado empeora, no solo
  en el diálogo de preparar.

## D-2. Duración máxima offline (implementado)
`VITE_APP_OFFLINE_MAX_DAYS` (default **180**, rango 1-400) en `lib/offline/limits.ts`:
- sesión offline (`OFFLINE_SESSION_MAX_AGE_MS`), snapshot del menú,
  ventana de la outbox (`OUTBOX_WINDOW_MS`, aviso 14 días antes) y retención
  de queries persistidas usan el mismo número.
- El `ttl` por clase de dato (catálogo 30 d, roster 7 d, detalle 3 d) **ya no
  borra**: solo marca el dato como antiguo (`freshness.ts`). Se borra recién
  pasada la duración máxima.

## D-3. Sesión larga y credencial del equipo
Hoy: la cookie `sso_refresh` dura 30 días (`REFRESH_COOKIE_MAX_AGE`,
`sso.refresh-token.ttl-seconds`); el modo offline no la necesita (el usuario se
deriva del JWT guardado y la sesión offline vive en IndexedDB).
Decisión (revisable): **no** se emite un refresh de 180 días. El día de
sincronización el usuario vuelve a ingresar su contraseña en línea; la outbox
pausa en estado "auth" y **no descarta nada** hasta que hay sesión. Motivo: un
token de meses en un equipo rural robable es peor que pedir la contraseña una
vez con internet.
Alternativa diseñada (follow-up si el usuario la pide): `device_token`
(registro del equipo online, `POST /auth/devices`, hash en BD, TTL =
`OFFLINE_MAX_DAYS`, rotación en cada uso, revocable) aceptado por
`/auth/refresh` como segunda vía. Requiere tabla nueva → **cambio de esquema
que necesita OK explícito** (regla del repo sso).

## D-4. Desbloqueo local (diseñado, follow-up)
Al pasar a "equipo personal" se pide un PIN (≥ 6 dígitos) o se reutiliza la
contraseña. Se guarda `salt` + `PBKDF2-SHA256(pin, salt, 310 000)` en
`meta.unlock`. Al abrir sin red se pide el PIN; 10 intentos fallidos borran los
datos no pendientes (los pendientes se conservan cifrados, ver D-8).

## D-5. Outbox (implementado en parte)
Ventana = duración máxima. Pasada la ventana la outbox deja de **aceptar** y
**nunca borra** lo que ya tiene. Cada envío lleva `X-Client-Captured-At`
(instante de captura, `op.createdAt`).

## D-6. "Preparar todo" (follow-up)
Extiende `prepare-offline-plan.ts`: todos los grupos × asignaturas × **todos**
los periodos del año, unidades/actividades/instrumentos/referentes, calendario
y roster de asistencia, catálogos, menú y permisos. Plan persistido en
`meta.preparePlan` con estado por tarea → reanudable tras cortes. Adjuntos
opcionales con tamaño estimado (`Content-Length` vía `HEAD`). "Última
preparación" con indicador verde < 7 d, amarillo < 30 d, rojo después.

## D-7. Reglas del backend para meses offline (follow-up, sso)
- El gateway propaga `X-Client-Captured-At` como `:HEADER.CAPTURED_AT` al motor
  de queries; las funciones de calificación/asistencia (`fn_*` del planeador)
  aceptan la escritura si el periodo estaba **abierto en la fecha de captura**
  (aunque hoy esté cerrado) y la captura no es futura (tolerancia 10 min).
- Si no: `PERIODO_CERRADO` → el front crea una **solicitud al coordinador**
  (flujo existente de reapertura) con el lote rechazado adjunto.
- Se editan las migraciones/funciones dueñas (no migraciones nuevas para
  objetos existentes). SQL se verifica contra el esquema real de testv2.
- Compatibilidad: sin header, el comportamiento es el actual. El gateway
  responde `X-Min-Client-Version`; si el cliente (`X-Client-Version`, SHA del
  build) es menor, tras sincronizar se muestra "Actualiza la app".

## D-8. Cifrado en reposo y borrado remoto (follow-up)
Clave AES-GCM 256 derivada del PIN (PBKDF2) envolviendo una DEK aleatoria; la
DEK cifra `data` de `queries`, `payload` de `outbox` y blobs. Sin PIN no se
abre nada. Revocación: `GET /auth/devices/me` en cada sync; si `revoked`, se
borra IndexedDB **después** de intentar subir lo pendiente.

## D-9. Respaldo USB (follow-up)
Exportar: JSON de ops pendientes + blobs, cifrado AES-GCM con la DEK,
firmado (ECDSA P-256, par generado al registrar el equipo; pública en el
backend). Importar en otro equipo con internet: el backend valida firma y
equipo, y procesa las ops con su `Idempotency-Key` (re-importar no duplica).

## D-10. Pantallas (implementado en #730 + follow-up)
Matriz en `docs/offline/AUDITORIA-RUTAS.md`. Admin y Cobertura siguen solo en
línea con mensaje claro (Cobertura: datos de menores, P6).

## D-11. Día de sincronización (follow-up)
`/app/sincronizar`: barra de progreso por lotes (concurrencia 3, ya existe en
el motor), reanudable; reporte final de subidos / conflictos / rechazados con
motivo; luego "Preparar todo" en modo refresco.

## D-13. Ninguna carga infinita sin conexión (implementado)
Reporte de testv2: sin red, lo que no se había preparado quedaba en skeleton o
spinner para siempre. Con `networkMode: "online"` una query sin datos queda
`pending`/`paused` hasta que vuelva la red; las mutaciones, en "Guardando…".

Decisión (revisable): `networkMode` **híbrido por query**
(`lib/offline/offline-query-client.ts`). Sin datos → `"always"`: el `queryFn`
corre sin red, falla al instante y la pantalla muestra "Sin conexión: esta
información no está guardada en este equipo". Con datos → `"online"`: el
refetch se pausa y se sigue viendo lo guardado. `retry` no reintenta sin red y
las mutaciones van con `"always"` (las que funcionan offline ya pasan por la
outbox, D3).

`"offlineFirst"` como default global se evaluó y se descartó: (1) sus
reintentos sí se pausan sin red, así que una query sin datos cuyo primer
intento falla quedaba igual cargando; (2) corre el `queryFn` aunque haya datos
y un refetch sin red (al montar, al invalidar tras encolar en la outbox, por
`refetchInterval`) deja la query en `error` con datos: las pantallas que miran
`isError` antes que `data` escondían lo guardado y la capa optimista de la
outbox parpadeaba a error. El híbrido no toca las queries con datos, así que
la restauración del persister y la outbox no cambian.

Red de seguridad en la UI: `useOfflineStall` (1,5 s sin red con un indicador
de carga visible) en `DataTable`, `Skeleton`, `Spinner`, `LoadingLabel`,
`Select` y `ComboboxField`, y una línea en el banner offline cuando una query
observada no tiene datos por falta de red.

## D-6 (ampliado). Preparar cubre las listas con filtros (implementado)
"Preparar todo el año" ya no depende de lo que se abrió en la sesión: baja
cada lista con la MISMA key que usa su pantalla
(`features/offline/lib/prepare-tasks.ts`):
- Planeador: pestañas de rótulo; por pestaña, resumen, calendario de cada mes
  de los periodos elegidos y el rail por día (hoy y hasta 15 días ocupados a
  cada lado, siguiendo `dia_anterior`/`dia_siguiente`); unidades con su
  referente y actividades; detalle de todas las actividades.
- Planilla: además de columnas y calificaciones, el rótulo, el referente del
  grado y el instrumento de cada actividad (popover de la celda).
- Asistencia: calendario por sede y mes (todas las sesiones y "mis clases"),
  resumen semanal del mes en curso y el siguiente, y la lista de estudiantes de
  cada sesión de los próximos 14 días.
- Informes: cascada sede → año (el actual) → cada jornada → periodos y grupos,
  y el informe de cada grupo con los periodos por defecto y cada periodo suelto.
- Referentes: todas las páginas, catálogos del filtro y el detalle de cada
  referente con sus enunciados por área × grado (evidencias del grado por
  defecto).
- Comunicaciones, notificaciones y establecimiento (solo consulta).
Solo se preparan las secciones del menú del usuario; lo que depende del rol va
como tarea opcional (si responde 403 no cuenta como error). Las queries de esas
pantallas declaran su `meta.offline` (la pantalla lo pisaba al montar si el
hook no lo tenía). El E2E `offline-all-routes` exige que, tras preparar, ninguna
query de la vista por defecto quede sin datos.

## D-12. App instalada = equipo personal (implementado, default revisable)
Cuando la app corre INSTALADA (`display-mode` standalone/fullscreen/
minimal-ui, o `navigator.standalone` en iOS):
- El equipo es personal automáticamente: no se muestra "Este es un equipo
  compartido" y no se exige la lista del piloto (`VITE_APP_OFFLINE_PILOT`).
  Nadie instala la PWA de su institución en un computador de sala compartida,
  y el docente que la instala lo hace para trabajar sin red.
- El kill-switch manda: con `VITE_APP_OFFLINE=off` (o el flag remoto) la app
  instalada vuelve a las reglas del navegador.
- Guarda todo sola: "Preparar todo el año" al primer ingreso (con progreso
  visible) y después incremental en segundo plano, también apenas vuelve la
  red (D-14). Pide `navigator.storage.persist()` sin esperar a "Preparar".
- "Cerrar sesión" NO borra lo guardado: un docente que cierra sesión por error
  sin red perdería meses de datos sin forma de volver a bajarlos. La app queda
  BLOQUEADA: con red se vuelve a entrar con la contraseña (servidor); sin red,
  con la contraseña verificada en el equipo (credencial local PBKDF2-SHA256,
  310 000 iteraciones, nunca la contraseña ni el token,
  `lib/offline/local-credential.ts`) o con el PIN si se creó (`vault.ts`).
- Borrar es una acción aparte, "Borrar los datos de este equipo", con aviso
  fuerte; con cambios sin sincronizar exige una segunda confirmación (y ofrece
  sincronizar primero). Borra lo del usuario: datos, cola, PIN, credencial
  local y archivos guardados.
En la pestaña del navegador todo sigue como antes (piloto, checkbox, logout
que borra).

## D-14. Autopreparación en segundo plano (implementado, default revisable)
En un equipo personal, con red estable, la app visible, sin sincronización en
curso, con la bóveda abierta y el almacenamiento por debajo del 80 %, se
vuelve a correr "Preparar todo el año" solo: al entrar (a los 5 s), cada 4 h
mientras la app está abierta y, en la app instalada, al volver la red si lo
último tiene más de 30 min. Es incremental (lo bajado hace < 2 h no se vuelve a
pedir; las listas sí, para descubrir lo nuevo) y cede el hilo entre tareas.
Una sola corrida a la vez para el equipo (el diálogo muestra la automática si
está en curso). El header muestra "Datos guardados: hace X" (verde < 7 días,
amarillo < 30, rojo después) o "Guardando datos… N %"; la primera corrida
muestra además un aviso con el progreso. Se apaga por equipo en "Preparar"
("Guardar datos automáticamente") o para todos con
`VITE_APP_OFFLINE_AUTO_PREPARE=off`.
