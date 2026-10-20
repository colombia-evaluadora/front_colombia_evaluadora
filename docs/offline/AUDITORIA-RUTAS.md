# Auditoría de rutas sin conexión

Fuente de verdad en código: `src/lib/offline/online-only-paths.ts` (lista de
solo en línea + excepciones de solo consulta). Todo lo demás bajo `/app` se
considera apto sin conexión (`isOfflineCapablePath`), y el e2e
`e2e/offline-all-routes.spec.ts` recorre las rutas no administrativas sin red
después de "Preparar" y falla si aparece "Esta sección necesita conexión".

## Causa del bug reportado en testv2

1. **`/app` redirigía al primer ítem del menú** (`getFirstNavUrl`). Para un
   rector/coordinador ese ítem es Cobertura o Establecimiento, ambos solo en
   línea, así que al abrir la app sin red caía directo en el empty state.
   Arreglo: `getLandingNavUrl` salta las rutas solo en línea cuando no hay red;
   si el menú no está en cache, cae a Planeador.
2. **Equipo compartido por defecto**: con el checkbox marcado no se persiste
   nada (ni menú ni datos), así que sin red no había qué mostrar. Arreglo: si
   el piloto abarca a todos (`VITE_APP_OFFLINE_PILOT=*`, como en test), el
   default es "personal" (decisión revisable mientras P6 siga pendiente).
3. **Dos listas desincronizadas**: el banner usaba una lista positiva (solo
   planeador, asistencia, notificaciones, pendientes, referentes) y decía "Esta
   sección necesita conexión" en Informes, Periodos, Comunicaciones y en `/app`.
   Arreglo: el banner deriva de la lista de solo en línea.
4. Ficha del EE y sedes eran solo en línea aunque el rector las consulta a
   diario; sus queries no se persistían. Arreglo: `proveedorMeta` en las
   queries de institución/sedes y excepción de solo consulta.

## Cargas infinitas sin conexión (sin haber preparado)

Reporte de testv2: "solo me aparecía el loading en todo". Sin red, lo que no
estaba guardado en el equipo dejaba la pantalla en skeleton o spinner para
siempre.

**Causa.** Con el `networkMode: "online"` de TanStack Query, una query sin
datos que arranca sin red queda `pending` con `fetchStatus: "paused"` hasta
que vuelva la conexión: la pantalla ve `isPending` y no sale del "cargando".
Las mutaciones pausadas dejaban los botones en "Guardando…". Solo Informes y
la Planilla lo detectaban a mano (`isOfflineWithoutData`), y "Preparar todo el
año" solo refrescaba las listas con filtros propios de cada pantalla si se
habían abierto en esa sesión.

**Arreglo global** (no pantalla por pantalla):

| Capa | Qué hace | Dónde |
|---|---|---|
| `networkMode` híbrido | Por query: **sin datos → `"always"`** (el `queryFn` corre sin red, falla al instante y la query termina en `error`); **con datos → `"online"`** (el refetch se pausa y se sigue viendo lo guardado). El `retry` no reintenta sin red. Las mutaciones van con `"always"`: fallan enseguida en vez de quedar en "Guardando…". | `lib/offline/offline-query-client.ts`, `lib/react-query.ts` |
| Mensaje de error | `getErrorMessage` distingue sin conexión: lectura → "Sin conexión: esta información no está guardada en este equipo. Cuando tengas conexión, usa «Preparar sin conexión»…"; escritura → "Sin conexión: esta acción necesita internet…"; sesión → aviso propio. `ErrorPage` usa los mismos textos. | `lib/api-client.ts`, `lib/offline/offline-messages.ts`, `components/layout/error-page.tsx` |
| Componentes compartidos | `useOfflineStall`: un indicador de carga que sigue visible 1,5 s sin conexión no va a resolverse. `DataTable` muestra el aviso en vez del skeleton o del error genérico; `Skeleton` y `Spinner` se ocultan; `LoadingLabel` reemplaza "spinner + Cargando…" por el aviso; `Select` y `ComboboxField` dicen "estas opciones no están guardadas en este equipo" en vez de abrir vacíos. | `components/data-table.tsx`, `components/ui/{skeleton,spinner,select,combobox}.tsx`, `components/offline/loading-label.tsx` |
| Red de seguridad | El banner offline agrega "Parte de esta pantalla no está guardada en este equipo…" cuando una query observada no tiene datos por falta de red (las accesorias del header se marcan `meta.offlineOptional`). | `lib/offline/missing-data.ts`, `components/layout/offline-banner.tsx` |

**Decisión sobre `networkMode: "offlineFirst"` como default** (evaluado y
descartado): sus reintentos sí se pausan sin red (una query sin datos cuyo
primer intento falla quedaba igual en "cargando"), y corre el `queryFn`
aunque haya datos, así que un refetch sin red (al montar, al invalidar tras
encolar en la outbox, por `refetchInterval`) dejaba la query en `error` con
datos y las pantallas que miran `isError` antes que `data` escondían lo
guardado. El modo híbrido no cambia nada para las queries con datos: la
restauración del persister y la capa optimista de la outbox siguen igual.

**Prueba:** `e2e/offline-sin-preparar.spec.ts` entra con red (sin Preparar),
pasa a modo avión (`navigator.onLine = false` + API caída) y recorre todas las
rutas no administrativas como administrador y las del menú del docente: a los
3 s no puede quedar ningún skeleton, spinner ni "Cargando…", y cada pantalla
muestra lo guardado o un aviso claro (en la pantalla, en el banner o el empty
state "Esta sección necesita conexión").

## Tabla

| Ruta | Sin conexión | Por qué | Arreglo / pendiente |
|---|---|---|---|
| `/app` (índice) | Sí | Redirige al primer ítem apto offline | `getLandingNavUrl` (este PR) |
| `/app/sin-acceso` | Sí | Página estática | — |
| `/app/pendientes` | Sí | Lee el outbox local | — |
| `/app/planeador/actividades` (+ agregar, editar) | Sí | Queries persistidas, escrituras por outbox/sagas | — |
| `/app/planeador/unidades` (+ agregar, editar) | Sí | Ídem | — |
| `/app/planeador/planilla` | Sí | Ídem, calificaciones por outbox | — |
| `/app/planeador/recursos/vista-previa` | Sí | Borrador en sessionStorage; adjuntos solo si se descargaron | — |
| `/app/asistencia`, `/seguimiento`, `/manual` | Sí | Persistida + outbox | — |
| `/app/gestion-academica/informes` (+ planilla) | Solo consulta | Cascada persistida; consolidar/IA/boletín PDF necesitan servidor | Acciones con `useOnlineOnly` |
| `/app/gestion-academica/referentes-curriculares` (+ detalle) | Solo consulta | Persistidos; inactivar revisa impacto en servidor | — |
| `/app/establecimiento-educativo` / `general` / `detalle/$id` | Solo consulta | Queries con `proveedorMeta` (este PR) | Deshabilitar botones de edición con `useOnlineOnly` (follow-up: hoy fallan con error de red) |
| `/app/establecimiento-educativo/sedes` | Solo consulta | Ídem | Ídem |
| `/app/establecimiento-educativo/periodos` (+ editar) | Solo consulta | Proveedores persistidos | — |
| `/app/establecimiento-educativo/periodos/agregar` | No | Alta de periodo: admin, valida contra servidor | Mensaje claro (empty state) |
| `/app/establecimiento-educativo/agregar`, `editar/$id` | No | Alta/edición de EE: admin | Ídem |
| `/app/establecimiento-educativo/funcionarios` | No | Datos personales del personal; admin | Revisable con P6 |
| `/app/comunicaciones/foros` | Solo consulta | Foros/publicaciones persistidos | Publicar sin red: follow-up (outbox) |
| `/app/comunicaciones/chat` | Solo consulta | Conversaciones, mensajes y comunicados persistidos (este PR) | Enviar sin red: follow-up (outbox) |
| `/app/notificaciones` | Solo consulta | Persistidas | — |
| `/app/notificaciones/preferencias` | Solo consulta | Persistidas (este PR); cambiar requiere red | — |
| `/app/cobertura/*` (reserva, pre-matrícula, inscritos, matrícula, configuración) | No | Datos personales de menores (documento, acudiente, salud) y procesos administrativos; P6 pendiente | Revisable con P6 |
| `/app/registro-de-actividad/*` | No | Auditoría en ClickHouse, solo admin | — |
| `/app/administracion/roles-menus`, `listas-valor`, `areas-oficiales`, `parametros-edad` | No (`listas-valor`/`parametros-edad` sin datos guardados) | Admin | — |
| `/verificar/b/$codigo` | No | Verificación pública de boletines contra servidor | — |
| Rutas `_auth` (`/login`, recuperación, activación) | Login sin red solo con sesión offline guardada | — | — |

Los menús que puede devolver `/eval-col/my-menus` apuntan a estas mismas rutas
(los grupos heredan la URL de su primer hijo).
