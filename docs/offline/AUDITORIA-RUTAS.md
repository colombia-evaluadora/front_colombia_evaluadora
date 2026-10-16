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
