# Plan de implementación: Colombia Evaluadora sin conexión (offline)

> Estado: **propuesta para revisión**. Nada de lo descrito está implementado. Documento vivo: cada fase cierra con una actualización de este archivo.
> Alcance: front `front_colombia_evaluadora` (React 19 + TanStack Query/Router + Vite 8 + Cloudflare Worker). Se listan los cambios de backend necesarios, con la marca de si **tocan esquema** (requieren aprobación explícita, ver memoria del equipo: no se agregan columnas/tablas en `sso` sin OK).

> Base de código revisada: `origin/dev` @ `66e4d118` (las citas `archivo:línea` son de ese commit; el checkout local de `test` está atrasado).

## Tabla de contenido

0. [Decisiones tomadas](#0-decisiones-tomadas)
1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Diagnóstico del código actual (bloqueadores con evidencia)](#2-diagnóstico-del-código-actual)
3. [Principios y decisiones de arquitectura (razonadas)](#3-principios-y-decisiones-de-arquitectura)
4. [Componentes técnicos](#4-componentes-técnicos)
5. [Dónde se guardan los datos (IndexedDB)](#5-dónde-se-guardan-los-datos)
6. [Cómo se sube lo pendiente al volver la conexión](#6-sincronización)
7. [Cómo se le informa al usuario (UX y textos exactos)](#7-ux-y-textos)
8. [Plan por vista (todas las rutas de `router.tsx`)](#8-plan-por-vista)
9. [Casos borde (exhaustivo)](#9-casos-borde)
10. [Cambios de backend](#10-cambios-de-backend)
11. [Fases, tareas, criterios de aceptación, estimación y kill-switch](#11-fases)
12. [Plan de pruebas](#12-plan-de-pruebas)
13. [Métricas y observabilidad](#13-métricas)
14. [Preguntas abiertas / decisiones para el usuario](#14-preguntas-abiertas)
15. [Bugs encontrados de paso](#15-bugs-encontrados-de-paso)

Subsecciones de §8: [8.1 Públicas](#81-rutas-públicas) · [8.2 `/app` y sin-acceso](#82-app-layout-app-index-y-appsin-acceso) · [8.3 Cobertura](#83-cobertura-featurescoverage--so) · [8.4 Auditoría](#84-registro-de-actividad-auditoría--so) · [8.5 Roles/menús](#85-administración-administracionroles-menus--so) · [8.6 Establecimiento y periodos](#86-establecimiento-educativo--so-lectura-parcial-como-proveedor) · [8.7 Gestión académica](#87-gestión-académica) · [8.8 Planeador](#88-planeador-featuresplaneador) · [8.9 Asistencia](#89-asistencia-featuresacademic-managementasistencia--piloto-fase-2) · [8.10 Pendientes](#810-nueva-ruta-apppendientes) · [8.11 Matriz](#811-matriz-resumen)

---

## 0. Decisiones tomadas

| # | Decisión | Estado | Efecto en el plan |
|---|---|---|---|
| 0.1 | **Cambios de esquema aprobados para este plan**: columna de versión/`updated_at` para concurrencia optimista (BE-3 **opción B**) e **índice único en asistencia** (BE-5). | Aprobado | D6 pasa a usar `VERSION`/`UPDATED_AT` en actividad y unidad (fase 3–4) y conserva el CAS por valor (BE-2) para planilla. BE-5 entra en fase 2. **Cada cambio va en su propio PR del repo `sso`, ajustando la migración Flyway que posee el objeto (sin migraciones duplicadas), y se revisa antes de mergear.** La aprobación cubre solo esos dos objetos; cualquier otra columna o tabla vuelve a requerir OK explícito. |
| 0.2 | **Tiempo máximo escribiendo sin conexión sin reautenticar: 14 días** desde `session.lastOnlineAuthAt`. | Aprobado | Al vencer, la outbox deja de **aceptar** ops nuevas (las que ya están se conservan y se envían al reconectar). Copy: **"Llevas 14 días sin conectarte. Conéctate para seguir registrando sin conexión; lo que ya guardaste está a salvo."** A los 12 días, chip de aviso: **"Conéctate antes del {fecha} para seguir trabajando sin conexión."** La lectura sigue los TTL de §8. |
| 0.3 | **Política institucional sobre datos de menores en equipos personales.** | **PENDIENTE — bloqueador** | Mientras no se resuelva: (a) la escritura offline se habilita **solo para el piloto** (3–5 docentes con consentimiento explícito, feature flag por usuario); (b) el modo por defecto para todos los demás es el **más conservador**: `deviceMode = "compartido"` (no se persisten queries ni outbox más allá de la pestaña), y el modo personal solo se ofrece a usuarios del piloto; (c) en el piloto se persiste lo mínimo (nombre + pk del estudiante, §9 C-72), y los borradores de matrícula no guardan documentos. Habilitar escrituras offline fuera del piloto **requiere** cerrar P6. |
| 0.4 | **Tamaño máximo de archivo offline: 10 MB por archivo**, nunca mayor que el límite online de la superficie. | Decidido aquí (justificación abajo) | Reemplaza el "25 MB a confirmar" anterior. |

**Justificación de 0.4.** Límites existentes:

| Superficie | Límite | Fuente |
|---|---|---|
| Imágenes (escudo, foto) | 2 MB | `src/lib/image-file.ts:20` |
| Soporte de asistencia | 10 MB | `asistencia/components/columns-asistencia-manual.tsx:175`, `dialog-editar-seguimiento.tsx:226` |
| Evidencia de observación (planilla) | 10 MB, máx. 3 | `planeador/lib/observacion.ts:9,12` |
| Adaptaciones de actividad | 10 MB, máx. 3 | `form-editar-actividad.tsx:5686` |
| Recursos de actividad | 20 MB | `form-editar-actividad.tsx:2255` |
| Documentos de matrícula / cambios masivos | 25 MB | `form-create-matricula.tsx:1431`, diálogos de cambio de sede/grado |
| PIGSE documentos | 25 MB | `front_pigse/.../dialog-upload-document-category.tsx:59` |
| file-service | 25 MB por archivo, **30 MB por request** | `sso/file-service/src/main/resources/application.yml:25-26` |

- Todas las superficies que entran en el alcance offline (asistencia, planilla, adaptaciones) ya están en 10 MB. Solo los recursos de actividad (20 MB) superan ese tope, y matrícula es SO.
- La subida no es reanudable (§6.8) y el timeout multipart es de 120 s. 10 MB en 120 s exige unos 0,7 Mbps sostenidos, lo esperable en el 3G y Wi-Fi escolar que motivan el offline. 20 MB necesitaría unos 1,4 Mbps, y en redes inestables reintentaría completo una y otra vez.
- Por eso: **regla `min(límite de la superficie, 10 MB)`**. Un recurso de 10 a 20 MB se acepta solo online: **"Este archivo pesa más de 10 MB: adjúntalo cuando tengas conexión."**
- Cada **request** multipart que arma la outbox suma como máximo **25 MB**. Así queda margen bajo los 30 MB del file-service, y los recursos se suben uno por request.

**Cuotas de la cola de blobs por usuario** (reemplazan los 200 MB de §5.3):
- **150 MB** en total y **60 archivos** pendientes como máximo.
- Aviso al 80 % (120 MB o 48 archivos): **"Tienes muchos archivos esperando para subirse. Conéctate pronto para no quedarte sin espacio."**
- Al tope, el adjunto se rechaza: **"Ya no hay espacio para más archivos sin conexión en este equipo. Sincroniza o adjunta este archivo cuando tengas conexión."**
- Además, máximo 3 archivos por op, igual que los topes de observación y adaptación existentes.
- Estos 150 MB se cuentan dentro del presupuesto de origen de §5.3. Si `navigator.storage.estimate()` reporta menos de 500 MB de cuota total, el tope baja a `min(150 MB, 30 % de la cuota)`.

---

**Decisiones tomadas por defecto (revisables) para la Fase 2** — P15–P20 sin respuesta; detalle en `openspec/changes/add-offline-writes-asistencia-planilla/design.md`:

- Conflictos (P15): detección por celda/estudiante con versión del servidor (`updated_at` → `BASE_VERSION`); el servidor gana (409 `OFFLINE_CONFLICT` con valor actual) y el docente resuelve en la UI ("Conservar el mío" / "Usar el del servidor" / "Editar").
- TTL de la outbox = ventana de 14 días de la sesión offline (§0.2).
- Periodo cerrado al sincronizar: 422 `PERIODO_CERRADO` → op `rejected` visible con el motivo; si el backend genera solicitud (regla 55/75), `done` con aviso. Nada se pierde en silencio.
- Reenvío idempotente con `Idempotency-Key` (BE-1) y FIFO por entidad.
- La outbox se borra solo tras sync exitosa o descarte explícito; el logout con pendientes avisa (§7.8).
- **Online-first** (desvío aprobado de §6.1.3): con red la mutación va directo con su `Idempotency-Key`; se encola con la misma clave solo si falla por red, si no hay red o si hay pendientes de la misma entidad.
- Escritura offline solo con modo `full`, equipo personal (piloto) y sesión ≤ 14 días.
- P16: índice con `COALESCE(bloque,0)` + detección de duplicados; P17: "Marcar todos" sin optimista; P18–P20: propuesta del plan.

---
## 1. Resumen ejecutivo

- **Objetivo realista**: que un docente pueda, sin red o con red intermitente, **consultar** lo que ya preparó (planeador, unidades, planilla, asistencia, referentes) y **registrar** lo que hace en el aula (asistencia, calificaciones de planilla, observaciones, estado de resultado y, en una fase posterior, crear/editar actividades), y que todo eso se suba solo cuando vuelva la conexión, sin duplicados y con conflictos visibles.
- **No objetivo**: la administración (roles/menús, funcionarios, sedes, establecimiento, periodos), matrícula/cupos, consolidación de informes, boletines PDF, IA, auditoría y aprobaciones. Esas vistas quedan **solo en línea**, con estados deshabilitados y textos claros.
- **Arquitectura**: app shell con Service Worker (`vite-plugin-pwa`, sin cache de `/api`), cache de lecturas = **TanStack Query persistido en IndexedDB por usuario** (opt-in por query con `meta.offline`), escrituras = **outbox propia en IndexedDB** con handlers tipados, orden FIFO por entidad + dependencias, ids temporales, clave de idempotencia, backoff y un único procesador entre pestañas (Web Locks + BroadcastChannel). La sincronización corre **en la página** (el JWT vive solo en memoria), el Background Sync solo "despierta".
- **Fase 0 (resiliencia) aporta valor aunque nunca se haga lo demás**: hoy una caída de red de 2 s en una recarga **expulsa al usuario al login** y una falla de red en un 403 **borra toda la cache y redirige**.
- **Decisiones vigentes (§0)**:
  - Esquema BE-3B/BE-5 aprobado, en PRs separados.
  - 14 días de escritura offline sin reautenticar.
  - 10 MB por archivo offline y 150 MB / 60 archivos por usuario.
  - **Política de menores pendiente**: la escritura offline queda limitada al piloto y el modo por defecto es "equipo compartido".
- **Estimación total**: ~13–17 semanas-persona de front + ~2–3 semanas de backend (idempotencia en gateway, compare-and-set), en 5 fases con kill-switch por feature.

---

## 2. Diagnóstico del código actual

| # | Bloqueador | Evidencia | Efecto offline |
|---|---|---|---|
| B1 | `getUser()` captura **cualquier** error y devuelve `null` | `src/lib/auth.ts:20` | Un error de red en `/auth/refresh` = "sin sesión". |
| B2 | `hasSession()` usa ese `null` en `beforeLoad` de `/app`; además el guard de menú hace `ensureQueryData(navItemsQueryOptions)` y un fallo sube al `ErrorPage` | `src/lib/auth.ts:112`, `router.tsx:380-398` | Recargar sin red → `redirect /login`; con sesión offline resuelta, el guard de menú igual rompe si `my-menus` no está hidratado antes (§8.2). |
| B3 | 403 → `POST /auth/refresh`; si el refresh **falla por red** se marca `isExpiredSession = true` | `src/lib/api-client.ts:287-293` (401 en `:252-263`) | Red caída durante un 403 → `queryClient.clear()` + `window.location.href = /login` (`:309-314`). Pérdida total de cache. |
| B4 | Toast global por cada error de axios (incl. `Network Error`) | `api-client.ts:305` | Con red caída, ráfaga de toasts (aunque `AXIOS_GENERICO` en `:392` reemplaza el texto, sigue siendo uno por request). |
| B5 | `retry: false`, `staleTime: 60s`, sin `networkMode` | `src/lib/react-query.ts:3-9` | Queries fallan al primer intento; TanStack por defecto (`networkMode: "online"`) pausa, pero `retry:false` + refetch on mount producen estados de error. **Actualización 2026-10:** la pausa de las queries SIN datos dejaba las pantallas cargando para siempre sin red; se resolvió con el `networkMode` híbrido de §11 ("Cargas infinitas sin conexión"). |
| B6 | Sin timeout en axios | `api-client.ts` (no hay `timeout`) | En "lie-fi"/portal cautivo los requests cuelgan indefinidamente; botones "Guardando…" eternos. |
| B7 | Sin persistencia de cache ni Service Worker | `src/provider.tsx`, `vite.config.ts` (plugins: react, babel, storybook) | Recargar sin red = pantalla en blanco (no hay HTML/JS). |
| B8 | Sagas orquestadas en componentes | `planeador-crear-actividad-page.tsx:143-179` (create → materiales → instrumento → adaptaciones → criterios `allSettled`), `planeador-editar-actividad-page.tsx:255-366` (unlink/link → update → materiales → instrumento → estudiantes → adaptaciones), `coverage/api/mutations/create-matricula.ts:111-180` (8 pasos, crea cuentas, sin compensación), `institution/pages/add-establishment-page.tsx:521-674` (con compensación parcial) | Si el navegador se cierra a mitad, no hay registro de qué pasos faltan. No se pueden encolar como una sola operación sin moverlos a un handler. |
| B9 | Archivos dentro de mutaciones | `asistencia/.../use-asistencia-registrar-mutation.ts:17-37` (`subirSoporte` + `Promise.all`), `planeador/.../use-observacion-soporte.ts:37` (`postMultipart`), materiales/adaptaciones de actividad | Un `File` no se puede serializar a JSON: hay que guardar el Blob aparte y subirlo antes del registro. |
| B10 | Estado calculado en servidor | Regla 75 → `solicitudes_pendientes` (`use-asistencia-registrar-mutation.ts:41-56`), `calificacion` devuelta por `/calificar` (`use-calificar-celda.ts:68-83`), nota definitiva/proyectada de planilla | Offline solo se puede mostrar "pendiente de cálculo"; nunca inventar la nota. |
| B11 | Fan-out con `Promise.all` en el llamador | `use-asistencia-editar-mutation.ts:27-39` (un PATCH por pk), `asistencia-manual-page.tsx:458-484` (registrar + editar juntos), `calificar-actividad-bulk.tsx:238` (bulk), `asistencia-page.tsx:186-222` (marcar todos por bloque) | Fallo parcial = no se sabe cuáles entraron. En la outbox cada llamada es una operación. (Las aprobaciones de asistencia **no** son fan-out: es un único `*-masivo` que devuelve `{resueltas, fallidas}`.) |
| B12 | MSW registra un SW en `/` en el entorno `dev` | `src/main.tsx:7-22` | Conflicto de scope con un SW de PWA: en `dev` (vitrina con mocks) **no** se registra el SW de PWA. |
| B13 | Invalidaciones del planeador | **Corregido en `dev`**: create/update/delete de actividad usan `invalidarListadosActividades` (`delete-actividad.ts:37`, `create-actividad.ts:183`, `update-actividad.ts:163`). Quedan huecos (§15: tabs de unidades, `actividad.calificaciones(id)` tras calificar/observar). | Tras sincronizar, partes de la UI no se refrescan: los huecos de §15 se corrigen en Fase 0. |
| B14 | Mensajes de éxito con `notify()` en el llamador y `NoticeProvider` suprime el toast global | CLAUDE.md §7 "Avisos" | La UI de "guardado en cola" se debe integrar al mismo `notify` (no un sistema paralelo). |
| B15 | Ninguna mutación del planeador tiene `onMutate`/`setQueryData` | `features/planeador/api/mutations/*` | No hay capa optimista que reutilizar: la de la outbox se pinta encima en el render. |
| B16 | Colas locales en memoria que ya existen | `planeador/hooks/use-solicitud-periodo-cerrado.ts:23` (Map de cambios con periodo cerrado), `asistencia-manual-page.tsx` (estado sin autoguardado), borrador de actividad en `sessionStorage` (`actividad-form-draft.ts:12`) | Se pierden al recargar; la outbox/`drafts` las reemplaza. |

---

## 3. Principios y decisiones de arquitectura

Cada decisión con la alternativa descartada y el porqué.

### D1. Offline por **lista blanca**, no "todo offline"
- **Decisión**: una query se persiste solo si declara `meta: { offline: { ttl, scope } }`; una mutación solo se encola si tiene un handler registrado en la outbox (`kind`).
- **Por qué**: la app tiene ~105 queries con `staleTime` propios y decenas de mutaciones con reglas de negocio del servidor (PL/pgSQL `RAISE`). Persistir todo llenaría la cuota con catálogos de administración y expondría datos sensibles (funcionarios, matrícula de menores) sin necesidad. Encolar todo produciría conflictos irresolubles (p. ej. eliminar en cascada un periodo).

### D2. Lecturas: **persister de TanStack Query** (no cache del SW sobre `/api`)
- **Descartado**: Workbox `NetworkFirst` sobre `/api/*`. Casi todas las lecturas son **POST** (`evalCol.postRows`, `api.query`) y la Cache API no cachea POST; además la clave sería la URL y no el body; y la cache del SW no es por usuario.
- **Elegido**: `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` (o persister propio sobre `idb`) con `dehydrateOptions.shouldDehydrateQuery = q => q.meta?.offline && q.state.status === "success"`, `buster = "${userSub}:${SCHEMA_VERSION}"`, `maxAge` = el mayor `ttl`.

### D3. Escrituras: **outbox propia**, no mutaciones pausadas de TanStack
- **Descartado**: `networkMode: "offlineFirst"` + `persistQueryClient` con `resumePausedMutations`. Problemas: (a) requiere `setMutationDefaults` con `mutationFn` por key y no soporta Blobs; (b) no tiene orden por entidad ni dependencias; (c) no permite remapear ids temporales; (d) reanuda en cada pestaña (duplicados); (e) no hay UI de pendientes/descartar.
- **Elegido**: tabla `outbox` en IndexedDB, cada operación con `kind` (handler registrado), `entityKey`, `dependsOn[]`, `idempotencyKey`, `attempts`, `status`.

### D4. La sincronización corre **en la página**
- El access token está **solo en memoria** (`setAuthToken`, `api-client.ts`) y el refresh es cookie httpOnly `SameSite=Strict`. Un SW podría llamar `/auth/refresh` (misma origen, cookie incluida), pero duplicaría la lógica de auth y el manejo de 401/403. Se elige: SW solo como app shell + `sync` event que hace `clients.postMessage("outbox:wake")`; si no hay cliente abierto, no se sube nada hasta que el usuario abra la app (aceptado, ver §14 P3).

### D5. Idempotencia en el **gateway** (sin esquema)
- Header `Idempotency-Key: <uuid v4>` por operación (y por paso de saga). El gateway guarda `(sub, key) → status+body` en Redis 72 h. Resuelve "el request llegó pero la respuesta se perdió" sin tocar tablas.

### D6. Conflictos: CAS por valor en celdas + **columna de versión** en entidades (aprobado, §0.1)
- **Planilla** (celdas, observación, estado): el cliente manda el valor que vio (`BASE: <json anterior>`). La función SQL compara y, si difiere, devuelve `409` con el valor actual. No toca esquema (BE-2).
- **Actividad y unidad**: columna `VERSION` o `UPDATED_AT` (BE-3 opción B, **aprobada**). El PUT manda la versión leída y el servidor responde `409` si no coincide.
  - Así se cubren los PUT de reemplazo total (materiales, adaptaciones, `ENUNCIADOS`, `EVIDENCIAS`/`CRITERIOS`), donde un CAS por valor sería enorme.
  - Los sub-PUT de la saga mandan la versión que devolvió el paso anterior: se encadena dentro del handler.
- **Asistencia**: índice único por (estudiante, grupo, contexto, fecha, bloque) más CAS por estudiante en `registrar` (BE-5, **aprobado**). Hoy `registrar` es un upsert de last-write-wins silencioso (`asistencia-manual-page.tsx:432-434`).
- Implementación: PRs separados en `sso`, revisados antes del merge (§0.1).

### D7. Modo "autenticado sin conexión"
- Si la app tiene un usuario persistido (claims no sensibles: `sub`, `name`, `roles`, menú) y no hay red, se entra en **modo lectura+cola** sin token. Se reautentica al volver la red; si el refresh devuelve 401 se pide login **sin borrar la outbox** (queda asociada al `sub`).

### D8. Una sola fuente de verdad de conectividad
- `connectivityStore` con estados `online | degraded | offline` alimentado por `navigator.onLine`, eventos, resultados reales de axios (timeouts/errores de red) y un **heartbeat** `GET /api/health` (o `HEAD /api/auth/...` si no existe health; ver §10 BE-4). `navigator.onLine === true` **no** implica red (portal cautivo).

### D9. Nunca inventar estado del servidor
- Notas proyectadas/definitivas, regla 75, alertas de inasistencia: offline se muestra el último valor conocido con la marca "pendiente de recalcular". El valor que el docente escribió sí se muestra (optimista), con badge.

---

## 4. Componentes técnicos

Ubicación propuesta: `src/lib/offline/` (infra) + `src/features/offline/` (UI: página de pendientes, banner, indicador).

| Módulo | Archivo | Responsabilidad |
|---|---|---|
| Conectividad | `lib/offline/connectivity.ts` | Estado `online/degraded/offline`, heartbeat (cada 30 s online, 10 s degraded, backoff hasta 60 s offline), hook `useConnectivity()`. Degradado = 2+ timeouts/errores de red en 60 s o latencia del heartbeat > 4 s. |
| Cliente HTTP | `lib/api-client.ts` (cambios) | `timeout: 20000` (multipart 120000); clasificar `isNetworkError(error)` (sin `response`, `ECONNABORTED`, `ERR_NETWORK`); **no** toast ni sesión vencida por errores de red; reportar a `connectivity`. |
| Auth offline | `lib/auth.ts` (cambios) | `getUser()` distingue 401 (sin sesión) de red (→ `OfflineUser` desde IndexedDB `session` o `throw`). `hasSession` acepta usuario offline. |
| DB | `lib/offline/db.ts` | Apertura de `ce-offline` con `idb`, migraciones por versión. |
| Persister | `lib/offline/query-persister.ts` | Persistencia selectiva por usuario, throttle 1 s, tamaño máximo por entrada. |
| Outbox | `lib/offline/outbox/*.ts` | `enqueue`, `processor`, `handlers/<kind>.ts`, `idmap.ts`, `blobs.ts`, `backoff.ts`. |
| Coordinación | `lib/offline/leader.ts` | `navigator.locks.request("ce-outbox", …)` + `BroadcastChannel("ce-offline")` (fallback: lock en IndexedDB con lease de 15 s). |
| Hooks UI | `lib/offline/hooks.ts` | `useOnlineOnly()`, `usePendingFor(entityKey)`, `useOutboxSummary()`, `useOfflineMutation(kind)`. |
| SW | `vite-plugin-pwa` (`injectManifest`, `src/sw.ts`) | Precache de `dist/` (shell + chunks lazy), `navigateFallback: /index.html` excepto `/api`, `sync` → wake, kill-switch. |
| UI | `features/offline/*` | `OfflineBanner`, `HeaderSyncIndicator`, `PendientesPage`, `PrepararSinConexionDialog`, `PendingBadge`, `NuevaVersionToast`. |
| Logs | `lib/offline/log.ts` | Ring buffer 500 eventos en IndexedDB, exportable. |

### 4.1 Contrato de un handler de outbox

```ts
// lib/offline/outbox/types.ts
export type OutboxKind =
  | "asistencia.registrar" | "asistencia.editar"
  | "planilla.calificar" | "planilla.estado-resultado" | "planilla.observacion"
  | "planilla.soporte" | "planilla.soporte-quitar" | "planilla.soporte-favorito"
  | "planilla.calificar-bulk" | "actividad.asistencia" | "actividad.estado-resultado"
  | "asistencia.marcar-todos"
  | "actividad.crear" | "actividad.editar" /* fase 3 */ // …

export interface OutboxHandler<P> {
  kind: OutboxKind
  version: number                     // versión del payload; migrar o descartar si cambia
  entityKey: (p: P) => string         // "planilla:act-est:123", "asistencia:sesion:..." 
  coalesce?: (prev: P, next: P) => P | null  // null = no fusionar
  send: (p: P, ctx: SendCtx) => Promise<unknown>  // usa api/evalCol con Idempotency-Key
  classify: (error: unknown) => "retry" | "auth" | "conflict" | "rejected" | "fatal"
  onSuccess: (p: P, res: unknown, ctx) => void    // invalidaciones + idmap
  applyOptimistic?: (qc: QueryClient, p: P) => void  // re-aplicable tras recarga
  describe: (p: P) => { titulo: string; detalle: string; ruta?: string } // para /app/pendientes
}
```

`applyOptimistic` se **reaplica** sobre los datos hidratados en cada arranque (los datos persistidos son los del servidor; la capa optimista se superpone desde la outbox, así un descarte revierte limpio).

---

## 5. Dónde se guardan los datos

### 5.1 Base de datos

Una sola base `ce-offline` (versión de esquema `1`), con todas las filas particionadas por `userSub` (el `sub` del JWT = email). Razón de **una** base vs una por usuario: borrar por índice es atómico y permite detectar "hay pendientes de otro usuario" al iniciar sesión; una base por usuario dificulta listar/limpiar huérfanas.

| Store | keyPath | Índices | Campos | Notas |
|---|---|---|---|---|
| `meta` | `key` | — | `{ key, value }` | `schemaVersion`, `appBuild`, `lastUserSub`, `deviceMode` ("personal"/"compartido"), `killSwitch`. |
| `session` | `userSub` | — | `{ userSub, name, roles[], isSuperAdmin, menuSnapshot, permisos: Record<codigo, flags>, savedAt, lastOnlineAuthAt }` | **Nunca** el token ni la cookie. Solo lo necesario para pintar sidebar y decidir permisos offline. |
| `queries` | `[userSub, hash]` | `byUser`, `byUpdatedAt` | `{ userSub, hash, queryKey, state (dehydrated), scope, ttlUntil, size, updatedAt }` | Una fila por query (no un blob gigante) → escrituras incrementales y evicción granular. |
| `outbox` | `id` (uuid) | `byUser`, `byUserStatus [userSub,status]`, `byEntity [userSub,entityKey,seq]`, `byCreatedAt` | `{ id, seq (autoincrement lógico), userSub, kind, handlerVersion, entityKey, dependsOn[], payload, blobRefs[], idempotencyKey, status: "pending"|"inflight"|"waiting-dep"|"retry"|"conflict"|"rejected"|"done", attempts, nextAttemptAt, lastError{code,status,message}, conflict{server,local}, createdAt, updatedAt, appBuild }` | `done` se purga a las 24 h (se guarda solo para "Sincronizado hace…"). |
| `blobs` | `id` | `byUser`, `byOp` | `{ id, userSub, opId, name, type, size, blob, sha256, uploadedArchivoId? }` | El `File` se copia a Blob al encolar (si el usuario borra el archivo del disco, sigue disponible). |
| `idmap` | `[userSub, tempId]` | — | `{ tempId: "tmp:<uuid>", realId, entity, resolvedAt }` | Para remapear ids temporales en payloads dependientes. |
| `log` | autoincrement | `byUser`, `byAt` | `{ at, userSub, level, event, opId?, data }` | Ring buffer 500 (se poda en cada inserción por lote). |
| `drafts` | `[userSub, formKey]` | — | `{ formKey, values, savedAt }` | Borradores de formularios grandes (actividad/unidad) — generaliza `planeador/lib/actividad-form-draft.ts` (hoy sessionStorage). |

### 5.2 Qué **nunca** se guarda
- Access token / JWT completo, cookie `sso_refresh`, contraseñas, `mock-*` tokens.
- URLs de vista de archivos (`fetchArchivoViewUrl`, token de 5 min): se persiste el **id** del archivo, no la URL.
- Respuestas de `/audit-cval`, `/sso-admin`, funcionarios (datos personales de adultos con documento), matrícula (datos de menores + acudientes), reportes/blobs PDF, respuestas de IA.
- Respuestas de error.

### 5.3 Cuotas y evicción
- Al iniciar: `navigator.storage.estimate()`; si `quota - usage < 50 MB` → aviso "almacenamiento casi lleno". Pedir `navigator.storage.persist()` en "Preparar para usar sin conexión" (Chrome concede si el sitio está instalado/engagement; Safari ignora).
- Presupuestos: `queries` ≤ 50 MB por usuario (LRU por `updatedAt`, primero se expulsan `scope:"catalogo"` vencidos, nunca queries que tengan operaciones pendientes asociadas); entrada individual ≤ 2 MB (si excede, no se persiste y se loguea); `blobs` ≤ **150 MB y 60 archivos** por usuario, archivo individual ≤ **`min(límite de la superficie, 10 MB)`**, ≤ 3 archivos por op, ≤ 25 MB por request multipart (decisión §0.4) → si excede: **"Este archivo pesa más de 10 MB: adjúntalo cuando tengas conexión."**
- `QuotaExceededError` al escribir la outbox: la operación **no** se acepta y el usuario lo ve (nunca perder silenciosamente). Ver §9 C-AL-6.

### 5.4 Cifrado y modo equipo compartido
- **Decisión propuesta**: **no** cifrar en reposo en v1. Razón: la clave tendría que vivir en el mismo navegador (no hay secreto derivable sin pedir contraseña offline); cifrar con una clave también guardada en IndexedDB no protege contra quien tenga el perfil del navegador. La protección real es **no guardar** datos sensibles (§5.2), limpiar al cerrar sesión y el **modo equipo compartido**.
- **Modo equipo compartido** (checkbox en login: "Este es un equipo compartido"). **Por defecto marcado** mientras P6 esté pendiente (§0.3); solo los usuarios del piloto pueden desmarcarlo, y al hacerlo ven: **"Al desmarcar, este equipo guardará nombres de tus estudiantes y tus registros sin conexión. Úsalo solo en un equipo personal."**: no se persisten queries, no se habilita offline, la outbox solo vive mientras la pestaña esté abierta (si hay pendientes al cerrar sesión, se bloquea el cierre con el diálogo de §7.8).
- Alternativa (si el colegio lo exige, pregunta §14 P5): cifrado AES-GCM con clave derivada de un **PIN offline** (PBKDF2, 310k iteraciones) que el docente define en "Preparar para usar sin conexión".

### 5.5 Limpieza
| Evento | Acción |
|---|---|
| Logout normal sin pendientes | Borrar `queries`, `session`, `drafts`, `blobs`, `idmap`, `log` del `sub`; `queryClient.clear()` (ya existe). |
| Logout con pendientes | Diálogo §7.8: "Sincronizar y salir" / "Salir y conservar en este equipo" / "Descartar y salir". |
| Login de **otro** usuario | Las filas del usuario anterior **no** se leen. Si tienen pendientes: aviso al nuevo usuario ("Hay cambios sin sincronizar de otra cuenta en este equipo") **sin** mostrar contenido; se conservan 30 días y luego se borran. Si no tienen pendientes: borrado inmediato. |
| `buster` cambia (nuevo `SCHEMA_VERSION`) | Se descartan `queries`; la outbox **no** (se migra con `handlerVersion`). |
| Sesión inválida confirmada (401 en refresh con red) | Conservar outbox, borrar `queries` y `session` si el próximo login es de otro `sub`. |

---

## 6. Sincronización

### 6.1 Disparadores
1. Evento `online` + heartbeat OK (nunca solo `online`).
2. Transición `degraded → online`.
3. `enqueue()` de una nueva operación con estado online (envío inmediato; la outbox es también el camino online → un solo código).
4. `visibilitychange` a visible.
5. Mensaje `outbox:wake` del SW (Background Sync en Chromium).
6. Botón "Sincronizar ahora".
7. Temporizador por `nextAttemptAt` mínimo.

### 6.2 Flujo
```
adquirir lock "ce-outbox" (si no, salir: otra pestaña procesa)
 → heartbeat OK?            no → estado offline, liberar
 → asegurar token: si no hay token o exp < 60 s → POST /auth/refresh
      401 → estado "requiere login" (banner), pausar, conservar outbox
      red → offline, liberar
 → verificar identidad: claims.sub === op.userSub (si no → pausar ops ajenas)
 → seleccionar ops listas: status ∈ {pending, retry} ∧ nextAttemptAt ≤ now
      ∧ es la cabeza de su entityKey ∧ dependsOn todos "done"
 → por cada op (concurrencia 3 entre entityKeys distintas, 1 dentro de la misma):
      reescribir tempIds con idmap
      subir blobs pendientes de la op (secuencial), guardar uploadedArchivoId
      send(payload, { idempotencyKey })
      éxito → done, idmap, onSuccess (invalidaciones), BroadcastChannel "op:done"
      classify(error):
        retry    → attempts++, backoff
        auth     → refresh 1 vez y reintentar; si falla, pausar todo
        conflict → status conflict, guardar {server, local}, notificar
        rejected → status rejected (regla de negocio), notificar; dependientes → "bloqueada"
        fatal    → rejected + log
 → al terminar el lote: invalidar keys agregadas una vez (dedupe), toast resumen
```

### 6.3 Backoff
`delay = min(5 min, 2s · 2^attempts) · random(0.8..1.2)` → 2 s, 4 s, 8 s, 16 s, 32 s, 64 s, 128 s, 256 s, 5 min… Sin máximo de intentos para errores de red; **máximo 8** para 5xx (luego `rejected` con "El servidor no pudo procesar este cambio"). 429 respeta `Retry-After`.

### 6.4 Clasificación de errores
| Respuesta | Clase |
|---|---|
| Sin `response`, timeout, 502/503/504, 520-524 (Cloudflare) | retry (y alimenta conectividad) |
| 401 | auth |
| 403 | refresh + reintento una vez → si persiste: `rejected` "Ya no tienes permiso para este cambio" |
| 409 | conflict (CAS) o, para Idempotency-Key reusada con otro body, fatal |
| 400/422 con mensaje PL/pgSQL (`RAISE`) | rejected, mostrar `cleanErrorMessage` |
| 404 en entidad referida | rejected "El registro ya no existe en el servidor" |
| 500 | retry hasta 8 |

### 6.5 Orden y dependencias
- **FIFO por `entityKey`**: dos ediciones de la misma celda se aplican en orden (o se fusionan, §6.7).
- **DAG por `dependsOn`**: se copia el orden **real** de cada página (§8.8), no el de CLAUDE.md. Crear: actividad (`tmp:A`) → materiales → instrumento → adaptaciones → criterios. Editar: unlink/link → PUT actividad (con evidencias y criterios) → materiales → instrumento → estudiantes → adaptaciones. Cada paso es una op con `dependsOn: [opAnterior]` (cadena, no estrella: el instrumento necesita el `FK_TLV_INSTRUMENTO_EVALUACION` que fijó el PUT o POST) y `entityKey = actividad:<id|tmp>`. Los criterios de crear son independientes entre sí (hoy `allSettled`): son ops hermanas que dependen solo de la creación.
- Si una op queda `rejected`, sus dependientes pasan a `bloqueada` (visible en pendientes con "Depende de un cambio que falló").

### 6.6 Ids temporales
- Al crear offline: `id = "tmp:" + uuid`. La UI lo muestra en listas (optimista) y rutas (`/planeador/actividades/tmp:…/editar` funciona solo localmente).
- Al confirmar: `idmap.put(tmp → real)`; el procesador reescribe payloads de dependientes **al enviar** (no al encolar); `BroadcastChannel` notifica a la UI que haga `navigate({ replace: true })` si está en una ruta con el tmp id.
- `tmp:` nunca viaja al backend: guard en el cliente HTTP (`if (/tmp:/.test(JSON.stringify(body)))` → error fatal + log).

### 6.7 Coalescing
- `planilla.calificar` misma `pkTactividadEstudiante` pendiente sin enviar → se reemplaza el payload (último gana), se conserva `BASE` del primero (para el CAS).
- `asistencia.editar` mismo pk → fusión.
- `actividad.editar` sobre `actividad.crear` pendiente (`tmp`) → se fusiona en el payload de crear.
- Editar después de eliminar pendiente → bloqueado en UI.
- Nunca se fusiona una op `inflight`.

### 6.8 Archivos
- Orden: blobs de la op → op. Un blob subido guarda `uploadedArchivoId`; si la op falla luego, al reintentar no se re-sube (idempotente localmente). El huérfano en el servidor (archivo subido sin registro) se acepta; backend puede limpiar huérfanos > 7 días (§10 BE-6).
- Subida secuencial (1 a la vez) para no saturar redes lentas; timeout 120 s; sin subida reanudable en v1.

### 6.9 Después de sincronizar
- Invalidación **agrupada** al final del lote (no por op): conjunto de keys de cada `onSuccess` → `invalidateQueries` una vez por key. Requiere corregir B13.
- Se retira la capa optimista de las ops `done` **después** de que la refetch traiga el dato real (evita parpadeo).
- Notificación: si la pestaña está visible, toast resumen (§7.4); si hubo conflictos/rechazos, el banner pasa a "errores" hasta que se resuelvan.

### 6.10 Coordinación entre pestañas
- Líder por Web Lock (`navigator.locks.request("ce-outbox", { ifAvailable: true })`); las demás escuchan `BroadcastChannel` (`op:enqueued`, `op:done`, `op:conflict`, `sync:state`, `auth:changed`, `logout`).
- `logout` en una pestaña → todas vuelven al login. Login de otro usuario en una pestaña → las demás se recargan.
- El persister también escucha `queries:updated` para no pisar con datos viejos (última escritura por `updatedAt`).

---

## 7. UX y textos

### 7.1 Banner global (debajo del header, `components/layout`)
| Estado | Condición | Color (token) | Texto | Acciones |
|---|---|---|---|---|
| online | normal | — | (oculto) | — |
| degradado | `degraded` | `bg-yellow-22 text-yellow` | **"La conexión está lenta o inestable. Lo que guardes se enviará apenas se estabilice."** | "Ver pendientes (N)" si N>0 |
| offline | `offline` | `bg-navy-22 text-navy` | **"Estás sin conexión. Puedes seguir consultando y registrando asistencia y calificaciones; se enviarán cuando vuelva la conexión."** (si la vista es solo en línea: **"Estás sin conexión. Esta sección necesita conexión; tus datos guardados siguen disponibles en Planeador y Asistencia."**) | "Ver pendientes (N)" |
| sincronizando | líder procesando | `bg-blue-22 text-blue` | **"Sincronizando cambios… (X de N)"** | — |
| sincronizado | lote terminó OK (5 s) | `bg-green-22 text-green` | **"Todos tus cambios están sincronizados."** | — (autocierre) |
| errores | ≥1 `rejected`/`bloqueada` | `bg-red-22 text-red` | **"N cambios no se pudieron guardar. Revísalos para no perder información."** | "Revisar" → `/app/pendientes?estado=error` |
| conflictos | ≥1 `conflict` | `bg-orange-22 text-orange` | **"N cambios chocan con modificaciones hechas por otra persona. Elige qué versión conservar."** | "Resolver" |
| requiere login | refresh 401 con pendientes | `bg-red-22` | **"Tu sesión expiró. Inicia sesión para enviar N cambios pendientes. No se perderán."** | "Iniciar sesión" (abre login conservando outbox) |
| almacenamiento | cuota < 50 MB | `bg-yellow-22` | **"El almacenamiento del navegador está casi lleno. Sincroniza tus cambios y libera espacio."** | "Liberar espacio" |

Prioridad si coinciden: requiere login > errores > conflictos > offline > degradado > sincronizando > almacenamiento.

### 7.2 Indicador en el header
Ícono nube (nuevos íconos en `components/ui/icons.tsx`: `CloudCheckIcon` = `MdCloudDone`, `CloudOffIcon` = `MdCloudOff`, `CloudSyncIcon` = `MdCloudSync`, `CloudAlertIcon`) + contador.
Tooltips: "Conectado. Todo sincronizado." / "Sin conexión. N cambios esperando." / "Sincronizando N cambios…" / "N cambios con problemas". Clic → popover con resumen y "Ver todos los pendientes".

### 7.3 Badges por ítem (`PendingBadge`)
| Estado op | Badge (`Badge variant="soft"`) | Tooltip |
|---|---|---|
| pending/retry | color `info`: **"Pendiente"** | "Guardado en este equipo. Se enviará al recuperar la conexión." |
| inflight | `info` + spinner: **"Enviando…"** | — |
| conflict | `warning`: **"Conflicto"** | "Otra persona cambió este dato. Haz clic para resolver." |
| rejected | `destructive`: **"No guardado"** | Mensaje del servidor. |
| bloqueada | `muted`: **"En espera"** | "Depende de otro cambio que no se pudo guardar." |
| server-derivado viejo | `muted`: **"Por recalcular"** | "La nota se recalculará al sincronizar." |
| dato cacheado | texto pequeño: **"Datos del 12 oct, 08:30"** | "Información guardada; puede no estar actualizada." |

### 7.4 Política de toasts / notify
- Errores de red: **ninguno** por request. Solo cambia el banner.
- Al guardar offline: `notify("Guardado en este equipo. Se enviará cuando haya conexión.", { variant: "info" })` — reemplaza el `SUCCESS_MESSAGES.x` habitual. Agregar en `lib/success-messages.ts` la variante `queued`.
- Al terminar sync: un solo toast: "Se sincronizaron N cambios." / "Se sincronizaron N cambios; M necesitan tu revisión." (acción "Revisar").
- Conflicto/rechazo nuevo: toast persistente (no autocierre) solo una vez por lote.

### 7.5 Estados deshabilitados (`useOnlineOnly`)
- Botones solo en línea: `disabled` + tooltip **"Necesitas conexión para esta acción."**
- Página solo en línea abierta sin red y sin cache: empty state con ícono `CloudOffIcon`, título **"Esta sección necesita conexión"**, texto **"Vuelve a intentarlo cuando tengas internet. Mientras tanto puedes usar Planeador, Planilla y Asistencia."**, botón "Reintentar".
- Página con cache pero query no cacheada (p. ej. un grupo no preparado): **"No hay datos guardados de este grupo en este equipo. Conéctate y usa \"Preparar para usar sin conexión\"."**

### 7.6 Página `/app/pendientes`
Ruta nueva: `paths.app.pendientes` (path `"pendientes"`), breadcrumb `[{ label: "Cambios pendientes", to: "/app/pendientes" }]`, no está en el menú del backend → acceso por header y banner (se agrega a `NAV_PATH_ALIASES` sin ítem). Siempre disponible offline.
- Encabezado: "Cambios pendientes" + subtítulo "Lo que hiciste sin conexión y aún no llega al servidor." + botón "Sincronizar ahora" (deshabilitado offline: "Sin conexión").
- Tabs/filtro `?estado=`: Todos · Pendientes · Con problemas · Conflictos · Sincronizados (24 h).
- Tabla (TanStack Table, `"use no memo"`): columnas Fecha · Qué (`describe().titulo`, p. ej. "Calificación — Juan Pérez, Actividad 'Taller 3'") · Dónde (link a `ruta`) · Estado (badge) · Intentos · Último error.
- Acciones por fila: **Reintentar** (pone `nextAttemptAt = now`), **Ver detalle** (sheet con payload legible, no JSON crudo; JSON en "Detalles técnicos" plegable), **Resolver** (conflictos, §7.7), **Descartar** (`ConfirmRemoveButton`: "¿Descartar este cambio? Se perderá y no se enviará al servidor." Si tiene dependientes: "También se descartarán N cambios que dependen de este.").
- Acciones globales: "Reintentar todos", "Exportar registro" (descarga `.json` con outbox sin blobs + log, nombre `ce-pendientes-<fecha>.json`; texto: "Comparte este archivo con soporte si algo no se sincroniza.").
- Vacío: "No tienes cambios pendientes. Todo está sincronizado."

### 7.7 Resolución de conflictos
Diálogo: título "Este dato cambió mientras estabas sin conexión". Dos columnas: "Tu cambio (12 oct, 09:10)" / "Versión actual en el servidor". Botones: **"Conservar el mío"** (reenvía con `BASE` = valor del servidor), **"Usar el del servidor"** (descarta op), **"Editar"** (abre la celda/form). Para asistencia por estudiante se ofrece por fila.

### 7.8 Login / logout
- Logout con pendientes: diálogo "Tienes N cambios sin sincronizar" → "Sincronizar y salir" (si online; muestra progreso), "Salir y conservar en este equipo" (texto: "Se enviarán la próxima vez que inicies sesión con esta cuenta en este navegador."), "Descartar y salir" (rojo, confirmación). En modo equipo compartido no aparece "conservar".
- Login: si el `sub` tiene outbox → tras entrar: toast "Tienes N cambios guardados de una sesión anterior. Sincronizando…".
- Abrir la app offline con sesión previa: entra directo al último sitio, banner offline. Sin sesión previa: pantalla login con aviso "Necesitas conexión para iniciar sesión por primera vez en este equipo."

### 7.9 "Preparar para usar sin conexión"
Botón en el popover del header y en Planeador/Asistencia. Diálogo:
- Título: "Preparar para usar sin conexión"
- Texto: "Descargaremos a este equipo lo necesario para trabajar sin internet: tus actividades y unidades, las planillas y listas de estudiantes de tus grupos del periodo actual y los catálogos. Puede tardar unos minutos."
- Selección: grupos/asignaturas del docente (checkbox, todos marcados), periodo (actual por defecto), "Incluir archivos de recursos (imágenes)" (desmarcado; muestra tamaño estimado).
- Progreso: "Descargando 12 de 40…"; final: "Listo. Este equipo puede usarse sin conexión. Última preparación: hoy 08:30." Errores parciales: "No se pudieron descargar 3 elementos. Reintentar."
- También solicita `navigator.storage.persist()` y muestra el espacio disponible.
- Recordatorio: si la última preparación tiene > 7 días, chip en header "Prepara este equipo para trabajar sin conexión".

### 7.10 Nueva versión disponible
SW `registerType: "prompt"`. Toast persistente: "Hay una nueva versión de Colombia Evaluadora." botón "Actualizar". Si hay pendientes o sync en curso: "Actualizar" queda deshabilitado con "Termina de sincronizar para actualizar" y se aplica automáticamente al terminar el lote. Nunca `skipWaiting` automático durante sync.

---

## 8. Plan por vista

Convenciones: **L** = lectura offline (cache), **E** = escritura en cola, **SO** = solo online. TTL = cuánto se considera usable un dato persistido (después se muestra con badge "Datos del …" en rojo y se bloquea escribir sobre él si venció el TTL duro). "Prefetch" = lo que descarga "Preparar…" o la navegación online. Las rutas citadas son de `src/` en `origin/dev` (`66e4d118`); el checkout local de `test` está atrasado (no tiene `/verificar/b` ni `/app/sin-acceso`).

**Cobertura de rutas.** Las 52 rutas de `router.tsx` están cubiertas: raíz (`/`, `/verificar/b/$codigo`), `_auth` (6), `/app` + index + `sin-acceso`, cobertura (9), `_audits` (4), roles-menús (1), periodos (3), `_establishment` (5, registradas dos veces en `routeTree`, ver §15), gestión académica (4), planeador (8), asistencia (3) y la nueva `/app/pendientes`.

**Texto estándar** (se usa abajo como *[texto SO]*):
- Botón deshabilitado: tooltip **"Necesitas conexión para esta acción."**
- Página sin cache: título **"Esta sección necesita conexión"**, cuerpo **"Vuelve a intentarlo cuando tengas internet. Mientras tanto puedes usar Planeador, Planilla y Asistencia."**, botón **"Reintentar"**.

### 8.1 Rutas públicas

| Ruta | Llamadas reales | Clase | Comportamiento offline |
|---|---|---|---|
| `/` | `homeRoute.beforeLoad` hace `redirect /login` (`router.tsx`, `homeRoute`) | — | Igual. `/login` decide si ofrece "Continuar sin conexión". |
| `/verificar/b/$codigo` | `fetch` directo con `credentials: "omit"` (no usa axios a propósito, `features/verificacion/api/boletin-verificacion.ts:13-17,66`). Query `["verificacion-boletin", codigo]` (`:75`). PDF por `fetch(.../pdf)` exigiendo los últimos 4 dígitos del documento (`:97`). Ruta fuera de `_auth` y de `/app`, `noindex` (`router.tsx:240-256`). | SO | **No** se persiste nada: es pública y la puede abrir cualquiera que escanee el QR. El SW solo sirve el shell. Sin red: **"No pudimos verificar el boletín porque no hay conexión. Intenta de nuevo cuando tengas internet."** + "Reintentar". Nunca se muestra un estado cacheado: un "VIGENTE" viejo podría ser falso (el boletín pudo pasar a `REEMPLAZADO`). El SW **no** debe registrarse con scope que intercepte esta ruta de otro modo que el `navigateFallback`; ver C-80. |
| `/login` | `useLogin` → `POST /auth/login` (`x-remember-me`) | SO (auth) | Shell precacheado. Sin red: botón "Ingresar" deshabilitado + **"Necesitas conexión para iniciar sesión."** Si hay `session` persistida para `lastUserSub` (y el equipo no es compartido): link **"Continuar sin conexión como {nombre}"**. |
| `/forgot-password`, `/check-email?token`, `/restore-password?token` | `forgotPassword` / `restorePassword` en `features/auth/api` | SO | Botón deshabilitado + **"Necesitas conexión para recuperar tu contraseña."** Nunca se encola (tokens de un solo uso). |
| `/forgot-username` | recuperar usuario por documento | SO | **"Necesitas conexión para recuperar tu usuario."** |
| `/activate?token` | reusa el form de restore | SO | **"Necesitas conexión para activar tu cuenta."** El `token` de la URL **no** se guarda en ningún store. |

### 8.2 `/app` (layout), `/app/` (index) y `/app/sin-acceso`

- **Guard de sesión**: `beforeLoad` → `hasSession(queryClient)` (`lib/auth.ts:112`) → `getUser()` = `POST /auth/refresh`, que hoy captura cualquier error y devuelve `null` (`lib/auth.ts:20`). Offline debe usar la `session` persistida (B1/B2).
- **Guard de menú (nuevo respecto a la versión anterior del plan)**: `appLayoutRoute.beforeLoad` hace `ensureQueryData(navItemsQueryOptions)` y, si la ruta no está en el menú, `redirect` a `/app/sin-acceso?desde=…` (`router.tsx:380-398`). El menú sale de `evalCol.getRows("/my-menus")` (`features/navigation/api/query/use-nav-items-query.ts:27`), `staleTime: Infinity`. **Consecuencia offline**: si `navItems` no está hidratado desde IndexedDB **antes** de que corra `beforeLoad`, `ensureQueryData` intenta la red, falla y sube al `ErrorPage`. Requisito: el persister restaura `["navigation","menu"]` (y `menuSnapshot` de `session`) antes de montar el router (`PersistQueryClientProvider` con `onSuccess` → `router.load()`), y `navItemsQueryOptions` lleva `meta.offline` TTL 30 días.
- **Permisos por pantalla**: `useMenuPermission` → `evalCol.getRows("/usuarios/permisos-menu")` (`features/navigation/api/query/use-menu-permissions-query.ts:7`); "todo denegado mientras carga". Persistido TTL 30 días; si no está en cache offline, todos los botones quedan deshabilitados (comportamiento seguro por defecto).
- **Index** (`router.tsx:441-445`): redirige a `getFirstNavUrl(items) ?? /app/sin-acceso`. Offline sin menú cacheado → página "Esta sección necesita conexión" (no `ErrorPage` genérico).
- **`/app/sin-acceso`** (`router.tsx:449-455`, `features/navigation/pages/sin-acceso-page.tsx:20-40`): copy actual "No tienes acceso a este módulo" / "Tu rol no tiene permiso para ver esta sección…". Funciona offline (solo lee el menú). Corner: si se llega acá offline porque el menú persistido es de antes de un cambio de rol, se agrega debajo: **"Tu menú se actualizó por última vez el {fecha}. Si te asignaron este módulo hace poco, conéctate para actualizarlo."**
- Sidebar offline: los ítems de vistas SO llevan `CloudOffIcon` y tooltip **"Necesita conexión"**; siguen navegables (muestran el empty state).

### 8.3 Cobertura (`features/coverage`) — **SO**

Nada de cobertura se persiste (datos de menores y acudientes, §5.2).

| Ruta | Llamadas reales (cita) | Notas offline |
|---|---|---|
| `cobertura/reserva-de-cupo` | `api.query("/coverage/reservations/query")`, `/stats`, `GET /coverage/reservations/catalogs`, `POST /coverage/reservations`, export `/coverage/reservations/export[-all]` (`api/query/use-reservations-query.ts:14`, `use-reservations-stats-query.ts:7`, `use-reservation-catalogs-query.ts:20`, `api/mutations/create-reservation.ts:8`, `export-reservations.ts:13`) | **Solo existen en MSW**: en `test`/`production` ya fallan con red. Offline: *[texto SO]*. No vale la pena tratarla. |
| `cobertura/pre-matricula` | `api.query("/coverage/pre-matricula/query")`, `/catalogs`, `PUT`/`DELETE /coverage/pre-matricula/:id` (`use-pre-matricula-query.ts:19`, `update-pre-matricula.ts:14`, `delete-pre-matricula.ts:12`) | Solo MSW. *[texto SO]*. |
| `cobertura/inscritos`, `inscritos/$id` | `api.query("/coverage/enrollments/query")`, `PUT`/`DELETE /coverage/enrollments/:id` (`use-enrollments-query.ts:18`, `update-enrollment.ts:14`, `delete-enrollment.ts:12`) | Solo MSW; el detalle es un stub. *[texto SO]*. |
| `cobertura/matricula` (lista) | `POST /eval-col/matricula/query` (`api/query/use-matricula-query.ts:105`); export seleccionado `POST /coverage/matricula/export` (`export-selected-matricula.ts:13`, **solo MSW**) | SO. Retirar `PUT .../matricula/:id/retirar`, reingresar `PUT .../:id/reingresar` (`retire-matricula.ts:10`, `reingresar-matricula.ts:10`), eliminar `PUT /eval-col/cobertura-academica/matricula/:id` (`delete-matricula.ts:8`): botones deshabilitados con *[texto SO]*. |
| Cambios masivos (sede/grado/grupo) | `move-matricula.ts:24-27`: `POST /eval-col/cobertura-academica/matricula/{kind}` con `{IDS, GRUPO_DESTINO}`; con soporte, multipart `api.post("/files"+path)` (`:65`); límite 25 MB en los diálogos (`dialog-cambio-sede-matricula.tsx:179`, `dialog-cambio-grado-matricula.tsx:214`, `dialog-grade-change.tsx:199`) | SO. Operación masiva sobre cupos: no idempotente a nivel de negocio y de alto impacto. |
| `matricula/agregar` | Saga de `create-matricula.ts` (abajo) | SO + **borrador local**. |
| `matricula/editar/$id` | detalle `GET /eval-col/cobertura-academica/matricula/:id` (`use-matricula-detail-query.ts:134`) + `PATCH` multipart | SO + borrador local. |
| `matricula/detalle/$id` | mismo GET | SO. |
| `matricula/configuracion` | config de campos por establecimiento | SO. Corner: la config de campos define obligatorios/visibles del form de agregar; un borrador guardado con una config vieja puede no cumplir la nueva → al reabrir online se revalida con la config fresca. |

**Saga de `createMatricula` (`api/mutations/create-matricula.ts:111-180`), 8 pasos secuenciales sin compensación:**
1. `fetchSedeOptions()` y resolución de la sede **por nombre** (`:117`).
2. `fetchSedeJornadasActivas(pk_sede)` y jornada por nombre (`:131`).
3. `fetchPeriodoResolverMatricula(sede, jornada)` (`:140`).
4. `fetchGrados(periodoId)` (`:142`).
5. Estudiante: busca por documento (`findMatriculaUsuarioPorDocumento`, `:46`); si no existe, **crea cuenta** (`registerUsuarioAdministrado` o `registerMatriculaPersona` → `POST /auth/register/usuario`, `:55,69`, `register-matricula-persona.ts:73`).
6. Acudiente: igual (`:94-97`).
7. `postMultipart("/eval-col/cobertura-academica/matricula")` (`:159-160`).
8. Documentos extra uno a uno con `addMatriculaDocumento` (`:174`). Límite de 25 MB por archivo (`components/forms/form-create-matricula.tsx:1431,1608`).

Si el paso 7 falla, las cuentas de los pasos 5–6 quedan creadas. Al reintentar se **reusan**, porque el paso 5 busca primero por documento: es el único "idempotente por diseño". Si falla el paso 8, la matrícula existe con documentos incompletos.

**Por qué no se encola:**
- Crea identidades (cuentas SSO de menores).
- Resuelve por nombre catálogos que cambian.
- Depende de cupo y de unicidad de documento, que solo valida el servidor.

**Decisiones:**
- **Borrador local** en `drafts` (`formKey = "matricula:agregar"` / `"matricula:editar:<id>"`), solo en modo equipo **personal** y solo mientras la política de menores (P6) siga pendiente: **sin archivos adjuntos**. Los adjuntos no se guardan en el borrador.
- Texto del botón Guardar offline: **"Necesitas conexión para matricular. Tu borrador se conserva en este equipo (sin los documentos adjuntos)."**
- Si la red cae a mitad de la saga, se muestra el paso en que quedó: **"La matrícula no se completó: se creó la cuenta del estudiante pero no la matrícula. Vuelve a guardar cuando tengas conexión; no se duplicará la cuenta."**
- La `Idempotency-Key` del paso 7 se conserva en el borrador para que el reintento no duplique la matrícula (BE-1).

### 8.4 Registro de actividad (auditoría) — **SO**

- **Lecturas** (todas por `apiPath(..., AUDIT_API_PREFIX)` → `/audit-cval/...`, ClickHouse read-only):
  - sesiones `/audits/query` y `/audits/stats` (`administration/audits/api/query/use-audits-query.ts:55`, `use-audits-stats-query.ts:11`)
  - sesión, operaciones por sesión, tablas `/audit-tables/query`, operaciones por tabla y stats, cambios por operación (`use-audit-session-query.ts:29`, `use-session-operations-query.ts:59`, `use-audit-tables-query.ts:51`, `use-table-operations-query.ts:71`, `use-table-operations-stats-query.ts:21`, `use-operation-changes-query.ts:36`)
  - catálogos `GET /audit-operation-types` y `/audit-session-statuses` (`use-audit-operation-types-query.ts:22`, `use-audit-session-statuses-query.ts:20`)
- **Escritura**: **revertir** → `POST /sso-admin/audit/revert` (`api/mutations/revert-operation-change.ts:79`). Escribe en Postgres a partir de una foto de ClickHouse: no es idempotente y depende del estado actual de la fila.
- **Exports**: `downloadReport("auditoria-sesiones" | "auditoria-sesion-operaciones" | "auditoria-tabla-operaciones")` (`export-*.ts`).
- **Offline**:
  - Las 4 rutas (`registro-de-actividad/sesiones`, `sesiones/$id/operaciones`, `tablas`, `tablas/$slug`) muestran *[texto SO]*.
  - No se persiste nada (datos de terceros).
  - "Revertir" y "Exportar" quedan deshabilitados con *[texto SO]*.
- **Corner**: el layout `_audits` monta `NoticeProvider`, que **suprime el toast global de axios** (CLAUDE.md §7). Por eso la página debe pintar ella misma el estado sin conexión: no aparecerá ningún toast.

### 8.5 Administración `administracion/roles-menus` — **SO**

- **Llamadas** (todas `evalCol`):
  - roles `GET`/`POST /roles` (`use-roles-query.ts:8`, `create-role.ts:10`)
  - menús `GET /menus`, `POST /menus`, `PATCH /menus/:id`, `PUT /menus/:id/eliminar`, `PUT /menus/order` (`use-menus-query.ts:9`, `save-menu.ts:26-27`, `delete-menu.ts:15`, `reorder-menus.ts:16`)
  - asignación `PUT /roles/:id/menus` (`update-role-menus.ts:18`), que pasa antes por `partitionKnownMenus` + `withRequiredParents`
  - planes `GET`/`POST /plans` (`use-plans-query.ts:9,23`)
- **Offline**:
  - Todo deshabilitado, incluido el drag nativo (`draggable={false}` mientras `!online`).
  - Copy: **"Los cambios de roles y menús necesitan conexión."**
- **Corner**: guardar invalida `["navigation","menu"]`. Si el admin guarda online, las **otras pestañas** con menú persistido deben recibir `auth:changed` por BroadcastChannel para refrescar el snapshot, o seguirán con el menú viejo.
- **Corner**: un usuario offline puede seguir con un menú que le quitaron. El guard de `/app` lo dejaría entrar con datos cacheados hasta reconectar; las escrituras se rechazan por 403 al sincronizar (C-18).

### 8.6 Establecimiento educativo — **SO** (lectura parcial como proveedor)

| Ruta | Llamadas reales | Notas offline |
|---|---|---|
| `establecimiento-educativo/general` (permiso `ESTABLECIMIENTO`) | `POST /eval-col/establecimientos/query` (`institution/api/query/use-establishments.ts:88-101`), opciones `GET .../establecimientos/opciones`, catálogos `/catalogos/{municipios,etnias,discapacidades,propiedad-juridica}`; eliminar `PUT /eval-col/establecimientos/:id` (soft), bulk `POST .../bulk-delete {pks}`; export `downloadReport("establecimientos")` | SO. |
| `agregar` | `add-establishment-page.tsx` `submit` (`:521`), orden **(1)** valida, **(2)** rector y secretaria con `registerFuncionario({enviarInvitacion:false})` (`:449,548-572`), **(3)** crear EE: multipart `POST /files/eval-col/establecimientos` (campo `logo`, 2 MB por `image-file.ts:20`) o JSON (`create.ts:105-139`), **(4)** si falla, `cancelarPendientesRegistrados` con `Promise.allSettled` (`:602-620`), **(5)** invitaciones pendientes (`:272-279`) | SO. Única saga del front **con compensación**; aun así deja "registro a medias" si la compensación falla. Unicidad DANE `u_testablecimiento_1` (`lib/api-client.ts:180-186`). Botón Guardar: **"Necesitas conexión para crear el establecimiento."** No hay borrador offline (datos personales del rector/secretaria). |
| `editar/$id` | `GET /eval-col/establecimientos/:id` (`use-establishment.ts:178,198`), `PATCH` o `patchMultipart` (`create.ts:150-163`), rector/secretaria `PATCH` + reactivación si cambió el correo (`:413-441`) | SO. |
| `sedes` (permiso `SEDES_EDUCATIVAS`) | `POST /eval-col/establecimientos/sedes/query`, `GET .../sedes/:id`, `/opciones`, `/zonas`; crear `POST`, editar `PATCH`, eliminar `PUT`, bulk `PUT .../bulk-delete` (`campuses/api/*`) | SO para escribir. `["campuses","options"]` la consumen otros features → **L** catálogo TTL 14 días. |
| `funcionarios` (permiso `FUNCIONARIOS`) | `POST .../funcionarios/query`, `GET .../funcionarios/:id`, `POST /auth/register/cval/funcionario` (o multipart `/files/register/cval/funcionario` con foto), `PATCH .../funcionarios/:id`, `PUT /eval-col/funcionario/:id/permisos` (una llamada con "eliminar" y "crear"), reenviar/reactivar activación, estado de cuenta | SO. Ver detalle abajo. |

**Detalle de `dialog-manage.tsx` (funcionarios):**
- Registrar crea TUSUARIO y TFUNCIONARIO en una sola llamada (`:842`). Si se editaron datos autocompletados, sigue un `PATCH` (`:850-870`). No hay rollback: el error es "No fue posible registrar el funcionario." (`:901`).
- Los permisos rol×sede×jornada se diffean contra `originalPermissionIdsRef` y viajan en **un** `PUT` (`:1118-1122`). Los ids nuevos se emparejan **por posición** (`:1128-1135`).
- El orden es único por (rol, sede): `UK_TSEDE_USUARIO_2` (`:1069`).
- Si el usuario cambia su **propio** correo, un modal bloqueante cierra la sesión (`:741-744,999-1004`, commit `0a236aff`).
- Offline queda todo deshabilitado con **"Necesitas conexión para gestionar funcionarios."** No se persiste ninguna query de funcionarios (§5.2).
- Corner C-17: el cambio de correo de un docente con outbox pendiente cambia su `sub`.

**Periodos académicos** (`establecimiento-educativo/periodos`, `/agregar`, `/$id/editar`). Solo backend real, `api.*` con `/eval-col` escrito a mano. Las tabs son lazy (`components/evaluation-periods-section.tsx:9-36,73-98`).

| Tab / vista | Escrituras (verbo + endpoint) | Lecturas que **sí** se persisten (proveedor) |
|---|---|---|
| Lista y agregar/editar periodo | `PUT /eval-col/periodos-academicos` (crear), `PUT .../periodos-academicos/:id`, `PUT .../periodos-academicos/editar/:id` | `use-academic-periods`, `use-academic-period`, `use-school-years`, `use-academic-period-statuses` → TTL 14 días (los usan informes, asistencia y planeador para el selector de periodo) |
| Periodos de evaluación | `PUT /eval-col/periodo-evaluacion/:id`, `POST .../periodo-evaluacion/bulk-delete` | `use-evaluation-periods`, `use-evaluation-period-statuses` (el **estado** del periodo decide si la planilla encola calificación o solicitud, §8.8 planilla) |
| Criterios de evaluación / promoción | `PUT /eval-col/periodos/:id/criterio-evaluacion`, update-promotion-criteria | `use-evaluation-criteria(-options)` |
| Escalas de valoración | `POST /eval-col/escalas`, `PUT .../escalas/:codigo`, `POST .../escalas/bulk-delete`, `POST .../escalas/valoraciones/bulk-delete` | `use-rating-scales`, `use-rating-symbols`, `use-rating-scale-types` (la planilla pinta niveles con ellas) |
| Grados y grupos | `POST /eval-col/grados`, `PUT .../grados/:id`, `PUT .../grados/:id/eliminar`, `PUT .../grados/eliminacion-masiva`, `POST .../grados/:id/grupos`, `PUT .../grupos/:id`, `PUT .../grupos/:id/eliminar`, `POST .../grupos/bulk-delete` | `use-grades`, `use-grade-groups`, `use-grados-catalog` |
| Plan de estudio | `PUT /eval-col/plan-asignaturas/:codigo`, `PUT .../:codigo/eliminar`, `POST .../plan-asignaturas/bulk-delete` | `use-study-plans`, `use-study-plan-subject-label` (la usan informes) |
| Áreas y asignaturas | `POST /eval-col/areas`, `POST/PUT .../areas/:id/asignaturas`, `PUT .../areas/asignaturas/:id`, `PUT .../areas/asignaturas/eliminar/:id`, `PUT .../areas/eliminar/:codigo`; lecturas `api.query("/eval-col/areas/query")`, `api.query(".../areas/asignaturas")`, `GET .../areas/general` | `use-subjects`, `use-period-areas`, `use-general-areas` |
| Especialidades (énfasis) | `POST /eval-col/enfasis`, `PUT .../enfasis/eliminar/:id` | `use-especialidades` |
| Horario | `POST /eval-col/horarios` | `use-horario` (asistencia lo usa para los bloques del día) |
| Asignaciones académicas | `POST /eval-col/asignaciones` | `use-teacher-assignments`, `use-assignment-subjects`, `use-assignment-teachers` (definen grupos y asignaturas del docente → base de "Preparar…") |
| Catálogos genéricos | — | `fetchSelectCategory(CATEGORIA)` → `GET /eval-col/select/:CATEGORIA` (`api/query/fetch-select-category.ts:17`), `use-jornadas`, `use-sede-options`, `use-teaching-levels`, `use-metodologias` |

- **Offline**: todas las escrituras quedan deshabilitadas con **"Los cambios de configuración académica necesitan conexión."** Las lecturas de la columna derecha llevan `meta.offline` `{scope:"catalogo", ttl: 14 d}`. 32 archivos de planeador y gestión académica importan de `establishment/academic-period`, y por eso esas lecturas deben estar persistidas.
- **Corner**: si el coordinador **cierra un periodo de evaluación** mientras un docente está offline, el `estado` cacheado dice "abierto" y la planilla encola una calificación directa. El servidor la convierte en solicitud (Regla 55) y devuelve `solicitudes_pendientes`; ver C-84.
- **Corner**: se elimina un grado o grupo con ops pendientes (eliminación lógica `PUT .../eliminar`). Las ops se rechazan con 404/RAISE (C-26).

### 8.7 Gestión académica

#### `gestion-academica/informes` — **L parcial / SO**

- **Lecturas** (todas `evalCol.postRows`, POST de lectura):
  - Cascada: `/informes/sedes`, `/informes/anos`, `/informes/jornadas` (`reports/api/query/use-cascada-query.ts:40,58,71`).
  - Periodos y grupos: `/informes/periodos`, `/informes/grupos-periodo` (`use-periodos-informe-query.ts:64`, `use-grupos-periodo-query.ts:64`).
  - Informe del grupo: `/informes/grupo` (`use-informe-grupo-query.ts:119`).
  - Evidencias y historial: `/informes/evidencias`, `/informes/historial` (`:58`, `:88`).
  - Alertas: `/informes/planillas-pendientes`, `/informes/cambios-pendientes` (`use-alertas-query.ts:81,95`).
- **Escrituras**:
  - Consolidar ("Guardar notas"): `POST /informes/guardar` (`use-guardar-informe.ts:56`) por periodo, con `Promise.allSettled` y resumen "Se consolidaron X de N períodos…" (`pages/reports-page.tsx:529,547`).
  - Observación manual: `/informes/observacion[/final]/guardar|eliminar` (`use-observacion.ts:78-115`).
  - IA: `/ai/observaciones/periodo` o `/anio` (`use-observacion.ts:49`), con 409 si no se manda `SOBRESCRIBIR`.
  - Rechazar planillas: `/aprobaciones/rechazar-masivo` (`use-rechazar-planilla.ts:41`).
  - Boletín: `downloadReport("boletin")`, que lleva un QR verificable en `/verificar/b`. Tabla: `downloadReport("informes-tabla")` (`export-informe.ts:19,56`).
- **Permisos**: `useMenuPermission("INFORMES")`. Docente y director de grupo **solo consultan** (`puedeEscribir = puedeEditar && !soloSusGrupos`, `reports-page.tsx:418-421`). Para el público objetivo del offline (docentes), la vista ya es de solo lectura.
- **Offline**:
  - **L** de la cascada y de `informe-grupo` de los grupos abiertos, TTL 7 días, con badge de fecha. El estado de pestañas ya vive en la URL, con tope de 8 grupos abiertos (`MAX_GRUPOS_ABIERTOS`, `:87`).
  - **SO**: consolidar, observaciones (manuales e IA), rechazar, boletín, export. Tooltip específico del boletín: **"El boletín se genera en el servidor; necesitas conexión para descargarlo."**
- **Corner**: los valores mostrados (definitivas, `consolidado`, `sinProyeccion`) son del servidor. Offline se rotulan **"Datos del {fecha}"** y nunca se recalculan.

#### `informes/planilla/$grupoId/$asignaturaId/$periodoId` — **L**

- `POST /informes/planilla` (`use-planilla-informe-query.ts:94`); guardar `POST /informes/planilla/guardar` (`use-guardar-planilla.ts:32`).
- L si fue visitada o preparada. Guardar es SO, con el texto de consolidar: **"Necesitas conexión para guardar la planilla del informe."**

#### `referentes-curriculares` y `detalle/$id` — **L**

- Todo pasa por `apiPath` (mock en inglés, real `/referentes-curriculares/...`):
  - crear y editar (`create.ts:60,69`)
  - eliminar `.../:id/eliminar` (`use-delete.ts:9-11`)
  - activar/inactivar (`use-toggle-status.ts:19`)
  - enunciados `.../:id/enunciados` y `.../enunciados/:id[/eliminar]` (`use-statement-mutations.ts:32-39,122-126`)
  - personalizar etiqueta de asignatura (`delete-subject-label.ts:5-7`)
  - export `downloadReport("referentes-curriculares")` (`export.ts:29`; antes era solo MSW, el comentario `:23` lo aclara)
- **Bug**: la creación de evidencias usa `apiPath(..., "")` con realPath **vacío** (`use-statement-mutations.ts:157`), así que en real postea a `/eval-col`. Ver §15.
- Cache TTL 30 días; el planeador las consume (enfoque FORMATIVO/EVALUATIVO, enunciados, evidencias). Escrituras: SO.

### 8.8 Planeador (`features/planeador`)

#### `planeador/actividades` — **L + E (fases 2–3)**

- **Cache**:
  - `actividades-mias`, `actividades-calendario`, `actividades-stats`, `actividad` (detalle), `instrumento-actividad` y las calificaciones por actividad, TTL 7 días.
  - Catálogos del planeador (`use-*-catalog.ts`) `scope:"catalogo"`, TTL 30 días.
  - `planeador/sedes/opciones` (`asistencia/api/query/use-sedes-opciones-query.ts:9`, hoy `staleTime: 0`) también se persiste.
- **Escrituras desde esta vista** (todas `evalCol.putRow`, PUT idempotentes por naturaleza salvo efectos de servidor):
  - asistencia de actividad `PUT /planeador/actividades/estudiantes/:pk/asistencia` (`api/mutations/use-asistencia-actividad.ts:23`) → `actividad.asistencia`, **E fase 2**
  - estado de resultado `PUT .../estudiantes/:pk/estado-resultado` (`use-estado-resultado.ts:20`) → **E fase 2**
  - calificar celda, bulk, observar y soporte → ver Planilla (mismos hooks)
  - resolver validación del coordinador (`resolver-validacion-coordinador.ts`) → SO (`?modo=approval`)
  - eliminar `PATCH /eval-col/planeador/actividades/:id` (soft, `delete-actividad.ts:16`) → SO
  - importar/exportar JSON (`importar-actividades-json.ts`, `exportar-actividades-json.ts`) y PDF `downloadReport("planeador-actividades")` (`export-actividades.ts:28-35`) → SO
- **Offline**:
  - Rail `?dia`, calendario y `ActividadDetallePanel` (`?actividad`) en modo lectura.
  - En `?modo=grades`: calificar se encola.
  - En `?modo=approval`, banner: **"Las aprobaciones necesitan conexión. Puedes revisarlas, pero no decidir sin internet."**
- **Optimista**: no hay ningún `onMutate`/`setQueryData` en el planeador hoy (verificado). La capa optimista de la outbox es nueva y se superpone en el render, no en el cache.

#### `planeador/actividades/agregar` y `$id/editar` — **E (fase 3)** / SO en fases 0–2

**Secuencia real de crear** (`pages/planeador-crear-actividad-page.tsx`):
1. `createMutation` → `POST /eval-col/planeador/actividades` (`:143`, `create-actividad.ts:49`). Devuelve el pk.
2. `updateMateriales` → **PUT de reemplazo total** `.../actividades/:id/materiales` (`:154`, `update-materiales-actividad.ts:123`):
   - Los archivos nuevos se suben antes por `postMultipart` (`:4,73`).
   - Cada material lleva exactamente uno de `url` o `fkTarchivo` (`:21-22`).
   - Devuelve `recursosOmitidos`.
3. `updateInstrumento` → PUT `.../instrumento` (`:161`, `update-instrumento-actividad.ts:218`):
   - Requiere que el PUT o POST anterior haya fijado `FK_TLV_INSTRUMENTO_EVALUACION`; si no, 400/22023.
   - Para el tipo "Otro" resuelve catálogos con `Promise.all` antes de enviar (`:198-208`).
4. `updateAdaptaciones` → **PUT de reemplazo total** `.../adaptaciones` (`:168`, `update-adaptaciones-actividad.ts:142`).
5. Criterios de la unidad: `Promise.allSettled` de `POST .../actividades/:id/criterios` (`:177-179`, `agregar-criterio-unidad-actividad.ts:33`). Puede fallar uno y los demás no.

**Secuencia real de editar** (`pages/planeador-editar-actividad-page.tsx`):
1. Si cambió la unidad: `unlink` `PATCH .../unidades/actividades/:aid` (soft) y luego `link` `PUT .../unidades/:uid/actividades/:aid` (`:255-259`).
2. `updateMutation` → `PUT .../actividades/:id` (`:317`, `update-actividad.ts:51,147`). Lleva `EVIDENCIAS`/`CRITERIOS` como reemplazo total en el **mismo** PUT y `QUITAR_RECUPERACION`.
3. `updateMateriales` (`:324`).
4. `updateInstrumento` (`:329`).
5. `setEstudiantes` (`:352`, `set-estudiantes-actividad.ts`).
6. `updateAdaptaciones` (`:366`).

> **Corrección** respecto de la versión anterior del plan: el orden de CLAUDE.md §6 ("vínculo → evidencias una por request → materiales → instrumento → adaptaciones → criterios → estudiantes") **no** es el que ejecuta hoy el editar. Las evidencias van dentro del PUT de actividad. `agregar-evidencia-actividad.ts` (`POST .../evidencias`) existe pero no está en esta saga. Y estudiantes va **antes** que adaptaciones. El handler de fase 3 debe copiar el orden real de cada página, no el de CLAUDE.md.

**Dependencias de red en el momento de guardar** (bloquean el guardado offline si no están en cache):
- `resolveXxxId(nombre)` de catálogos.
- `resolveCalculoDefinitivaId` (unidad).
- Los 3 catálogos de `recuperacion-body.ts:31-40`.
- Los catálogos del instrumento "Otro".

Cada resolver debe leer primero del cache persistido. Si falta: **"Faltan datos de catálogos en este equipo. Conéctate una vez para descargarlos."**

**Archivos**: recursos ≤ 20 MB (`form-editar-actividad.tsx:2255`) y adaptaciones ≤ 10 MB con máximo 3 (`:5686`, copy `:5508`). Offline aplica el tope de §0.4: un recurso de 10 a 20 MB se acepta solo online, con el aviso **"Este archivo pesa más de 10 MB: adjúntalo cuando tengas conexión."**

**Reemplazo total y archivos**: materiales y adaptaciones conservan un archivo existente **solo** si se reenvía su `fkTarchivo`. El handler arma el payload **al enviar**:
- reescribe `blobRef → fkTarchivo` de los blobs recién subidos;
- toma los `fkTarchivo` existentes del detalle **del servidor** que se refetchea justo antes. Si el refetch falla, la op queda en `retry` y no se envía con un detalle viejo.

**Borrador**: `lib/actividad-form-draft.ts` usa `sessionStorage` (`:12,37,48`) y guarda `blob:` URLs de archivos recién elegidos, que **mueren al cerrar la pestaña** (la vista previa de recurso depende de esto). La migración a `drafts` (IndexedDB) guarda el **Blob** en `blobs` y regenera la `blob:` URL al rehidratar.

**CAS**: BE-3 opción B ya está aprobada (§0). El PUT de actividad manda `VERSION` (o `UPDATED_AT`) y el servidor responde 409 si cambió. Editar offline con un detalle cacheado de más de 24 h muestra **"Estás editando una versión guardada el {fecha}. Si alguien más la cambió, te pediremos elegir."**

**Ids `tmp:`**: `link-actividad-unidad` con una unidad `tmp:` depende de la op que crea la unidad (fase 4).

#### `planeador/unidades`, `unidades/agregar`, `unidades/editar/$id` — **L** (fase 1), **E fase 4 opcional**

- **Lecturas**:
  - `GET /planeador/unidades` (`use-unidades-query.ts:17`) y `/unidades/tabs` (`use-unidades-tabs-query.ts:101`, staleTime 5 min).
  - Por unidad: `/unidades/:id/actividades?size=100` (`use-unidad-actividades-query.ts:53`) y `/criterios` (`use-unidad-criterios-query.ts:54`).
  - Valoraciones y referente: todas bajo `unidad.detalle(id)` (`api/query-keys.ts:130-136`).
- **Selección en la URL**: `?instrumento` elige la tab (fallback a la tab 0) y `?unidad` elige la unidad (fallback a la primera) (`pages/planeador-unidades-page.tsx:100,146`).
- **Crear** (`create-unidad.ts`):
  - Valida grado y asignatura en el cliente (`:46-47`).
  - `resolveCalculoDefinitivaId` hace un fetch de catálogo (`:48`).
  - `POST /eval-col/planeador/unidades` (`:43,70`); el pk lo da el servidor (`:71-72`).
  - Desde V488 **no** manda instrumento (`:58-62`).
  - 409 si el nombre está duplicado (`planeador-crear-unidad-page.tsx:126`).
- **Editar** (`update-unidad.ts`):
  - `PUT .../unidades/:id` con `ENUNCIADOS` como **reemplazo total** (V492, `:93-104`).
  - Si cambia el método de cálculo, el servidor convierte peso y puntos (Regla 28) y devuelve `actividades_afectadas` (`:105-106`), que la página lista en el aviso (`planeador-editar-unidad-page.tsx:189-193`). Antes se confirma si hay actividades sin peso (`:274-276`).
- **Ponderación**: `PUT .../unidades/actividades/:aid/ponderacion` (`update-ponderacion-actividad-unidad.ts:18`). El tope de 100 % por (unidad, grupo) lo impone el trigger `tr_tactividad_ponderacion_unidad` (V223). El clamp del front es solo optimista y además suma todos los grupos (`columns-unidad-actividades.tsx:54-59`).
- **Puntaje**: `PUT .../actividades/:aid {NOTA_MAXIMA}` (`update-puntaje-actividad-unidad.ts:21`).
- **Ceder** `PUT .../unidades/:id {FK_TFUNCIONARIO}` (`ceder-unidad.ts:27`) y **eliminar** `PATCH .../unidades/:id` (soft, `delete-unidad.ts:18-20`): ambos desde `dialog-delete-unidad.tsx`.
- **Offline**:
  - Lectura completa si se preparó.
  - Crear y editar unidad: SO hasta la fase 4. Texto: **"Crear o editar unidades necesita conexión por ahora."**
  - Ceder y eliminar: siempre SO.
  - Ponderación y puntaje: fase 4, con CAS; el rechazo por el trigger se muestra con el `RAISE`.
- **Corner**: `useUnidadReferenteQuery(...).esFormativo` debe estar cacheada o se bloquea la edición de actividades de esa unidad. Detectar FORMATIVO por `enfoquePedagogico` está prohibido (viene hardcodeado).
- **Corner**: `actividades_afectadas` es un resultado del servidor. Un cambio de método encolado offline no puede mostrar el aviso hasta sincronizar; el resumen de sync lo muestra.

#### `planeador/recursos/vista-previa` — **L parcial**

- El recurso viaja en el search y el form queda en `sessionStorage` (`actividad-form-draft.ts`).
- Imágenes del servidor: `ArchivoImage` / `useArchivoViewUrl` necesitan el token de vista (`POST /files/view-token/{id}`, 5 min, `lib/files.ts:108-109`), así que son SO.
- Offline:
  - Si el archivo está en `blobs` (recién adjuntado), se usa `URL.createObjectURL`.
  - Si no, placeholder **"Vista previa no disponible sin conexión"**.
- "Incluir archivos de recursos" en Preparar guarda los bytes en la Cache API del SW con la clave `archivo:<id>` (sin token).
- **Corner**: un `blob:` URL guardado en `sessionStorage` por una pestaña no sirve en otra pestaña ni tras recargar. La vista previa debe resolver por `blobRef`, no por URL.

#### `planeador/planilla` — **L + E (fase 2, piloto)**

- **Lecturas**: solo con grado, grupo, asignatura y periodo elegidos (`pages/planeador-planilla-page.tsx:125-131`).
  - `GET /planeador/planilla/columnas` (staleTime 15 s, `use-planilla-columnas-query.ts:76-93`).
  - `GET /planeador/planilla/calificaciones` (staleTime 10 s, `use-planilla-calificaciones-query.ts:121-137`).
  - Nota del estudiante (`useNotaEstudianteQuery`) y soportes `GET .../estudiantes/:pk/soportes` (`use-soportes-estudiante-query.ts:21-41`).
  - Persistir con TTL 7 días. El `staleTime` corto se mantiene online.
- **Escrituras y su op**:

| Acción | Llamada | Op / notas |
|---|---|---|
| Calificar celda | `PUT /eval-col/planeador/actividades/estudiantes/:pk/calificar` `{CALIFICACION: JSON string, FECHA}` (`use-calificar-celda.ts:73-81`; un objeto devuelve 400) → `{calificacion, solicitudes_pendientes?}` (`:66-71`) | `planilla.calificar`, `entityKey = planilla:act-est:<pk>`. Coalescible. |
| Vista previa de nota | `POST .../calificar/vista-previa` (`use-previsualizar-nota.ts:16-20`) | **SO**. Offline el popover muestra **"La nota se calculará al sincronizar."** |
| Bulk | `PUT .../actividades/:id/calificar-bulk/<tipo>` `{ESTUDIANTES, FECHA, …}` (`use-calificar-bulk.ts:46-78`); el llamador hace `Promise.all` (`calificar-actividad-bulk.tsx:238`) | Una op **por llamada bulk** (no por celda: el endpoint es bulk). `entityKey = planilla:actividad:<id>`. Coalescing solo si es el mismo criterio/ítem. |
| Observar | `PUT .../estudiantes/:pk/observar` `{OBSERVACION, FECHA, EVIDENCIAS?, ENLACE?, MOMENTO?}` (`use-observar-estudiante.ts:35-38`) | `planilla.observacion`. Máximo 1000 caracteres (`lib/observacion.ts:4`). |
| Soporte: agregar | `postMultipart /files/eval-col/planeador/actividades/estudiantes/:pk/soportes` con campo `FK_TARCHIVO` (`use-observacion-soporte.ts:33-37`) | `planilla.soporte` con blob. ≤ 10 MB, máximo 3 por observación, PDF/DOC/DOCX/JPG/PNG (`lib/observacion.ts:9-17`). |
| Soporte: quitar / favorito | `PUT .../soportes/:pk {FECHA}` / `PUT .../soportes/:pk/favorito` (`:77-80,119-122`) | `planilla.soporte-quitar` / `planilla.soporte-favorito`. Si el soporte es `tmp:` (no subido) → se descarta localmente, no viaja. |

- **Periodo cerrado (Regla 55)**: la página ya tiene una **cola local en memoria** (`Map<pk, CambioPendiente>`, `hooks/use-solicitud-periodo-cerrado.ts:23`). Se envía en un `for` secuencial con un botón "Guardar" (`:44-46`, page `:200`) y se pierde al recargar.
  - La outbox **absorbe** esta cola: con periodo cerrado, las ops `planilla.calificar` se marcan `requiereSolicitud: true` (solo informativo) y se envían igual. El servidor devuelve `solicitudes_pendientes`.
  - Copy al encolar: **"Guardado en este equipo. Como el periodo está cerrado, se enviará como solicitud al coordinador."**
- **Valores del servidor**: `definitiva`, `definitiva_proyectada`, `_homologada`, `_registrada` y `_propuesta_homologada` (`use-planilla-calificaciones-query.ts:53-59,85-90`), y también `estado_resultado` (Regla 62, `api/types/calificacion.ts:27-28`). Offline se muestran como "Por recalcular" cuando la fila tiene ops pendientes.
- **`FECHA`**: se captura al encolar. Ver C-10/C-30.
- **Corner**: cambiar el filtro hoy **limpia** los cambios pendientes (`page:107-109`). Con la outbox ya no se pierden; el aviso pasa a ser informativo.
- **Corner**: recuperación (`recuperacion-body.ts:31-40`) resuelve 3 catálogos con `Promise.all` y tira si falla. Offline requiere esos catálogos en cache.

### 8.9 Asistencia (`features/academic-management/asistencia`) — **piloto fase 2**

#### `asistencia` (calendario mensual) — **L + E (marcar todos)**

- **Lecturas**:
  - `GET /eval-col/asistencias/calendario`, key `["asistencia","calendario",params]` (`api/query/use-asistencia-calendario-query.ts:38-50`), con versión multi-mes por `useQueries` (`:60-73`).
  - `GET /asistencias/resumen-horas` (`use-asistencia-resumen-horas-query.ts:19,31`).
  - Sedes `GET /eval-col/planeador/sedes/opciones` (`use-sedes-opciones-query.ts:9`, `staleTime: 0`).
  - Cache del mes visible ±1, TTL 7 días.
- **"Marcar todos"** (`pages/asistencia-page.tsx:186-222`): `Promise.all` de `registrar` por bloque con `MARCAR_TODOS:1`, que solo toca estudiantes sin asistencia (`use-asistencia-registrar-mutation.ts:47`).
  - Offline: **una op por bloque**.
  - El resultado depende del estado del servidor ("los que no tengan"), así que el optimista **no** marca a nadie. El día muestra el punto "Pendiente" y el texto **"Se marcará Asistió a quienes no tengan registro cuando se sincronice."**
- Días con ops en cola: punto azul "Pendiente".

#### `asistencia/manual` — **L + E**

- **Corrección**: `asistenciaManualSearchSchema` **ya** tiene `.catch(undefined)` (`api/schema.ts:12-15`). Si faltan `fecha`/`sede`, la página hace `<Navigate>` al calendario (`asistencia-manual-page.tsx:636-643`). Se retira esa tarea de la Fase 0.
- **Lecturas**:
  - Roster `GET /eval-col/asistencias/sesion/estudiantes`, key `["asistencia","sesion-estudiantes",params]` (`use-asistencia-roster-query.ts:14,22`): una query por bloque con `useQueries` (`:28-55`). `BLOQUE` se omite si es null (`:34`).
  - Con sesión formativa (preescolar) la key lleva `ACTIVIDAD` y no `ASIGNATURA`/`BLOQUE` (`asistencia-manual-page.tsx:219-226`).
  - Catálogo de tipo de asistencia `["tipo-asistencia","catalogo"]` `staleTime: Infinity`, valores 1, 2, 3, 5, 6; 3 y 6 son justificados (`use-tipo-asistencia-catalog-query.ts:27-29`).
- **Guardar** (`asistencia-manual-page.tsx:422-517`):
  - Filas **sin** `pk_tasistencia` van a `registrar`, agrupadas por bloque: `POST /eval-col/asistencias/registrar` con `{GRUPO, ASIGNATURA|ACTIVIDAD, FECHA, BLOQUE, REGISTROS, MARCAR_TODOS}` (`use-asistencia-registrar-mutation.ts:55`, `types/asistencia.ts:148-161`).
  - Filas **con** pk van a `editar`: un `PATCH /eval-col/asistencias/:pk` por estudiante (`use-asistencia-editar-mutation.ts:27-39`).
  - Todo bajo un solo `Promise.all` (`:458-484`). Los guards `yaPropuesto`/`yaPendiente` evitan reenviar solicitudes ya abiertas (`:435-454`).
- **Soportes**: multipart `POST /eval-col/asistencias/soporte` con campo `SOPORTE`, devuelve `pk_tarchivo` (`:17-25`). Se suben en paralelo con `Promise.all` antes del registrar (`:27-38`). ≤ 10 MB, PDF/JPG/PNG (`columns-asistencia-manual.tsx:174-175`).
- **Corrección de idempotencia**: `registrar` es un **upsert** (V138, comentario `:432-434`). Un registrar repetido **sobrescribe**, no duplica ni da conflicto. El riesgo real no es el duplicado sino el **last-write-wins silencioso** entre dos docentes o con el coordinador.
  - BE-5 (aprobado) agrega el índice único **y** el CAS por estudiante.
  - Sin contexto (ni `ASIGNATURA` ni `ACTIVIDAD`) el servidor responde 409 `CK_TASISTENCIA_CONTEXTO` (`types/asistencia.ts:150-151`). La outbox lo clasifica como `rejected`, no como `conflict`.
- **Regla 75**: **solo `editar`** devuelve `solicitudes_pendientes` (comentario `use-asistencia-editar-mutation.ts:23-25`). Copy existente: "El período ya no es calificable: los cambios quedaron pendientes de aprobación del coordinador." (`asistencia-manual-page.tsx:489`). Se reutiliza tal cual en el resumen de sync.
- **Ops**:
  - `asistencia.registrar`: una por (grupo, contexto, fecha, bloque), `entityKey = asistencia:sesion:<grupo>:<ctx>:<fecha>:<bloque>`. Coalescible: mismo bloque, último `REGISTROS` por estudiante.
  - `asistencia.editar`: una por pk.
  - Si un estudiante se registró offline (registrar pendiente) y luego se corrige, la corrección se **fusiona** en el registrar (aún no tiene pk). Nunca se emite un PATCH con `tmp:`.
- **Invalidación**: `["asistencia"]` + `invalidarPlaneadorPorAsistencia` (`features/planeador/api/query/invalidar-por-asistencia.ts:16-23`).
- **UX**: hoy no hay autoguardado; la página pregunta antes de cambiar de tab (`:521-528`). Offline se mantiene igual. "Guardar" encola y muestra el copy de §7.4.

#### `asistencia/seguimiento` — **L** (+ E de edición puntual)

- **Lecturas**:
  - `POST /eval-col/asistencias/query` con body (sede en `FILTERS.SEDE`), key `["asistencia","seguimiento",body]`, `placeholderData` (`use-asistencia-seguimiento-query.ts:14-25`).
  - Aprobaciones `GET /eval-col/aprobaciones/pendientes?tipo=CORRECCION_ASISTENCIA`, key `["asistencia","aprobaciones"]` (`use-aprobaciones-asistencia-query.ts:10-14`).
- **Editar registro** (`dialog-editar-seguimiento.tsx:128-150`): `PATCH` por `pks` con solo los campos cambiados (`TIPO_ASISTENCIA`, `OBSERVACION`/`LIMPIAR_OBSERVACION`, `SOPORTE_ARCHIVO`, `LIMPIAR_ARCHIVO`). Soporte ≤ 10 MB (`:225-226`). → `asistencia.editar` (E).
- **Aprobaciones**:
  - **Corrección**: es **una** llamada masiva `POST /eval-col/aprobaciones/{aprobar|rechazar}-masivo {IDS, MOTIVO?}` → `{resueltas, fallidas}`; solo tira si fallan todas (`use-aprobaciones-asistencia-mutation.ts:32-40`). No hay `allSettled`.
  - **SO** (decisión de autoridad). Copy existente para fallos parciales: "{n} solicitud(es) no se pudo resolver. Revisa la lista." (`revision-cambios-asistencia-sheet.tsx:194`).
- **Export**: `downloadReport("asistencia")` (`api/mutations/export.ts:13-18`) → SO.

### 8.10 Nueva ruta `/app/pendientes`

- Ver §7.6. Siempre L.
- `isAlwaysAllowedPath` del guard de menú (`router.tsx:381`) debe incluir `/app/pendientes`. Si no, el guard la manda a `sin-acceso`, porque no está en `my-menus`.

### 8.11 Matriz resumen

| Vista | L | E | SO acciones | Fase |
|---|---|---|---|---|
| `/verificar/b/$codigo` | — (nunca) | — | todo | 0 (copy) |
| Login / recuperación / activar | shell | — | todo | 0 |
| `/app` guard + sin-acceso | menú y permisos | — | — | 1 |
| Cobertura (todas) | — | — (borrador local de matrícula sin adjuntos) | todo | 1 (borrador) |
| Auditoría | — | — | todo | — |
| Roles/menús | — | — | todo | — |
| Establecimiento general/sedes/funcionarios/EE | sedes como catálogo | — | todo | 1 |
| Periodos académicos + tabs | catálogos proveedores (14 d) | — | todo | 1 |
| Informes | cascada, informe de grupo, planilla de informe | — | consolidar, observaciones, IA, rechazar, boletín, export | 1 |
| Referentes | sí | — | CRUD, export | 1 |
| Planeador actividades | sí | asistencia de actividad, estado de resultado, calificar, observar, soporte | aprobar, eliminar, import/export | 1–2 |
| Crear/editar actividad | catálogos + detalle | sí (saga) | — | 3 |
| Unidades | sí | crear/editar, ponderación, puntaje | ceder, eliminar | 1 / 4 |
| Vista previa recurso | parcial (blobs locales) | — | imágenes del servidor | 1 |
| Planilla | sí | celda, bulk, observar, soportes | vista previa de nota, export | 1–2 |
| Asistencia calendario | sí | marcar todos | — | 1–2 |
| Asistencia manual | sí | registrar, editar | — | 2 |
| Asistencia seguimiento | sí | editar registro | aprobaciones, export | 1–2 |
| Pendientes | sí | descartar/reintentar | — | 2 |


---

## 9. Casos borde

Formato: **Caso** → comportamiento esperado · mitigación.

### 9.1 Conectividad
1. **Red intermitente (flapping cada pocos segundos)** → el banner no parpadea · histéresis: offline→online requiere 2 heartbeats OK separados 3 s; online→offline inmediato solo con `offline` event o 2 fallas; banner con retardo de 1,5 s para aparecer.
2. **Portal cautivo (Wi-Fi del colegio con login)** → `navigator.onLine` true pero `/api/health` devuelve HTML/302 · el heartbeat valida `content-type: application/json` y un campo conocido; si no, `degraded`, texto extra "Puede que la red Wi-Fi requiera iniciar sesión."
3. **2G lento** → requests de 30 s · timeout 20 s, estado `degraded`, las escrituras van a la cola (ya lo son) y la UI no espera.
4. **Request llegó pero se perdió la respuesta** → al reintentar el gateway devuelve la respuesta guardada para esa `Idempotency-Key` · sin BE-1 el riesgo es menor de lo que parecía: `asistencias/registrar` es upsert y los PUT de calificar son idempotentes por naturaleza; los que **sí** duplican son los POST de creación (actividad, unidad, criterios de actividad, soportes multipart, matrícula).
5. **Respuesta llega después del timeout** → el cliente ya marcó retry · idempotencia; además el retry espera el backoff mínimo 2 s.
6. **Servidor caído (502 de Cloudflare / 1003)** → `degraded`, retry · mensaje "No pudimos comunicarnos con el servidor" en banner degradado (no culpa a la red del usuario).
7. **Online, pero el gateway responde 503 solo en eval-col** → heartbeat contra un endpoint de eval-col (BE-4), no solo el worker.
8. **VPN/proxy corporativo que bloquea `/api`** → mismo que 2.
9. **El usuario pone modo avión durante un upload grande** → upload falla, blob intacto, reintento completo · no hay subida reanudable (aceptado v1).
10. **Reloj de dispositivo cambia de red y de zona horaria** → `FECHA` capturada en hora local con offset ISO; backend interpreta en `America/Bogota`.

### 9.2 Autenticación
11. **Token de acceso vence offline** → irrelevante hasta volver la red; el procesador hace refresh antes de enviar.
12. **Cookie `sso_refresh` vence offline (sin "Mantener sesión")** → al volver: 401 → banner "Tu sesión expiró…", outbox intacta; tras login con el **mismo** `sub` se reanuda.
13. **Otro usuario inicia sesión en el mismo navegador con pendientes del anterior** → no se envían ops ajenas (verificación `sub`); aviso genérico al nuevo usuario; al volver el dueño, se reanudan; se purgan a los 30 días con aviso previo al dueño en su próximo login.
14. **Logout con cola** → diálogo §7.8.
15. **Contraseña cambiada mientras offline** → refresh puede seguir válido (depende del SSO) o 401 → caso 12.
16. **Cuenta desactivada** → refresh 401/403 → "requiere login"; login falla → ops quedan; exportar registro para soporte.
17. **Correo del usuario cambiado (sub distinto)** → el nuevo token trae otro `sub` ≠ `op.userSub` · pantalla de confirmación: "Estos cambios fueron hechos con la cuenta {email anterior}. ¿Enviarlos con tu cuenta actual?" (requiere que el backend identifique al funcionario por id, no por email; ver §14 P10). Relacionado con el commit `0a236aff`.
18. **Rol/menú cambiado mientras offline (pierde Planeador)** → al reconectar, refetch de `my-menus`; ops de un módulo ya no autorizado → 403 → rechazadas con mensaje; no se oculta la página de pendientes.
19. **Permisos `puedeEditar` persistidos dicen sí pero el servidor dice no** → igual que 18.
20. **403 por red caída durante el refresh** (B3) → ya no se trata como sesión vencida; queda `degraded`.
21. **Abrir la app offline sin haber iniciado sesión nunca en ese equipo** → login con aviso.
22. **Super administrador offline** → sin módulos offline útiles; se le muestra lo mismo (no se persisten vistas administrativas).

### 9.3 Datos
23. **Coordinador edita la misma calificación** → CAS → conflicto §7.7.
24. **Periodo cerrado mientras offline** → `RAISE` del backend → "No guardado" con el texto del servidor; acción "Copiar valores" para que el docente los tramite.
25. **Estudiante retirado** (matrícula retirar) → 404/RAISE → rechazado; el roster cacheado lo sigue mostrando hasta refetch, con badge "Datos del…".
26. **Actividad eliminada en el servidor** → 404 → rechazadas todas las ops de esa actividad (dependientes bloqueadas) con un único aviso agrupado.
27. **Catálogo cambiado (id de lista de valor desactivado)** → rechazo 400 · el payload guarda el **nombre** además del id para mostrar "El valor 'Rúbrica' ya no está disponible".
28. **Deploy cambia la forma de un payload** → `handlerVersion`; si hay migración, se migra al leer; si no, `rejected` "Este cambio se hizo con una versión anterior de la aplicación y no puede enviarse" + exportar.
29. **Deploy cambia la forma de una query persistida** → `SCHEMA_VERSION` en el buster invalida `queries`.
30. **Reloj del dispositivo atrasado/adelantado** → `createdAt` local solo para orden local; servidor sella su propio tiempo; `FECHA` de asistencia/calificación la elige el usuario (no el reloj) cuando aplica; validar que no esté en el futuro > 1 día ("La fecha de tu equipo parece incorrecta").
31. **Duplicados (doble clic offline)** → `enqueue` deduplica por `entityKey` + payload idéntico en < 2 s; coalescing.
32. **Misma celda editada dos veces offline** → coalescing, último valor, `BASE` del primero.
33. **Editar y luego eliminar** (planeador, fase 3+) → eliminar es SO; si se elimina online algo con ediciones pendientes, se pregunta "Tiene N cambios pendientes que se descartarán".
34. **Crear offline y luego editar el tmp** → fusión en el payload de crear.
35. **tmp id referido por otra op y la creación falla** → dependientes `bloqueada`; al descartar la creación se ofrecen descartar dependientes.
36. **Entidad creada offline aparece en listas** → capa optimista sobre `actividades-mias` y calendario; ordenada por fecha; badge "Pendiente"; no clickeable para acciones SO.
37. **Asistencia registrada para una sesión que ya registró otro docente (co-docencia)** → hoy `registrar` es upsert y el último pisa en silencio; con BE-5 (aprobado) el CAS por estudiante devuelve conflicto y se resuelve por fila.
38. **Regla 75 activa al sincronizar** → `done` con aviso de solicitud (no es error).
39. **Ponderaciones suman ≠ 100 tras sync** (fase 4) → el servidor rechaza; mostrar.
40. **Datos cacheados muy viejos (TTL vencido)** → se muestran con "Datos del …" en rojo y se bloquea **escribir** sobre ellos sin refetch: "Estos datos tienen más de 7 días. Conéctate para actualizarlos antes de calificar."
41. **Query cacheada de otro periodo académico** → el selector de periodo offline solo ofrece periodos con datos.
42. **Nota calculada por servidor diferente a la esperada** → se refleja tras invalidación; nunca se calcula en front.
43. **Bulk calificar 40 celdas offline** → 40 ops; sync con concurrencia 3; si 2 fallan, el resto queda guardado y el resumen dice "38 de 40".

### 9.4 Ciclo de vida de la app
44. **Pestaña cerrada a mitad de sync** → op `inflight` sin confirmación: al reabrir, `inflight` con `updatedAt` > 60 s vuelve a `retry`; idempotencia evita duplicado.
45. **Varias pestañas** → un líder; las otras reflejan estado vía BroadcastChannel; si el líder muere, el lock se libera y otra toma.
46. **Safari sin Web Locks (<15.4)** → lease en IndexedDB.
47. **SW nuevo durante sync** → prompt, no `skipWaiting` hasta terminar (§7.10).
48. **SW defectuoso en producción** → kill-switch §11.6.
49. **Almacenamiento borrado por el usuario** → se pierde la outbox · mitigación: `storage.persist()`, aviso en "Preparar…" ("No borres los datos del sitio si tienes cambios pendientes"), y al detectar base vacía con `lastUserSub` en `localStorage` (marca mínima) → aviso "Los datos guardados en este equipo se borraron. Si tenías cambios pendientes, se perdieron."
50. **Evicción por presión de almacenamiento (Chrome no persistente)** → igual que 49; por eso se pide persist y se sincroniza apenas haya red.
51. **Cuota excedida al encolar** → transacción falla → la mutación muestra error: "No hay espacio en este equipo para guardar el cambio sin conexión." y no limpia el formulario.
52. **Modo privado/incógnito** → IndexedDB existe pero se borra al cerrar; Firefox privado limita cuota · detectar (`estimate().quota < 120 MB` heurístico) y mostrar "Estás en una ventana privada: lo que guardes sin conexión se perderá al cerrarla."
53. **iOS Safari**: sin Background Sync, evicción de datos tras 7 días sin uso si no está instalada como PWA, SW a veces terminado · recomendación "Agregar a pantalla de inicio" en el diálogo de Preparar en iOS; sync solo con app abierta.
54. **Reinicio del equipo** → IndexedDB persiste; al abrir, sync.
55. **Recargar en una ruta `tmp:`** → la ruta resuelve desde outbox/idmap; si ya se resolvió, redirige al id real.
56. **Navegar a un chunk lazy no precacheado** → todos los chunks de `dist/` se precachean (tamaño actual a medir; si > 15 MB se excluyen chunks de vistas SO y Storybook no aplica).
57. **Error de lazy chunk tras deploy (hash viejo)** → el SW viejo sigue sirviendo los chunks viejos hasta actualizar (precache consistente) · ventaja del SW.
58. **MSW en entorno `dev`** → no se registra el SW de PWA (B12); la PWA se prueba en `test`.

### 9.5 Archivos
59. **Archivo grande (> 10 MB o > límite de la superficie)** → no se acepta offline (mensaje §0.4/§5.3).
60. **Archivo borrado del disco después de adjuntar** → el Blob ya está copiado en IndexedDB.
61. **Upload parcial** → no reanudable; se reintenta completo; el servidor descarta parciales.
62. **Blob subido pero op falla definitivamente** → archivo huérfano en servidor (BE-6 limpia).
63. **Tipo de archivo no permitido** (validado en `image-file.ts` y similares) → se valida al adjuntar, igual que online.
64. **Muchas fotos de soporte** → presupuesto de 150 MB / 60 archivos por usuario; aviso a 80 % (§0.4).

### 9.6 UX
65. **El usuario no nota que está offline** → banner persistente + badge por ítem + toast "Guardado en este equipo" en cada guardado.
66. **Ítems pendientes por días** → a las 24 h chip rojo en header "Tienes cambios sin enviar desde ayer"; a los 7 días diálogo al abrir.
67. **¿Cuánto tiempo offline se permite?** → lectura: hasta TTL duro (7 días para datos de grupo, 30 para catálogos); escritura: hasta 14 días desde la última autenticación online (`lastOnlineAuthAt`), luego no se aceptan ops nuevas (copy en §0.2; evita trabajo sobre permisos/carga académica obsoletos). **Aprobado: 14 días** (§0.2).
68. **El usuario cierra la pestaña con pendientes** → `beforeunload` solo si hay ops `inflight` (no por pendientes, que están a salvo).
69. **Mensajes de error del backend en inglés/técnicos** → `cleanErrorMessage` reusado.
70. **Accesibilidad** → banner `role="status"` (`aria-live="polite"`), errores `role="alert"`; badges con texto, no solo color.

### 9.7 Seguridad y privacidad
71. **Equipo compartido (sala de profesores)** → modo compartido (§5.4).
72. **Datos de menores** (nombres, documentos en roster) → se persiste solo nombre y pk necesarios para planilla/asistencia; **no** documento, acudiente, dirección, salud. Revisar mapeadores (`toXxx`) de queries `meta.offline` para recortar campos antes de persistir (`persistSelect`).
73. **Robo del equipo** → riesgo aceptado/mitigado por minimización + PIN opcional (§14 P5).
74. **XSS lee IndexedDB** → igual riesgo que hoy con la memoria; mantener CSP; no persistir tokens.
75. **Export del log** → no incluye blobs ni nombres de estudiantes si se elige "Exportar sin datos personales" (por defecto).

### 9.8 Reuso en PIGSE
76. `front_pigse` comparte stack → `lib/offline/*` se diseña sin dependencias de features (handlers registrados desde afuera) para copiarlo; no se modifica PIGSE sin pedido explícito.

### 9.9 Casos descubiertos al leer el código por vista

**Rutas, guard y menú**
77. **Guard de menú offline** (`router.tsx:380-398`) → `ensureQueryData` tira si `my-menus` no está hidratado · restaurar el persister **antes** de `router.load()`; si aun así falta, mostrar "Esta sección necesita conexión" en lugar del `ErrorPage`.
78. **`/app/pendientes` bloqueada por el guard** → no está en `my-menus` · agregarla a `isAlwaysAllowedPath` (`router.tsx:381`).
79. **Menú persistido viejo manda a `sin-acceso`** una pantalla recién asignada → copy extra en sin-acceso (§8.2).
80. **QR del boletín abierto en un equipo con la PWA instalada** → el SW responde el shell y `/verificar/b` hace `fetch` sin credenciales · nunca se cachea la respuesta; sin red, copy de §8.1. Si el SW interceptara `/api/*verificacion*` por error, se mostraría un estado viejo: test E2E explícito.

**Planeador**
81. **Saga de editar actividad: el orden real difiere de CLAUDE.md** (evidencias dentro del PUT, estudiantes antes de adaptaciones) → el handler copia `planeador-editar-actividad-page.tsx:255-366`; test que compare el orden de requests online vs outbox.
82. **`recursosOmitidos`** devuelto por materiales (`planeador-crear-actividad-page.tsx:154`) → hoy se avisa en pantalla; en la outbox se guarda en `lastResult` y se muestra en el resumen: **"Se guardó la actividad, pero {n} recursos no se pudieron adjuntar."**
83. **Criterios con `allSettled`** → algunos entran y otros no · cada criterio es una op hermana; los rechazados quedan "No guardado" sin bloquear el resto.
84. **Periodo de evaluación cerrado mientras el docente estaba offline** → el `estado` cacheado decía abierto; el servidor responde `solicitudes_pendientes` · la op termina `done` con aviso **"El periodo se cerró antes de sincronizar: tus cambios quedaron como solicitud al coordinador."** (no es error).
85. **Bulk de planilla con periodo cerrado** → la página hoy infiere si se creó solicitud (`calificar-actividad-bulk.tsx:239-249`) · el handler usa la misma lógica con el estado del servidor al enviar, no el cacheado.
86. **Vista previa de nota (`/calificar/vista-previa`) offline** → no hay cálculo local · popover con "La nota se calculará al sincronizar."
87. **Resolvers de catálogo en el guardado** (`resolveCalculoDefinitivaId`, `recuperacion-body.ts:31-40`, instrumento "Otro" `update-instrumento-actividad.ts:198-208`) → todos deben leer cache persistido; si falta, bloqueo con copy de §8.8.
88. **Cambio de método de cálculo de unidad (Regla 28)** → el servidor reconvierte pesos de actividades que el docente puede estar editando offline · con BE-3B, las ops de ponderación/puntaje con versión vieja dan 409 → conflicto.
89. **Ponderación > 100 %** por trigger `tr_tactividad_ponderacion_unidad` → `rejected` con el `RAISE`; el clamp del front suma todos los grupos (§15) y puede no coincidir.
90. **`blob:` URLs en el borrador de sessionStorage** → mueren al recargar o cerrar · `drafts` guarda el Blob.
91. **Soporte de planilla aún no subido (`tmp:`) que se quita o se marca favorito** → se resuelve localmente sin red (se descarta la op de subida o se ajusta su payload).

**Asistencia**
92. **`registrar` es upsert** → reintento no duplica pero pisa · por eso BE-5 con CAS.
93. **Registrar pendiente + corrección del mismo estudiante** → se fusiona en el `REGISTROS` del registrar (no hay pk todavía para PATCH).
94. **"Marcar todos" offline** → el resultado depende de quiénes ya tenían registro en el servidor · sin optimista por estudiante; el resumen informa cuántos se marcaron (`afectados`).
95. **409 `CK_TASISTENCIA_CONTEXTO`** (sin ASIGNATURA ni ACTIVIDAD) → `rejected`, no `conflict` (§6.4 distingue por SQLSTATE/constraint, BE-8).
96. **Preescolar (sesión formativa)** → la op lleva `ACTIVIDAD` y nunca `BLOQUE`; si la actividad es `tmp:` (fase 3) la op depende de su creación.

**Cobertura y establecimiento**
97. **Matrícula: falla a mitad de la saga** → cuentas creadas sin matrícula; reintento las reusa (busca por documento) · copy de §8.3.
98. **Borrador de matrícula con config de campos vieja** → revalidar con la config fresca al reabrir.
99. **Funcionario cambia su propio correo** con outbox pendiente → el modal cierra la sesión (`dialog-manage.tsx:741-744`); antes de cerrar debe aplicar el diálogo de logout con pendientes (§7.8) y C-17.
100. **Agregar EE con rector/secretaria** → compensación con `allSettled` que puede fallar; SO, solo se documenta.

**Auditoría / informes**
101. **`NoticeProvider` suprime el toast global** (layouts `_audits`, `_establishment`, tabs de periodos) → las páginas deben pintar el estado offline por sí mismas.
102. **Boletín descargado offline** → no se puede (lo genera el servidor y lleva QR) · botón deshabilitado con copy de §8.7.

---

## 10. Cambios de backend

| ID | Cambio | Dónde | ¿Esquema? | Aprobación | Fase |
|---|---|---|---|---|---|
| BE-1 | Middleware de **Idempotency-Key** en gateway: guarda `(sub,key,method,path,bodyHash) → status,headers,body` 72 h en Redis; misma key + body distinto → 422 | gateway | No (Redis) | Técnica | 2 (obligatorio antes de habilitar E) |
| BE-2 | CAS por valor en `fn` de calificar/estado/observación: parámetro opcional `BASE` (JSON previo); si difiere → `RAISE` con SQLSTATE dedicado → 409 + valor actual | funciones SQL eval-col (migración existente que posee la función, sin nueva migración duplicada) | No | Técnica | 2 |
| BE-3 | CAS para actividad/unidad: **opción B (aprobada)** columna `VERSION`/`UPDATED_AT` en `TACTIVIDAD` y `TUNIDAD`, validada en `fn` de update y en los PUT de materiales/adaptaciones/instrumento/ponderación/puntaje (respuesta incluye la nueva versión) | eval-col (ajustando la migración que posee cada tabla) | **Sí** | **Aprobada (§0.1)**; PR separado, revisión antes de merge | 3 |
| BE-4 | `GET /eval-col/health` liviano y sin auth (o `HEAD`) para heartbeat | eval-col/gateway | No | Técnica | 0 |
| BE-5 | Índice único en asistencia por (estudiante, grupo, contexto ASIGNATURA/ACTIVIDAD, fecha, bloque) + `registrar` con CAS opcional por estudiante (`BASE_TIPO`) que devuelve conflicto estructurado en lugar del upsert silencioso actual (V138) | SQL (migración que posee `TASISTENCIA`) | **Sí (índice)** | **Aprobada (§0.1)**; PR separado; antes del índice, script de detección de duplicados existentes | 2 |
| BE-6 | Limpieza de archivos huérfanos > 7 días | file-service | No | Técnica | 3 |
| BE-7 | Exponer `X-Server-Time` en respuestas (detección de clock skew) | gateway | No | Técnica | 2 |
| BE-8 | Códigos de error estables (SQLSTATE/`code`) para "periodo cerrado", "estudiante retirado", "fuera de ventana" para clasificar sin parsear texto | SQL | No | Técnica | 2 |
| BE-9 | CORS/cookies: nada (mismo origen vía Worker) | — | — | — | — |
| BE-10 | Worker: no cachear `/api`; agregar `Cache-Control: no-store` a respuestas `/api` para que nada intermedio las guarde | `worker/index.js` | No | Técnica | 0 |

---

## 11. Fases

### Fase 0 — Resiliencia (sin offline aún) · 2–2,5 semanas
Tareas:
1. `getUser()` distingue 401 de error de red; `hasSession` no redirige por red (usa usuario persistido mínimo o reintenta con backoff 3×) — `lib/auth.ts`.
2. 403 + refresh fallido **por red** ≠ sesión vencida — `api-client.ts:284-293`.
3. `timeout` axios (20 s / 120 s multipart); `isNetworkError`; supresión de toasts de red (uno por estado) — `api-client.ts`.
4. `connectivity.ts` + banner offline/degradado (sin cola).
5. `retry` para queries: `(count, err) => isNetworkError(err) && count < 2`; `networkMode: "online"` explícito.
6. Corregir los huecos de invalidación de §15 (B13 ya está corregido en `dev`; `asistenciaManualSearchSchema` ya tiene `.catch`, se retira) y agregar `/app/pendientes` a `isAlwaysAllowedPath`.
7. BE-4, BE-10.
8. Idempotency-Key generada en el cliente para todas las mutaciones (header ignorado hasta BE-1).
Aceptación: con DevTools "Offline" y recarga en `/app/planeador/actividades`, **no** se va a login (muestra error de red con reintentar); 403 con red caída no limpia cache; 0 toasts de "Network Error" repetidos.
Rollback: revert de PR (sin estado persistido).

#### Cierre de la Fase 0 (2026-10)
Estado: **implementada en `dev`**; falta solo la validación manual en `test` (DevTools Offline / Slow 3G, tarea 9.2 de `add-offline-resilience`).

Qué salió y en qué PR:
- **#683** (front) — specs OpenSpec del plan (`openspec/changes/add-offline-*`).
- **#684** — sesión y cliente HTTP: `getUser()` distingue 401/403 de red (`NetworkSessionError`), `hasSession` reintenta 1 s/2 s/4 s, el guard de `/app` pinta "No pudimos comunicarnos con el servidor" + "Reintentar" en vez de mandar a `/login`; 403 con refresh caído por red no limpia cache; timeouts 20 s / 120 s multipart; `isNetworkError`; sin toasts de red; `Idempotency-Key` en mutaciones; `retry` solo de red y `networkMode: "online"`.
- **#685** — `lib/offline/connectivity.ts` (heartbeat, histéresis, portal cautivo), `useConnectivity`, `OfflineBanner` e íconos.
- **#686** — invalidaciones X1/X2 del planeador, `Cache-Control: no-store` en `/api` del Worker (BE-10), `/app/pendientes` en `isAlwaysAllowedPath`, `pnpm test:unit` en CI.
- **sso #683** — `GET /eval-col/health` sin auth (BE-4).
- **PR de cierre** — E2E Playwright (`pnpm test:e2e`, `e2e/offline-resilience.spec.ts`) y dos ajustes que salieron de correrlos: el `ensureQueryData` de `hasSession` va con `retry: false` (el retry por defecto multiplicaba el backoff y dejaba ~20 s en blanco) y `networkMode: "always"` en la sesión y el menú del guard (con el store en `offline` la query quedaba pausada para siempre en vez de llegar al `ErrorPage`).

Desvíos respecto del plan:
- **Recarga con el navegador realmente offline**: sin app shell no hay `index.html` que servir (B7), así que la aceptación "recargar con DevTools Offline no va a login" solo se cumple cuando la página carga y la API no responde (portal cautivo, gateway caído, red que cae durante el arranque). El **app shell con Service Worker pasa a la Fase 1** (`add-offline-reads`), como ya estaba en su alcance.
- Tarea 1 del plan: se eligió reintentar con backoff 3× (sin usuario persistido mínimo, que llega con la sesión persistida de la Fase 1).
- E2E: MSW responde desde el navegador, así que ni `page.route` ni `context.setOffline` cortan la API mockeada. La caída de la API se simula con `sessionStorage["msw:fault"] = "network" | "server"` (handlers de `src/mocks/browser.ts`); `context.setOffline` se usa para el evento `offline` y el banner. **No** se agregó a CI: necesita levantar Vite + Chromium y depende de timers reales (backoff de 7 s, histéresis de 3 s), ~1,5 min y propenso a flakes; se corre a mano antes de promover.
- Port a PIGSE (8.2): solo documentado en `lib/offline/README.md`; se hace a pedido.

### Fase 1 — Lectura offline · 3–4 semanas
Tareas: `vite-plugin-pwa` (`injectManifest`, prompt de actualización, sin `/api`), manifest e íconos; `db.ts`; persister selectivo por usuario con buster; `meta.offline` en ~40 queries (planeador, planilla, asistencia, referentes, catálogos de academic-period); `session` persistida + `hasSession` offline; sidebar offline; `useOnlineOnly` en todas las vistas SO; "Preparar para usar sin conexión"; limpieza en logout/cambio de usuario; modo equipo compartido; minimización de campos persistidos.
Aceptación: tras preparar, en modo avión y recargando, se navega planeador/planilla/asistencia/referentes con datos y badge de fecha; vistas SO muestran empty state; logout borra todo (verificado en DevTools → Application); otro usuario no ve datos del anterior.
Métricas go/no-go: tamaño promedio persistido < 20 MB; tiempo de hidratación < 300 ms p95; 0 errores de SW en 1 semana de `test`.

#### Cierre de la Fase 1 (2026-10)
Estado: **implementada en `dev`**; change `add-offline-reads` archivado. Falta la validación manual multi-navegador (tarea 6.4: Chrome Android, Safari iOS, Chrome Windows, Firefox) y medir las métricas go/no-go en `test`.

Qué salió y en qué PR:
- **#691** — `ce-offline` (`db.ts`), persister selectivo por usuario con buster, `session` persistida, `hasSession` offline, "Continuar sin conexión como…", modo equipo compartido, limpieza en logout/cambio de usuario.
- **#693** — `meta.offline` en las lecturas (con `persistSelect` para estudiantes), `useOnlineOnly`, `OnlineOnlyRouteGate`, badge "Datos del …", diálogo "Preparar para usar sin conexión".
- **#692** — Service Worker de app shell (`injectManifest`), manifest, aviso de nueva versión, kill-switch (`VITE_APP_OFFLINE` + flag remoto + build de emergencia, `docs/offline/KILL-SWITCH.md`).
- **PR de cierre** — E2E `e2e/offline-reads.spec.ts` (6.2/6.3) y 6.3 en `e2e/pwa/app-shell.spec.ts`, más ajustes que salieron de la revisión de escenarios:
  - Logout sin red (§7.8): el POST fallido por red se trata como logout local y la mutación va con `networkMode: "always"` (antes quedaba pausada y no limpiaba IndexedDB).
  - `/verificar/b` sin red: `networkMode: "always"` (antes quedaba en "Verificando…") y el copy "No pudimos verificar el boletín porque no hay conexión…".
  - Referentes curriculares: la tabla muestra los datos restaurados en vez del error cuando el refetch falla, y la ruta cuenta como legible offline para el banner.
  - `useOnlineOnly` en: crear/editar referente, crear/editar/ceder/eliminar unidad, aprobar/rechazar cambios de asistencia y editar seguimiento.
  - `data-slot="offline-banner"` en el banner (los E2E lo confundían con otros `role="status"`).

Desvíos y pendientes:
- **E2E en dos mitades**: el SW no se registra con MSW (spec "Convivencia con MSW"). Los DATOS (preparar → sin red → recargar → navegar, equipo compartido, logout, cambio de usuario, vistas solo en línea) se prueban contra el dev server con `msw:fault = "network"`; el SHELL (recarga con el navegador realmente offline, `/verificar/b`) contra el build de `playwright.pwa.config.ts`, que no tiene backend y no puede iniciar sesión.
- ~~"Preparar" sin selección ni archivos ni botón en el header~~ **Cerrado (PR de gaps F1)**: el diálogo deja elegir grupos, asignaturas y periodos (defaults: todos los grupos/asignaturas del docente y el periodo vigente, por fechas) y "Incluir archivos". Descarga catálogos, `matriculas-grupo` de cada grupo y columnas + calificaciones de cada grupo × asignatura (del mismo grado) × periodo con los mismos params/keys que la Planilla; con archivos, los soportes de cada celda con evidencias y el contenido (≤ 5 MB) a Cache Storage `ce-offline-archivos` (`lib/offline/file-cache.ts`), que `useArchivoViewUrl` usa como respaldo sin red (`networkMode: "always"`); la cache se borra con `setDeviceMode("compartido")` y `clearUserData`. Botón "Preparar sin conexión" en el header de Planeador (actividades, unidades, planilla) y Asistencia. Los rosters por sesión de Asistencia (`["asistencia","sesion-estudiantes",params]`, dependen de fecha/bloque) siguen entrando solo por "lo ya abierto".
- ~~Pertenencia al piloto no validada~~ **Cerrado**: no hay rol ni permiso de menú de piloto en el backend (agregarlo sería cambio de esquema), así que es configuración de build `VITE_APP_OFFLINE_PILOT` (correos y/o roles del JWT separados por comas; `*` = todos; vacío = nadie, default). Antes del login se habilita el checkbox por correo escrito (o si la lista tiene roles/`*`); después, `isOfflinePilotUser` con el token y, si no es del piloto, el equipo vuelve a "compartido" (`lib/offline/pilot.ts`). Para el piloto real hay que cargar la lista en el `ENV_FILE` de `test`/`production`.
- ~~Escrituras sin `useOnlineOnly`~~ **Cerrado**: activar/inactivar y eliminar referentes (y el modal de alto impacto), enunciados/evidencias (crear, editar, eliminar), calificar celda/en bloque/aprobación, vista previa de nota de periodo cerrado, "Guardar" de solicitud, observaciones/evidencias/favorita, "No presentó" y asistencia de la actividad, aprobar/declinar del coordinador, eliminar/vincular/desvincular actividades, ponderación/puntaje, criterios de unidad, exportar/importar JSON, y registrar/editar/marcar todos en Asistencia (calendario y registro manual). Son las que la Fase 2 pasará a la outbox.
- El docente fixture del mock no tiene Cobertura ni Referentes en su menú: sin red cae a `sin-acceso` con el aviso de menú viejo (escenario cubierto); el empty state "Esta sección necesita conexión" se prueba con el administrador.
- Port a PIGSE (7.1): solo documentado; `lib/offline/*` sigue sin dependencias de features.

### Fase 2 — Escrituras piloto (asistencia + planilla) · 4–5 semanas
Tareas: outbox (enqueue, procesador, backoff, clasificación, líder, BroadcastChannel), blobs, handlers `asistencia.registrar/editar`, `planilla.calificar/estado-resultado/observacion/soporte`, `actividad.asistencia`; capa optimista reaplicable; `/app/pendientes`; resolución de conflictos; indicador header; logout con pendientes; BE-1, BE-2, BE-5 (aprobado, PR propio), BE-7, BE-8; handlers adicionales `planilla.calificar-bulk`, `planilla.soporte-quitar/favorito`, `actividad.estado-resultado`, `asistencia.marcar-todos`; absorción de la cola en memoria de periodo cerrado (B16); log exportable.
Aceptación (Playwright): calificar 40 celdas offline, cerrar y reabrir, volver online → 40 en servidor, sin duplicados; matar la respuesta de 1 request (route.abort tras enviar) → no duplica; conflicto simulado muestra diálogo; regla 75 notifica.
Go/no-go: piloto con 3–5 docentes 2 semanas (única población con escritura offline mientras P6 siga pendiente, §0.3); tasa de `rejected` < 1 %, 0 pérdidas reportadas, 0 duplicados en auditoría.

#### Estado de la Fase 2 (2026-10)
En PR (sin mergear). Front: outbox en `src/lib/offline/outbox/` (online-first D-F2-7, FIFO por entidad, backoff, líder por Web Locks, Background Sync, blobs de soportes de asistencia, log exportable), handlers de asistencia (registrar, editar, marcar todos) y planilla (calificar, bulk, observación, estado de resultado, asistencia de la actividad), `/app/pendientes`, indicador del header, banner de cola, conflictos y logout con pendientes. Backend (sso): CAS por estudiante en asistencia sobre `MODIFIED_AT/CREATED_AT` (sin columnas nuevas; el índice único ya existía en V139), SQLSTATE `CE409`/`CE422` → 409 `OFFLINE_CONFLICT` / 422 `PERIODO_CERRADO`. Segunda tanda: BE-1 (Idempotency-Key en el gateway sobre Redis, TTL 15 días, fail open), BE-2 (CAS de calificar con versión por celda), BE-7 (`X-Server-Time`), soportes de planilla en la outbox, solicitud de periodo cerrado encolada y E2E de 40 celdas y dos pestañas. Pendiente: métricas del piloto y CAS de la observación.

### Fase 3 — Sagas del planeador · 3–4 semanas
Tareas: extraer orquestación de `planeador-crear-actividad-page.tsx` / `planeador-editar-actividad-page.tsx` a handler con expansión en ops dependientes (beneficia también online: reanudable); ids `tmp:`; idmap; drafts en IndexedDB; manejo de reemplazo total con `fkTarchivo` (refetch del detalle antes de armar el PUT); resolvers de catálogo desde cache; BE-3 opción B (aprobada, PR propio), BE-6.
Aceptación: crear actividad con 2 recursos con imagen + rúbrica + adaptaciones offline, reiniciar el equipo, reconectar → todo creado una vez, en orden, archivos presentes.

### Fase 4 — Resto (opcional) · 2–3 semanas
Unidades crear/editar/ponderaciones offline; observaciones de informes (si P8); cache de imágenes de recursos; métricas finas.

#### Cierre de la Fase 4 (2026-10)
Estado: **implementada** (change `add-offline-rest` archivado). Outbox para referentes curriculares (enunciados/evidencias CRUD, activar; inactivar sigue en línea por la consulta de impacto) y observaciones de informes escritas a mano (P8 resuelta solo para la edición manual; IA sigue en línea). Solo consulta sin red: periodos/horario/asignaciones e historial del informe. Administración sigue solo en línea. Unidades/ponderaciones, cache de imágenes y telemetría quedan en backlog. Cierre: `pnpm test:e2e:matrix` (Chromium/Firefox/WebKit), [CHECKLIST-MULTINAVEGADOR.md](CHECKLIST-MULTINAVEGADOR.md), [GO-NO-GO.md](GO-NO-GO.md), [PORT-PIGSE.md](PORT-PIGSE.md).

#### Cargas infinitas sin conexión (2026-10)
Reporte de testv2: sin red, lo no preparado quedaba en skeleton/spinner para siempre. Causa: con `networkMode: "online"` una query sin datos queda `pending`/`paused` hasta que vuelva la red (y las mutaciones, en "Guardando…"); solo Informes y Planilla lo detectaban (`isOfflineWithoutData`). Arreglo **global** (detalle y decisión en [AUDITORIA-RUTAS.md](AUDITORIA-RUTAS.md#cargas-infinitas-sin-conexión-sin-haber-preparado)):
- `OfflineAwareQueryClient`: `networkMode` por query — sin datos `"always"` (falla al instante sin red), con datos `"online"` (el refetch se pausa, se sigue viendo lo guardado). `retry` no reintenta sin red; mutaciones con `networkMode: "always"`. Reemplaza el `networkMode: "online"` explícito de la Fase 0 (tarea 5).
- `"offlineFirst"` como default global: **evaluado y descartado** (sus reintentos se pausan igual sin red, y un refetch sin red de una query con datos la deja en `error` y las pantallas esconden lo guardado; rompería la capa optimista de la outbox).
- Mensajes: `getErrorMessage` / `ErrorPage` / `NetworkSessionError` dicen "Sin conexión: esta información no está guardada en este equipo" (lectura), "esta acción necesita internet" (escritura) o el aviso de sesión.
- Componentes compartidos: `useOfflineStall` (1,5 s sin red), `DataTable`, `Skeleton`, `Spinner`, `LoadingLabel`, `Select`, `ComboboxField`; banner con "Parte de esta pantalla no está guardada en este equipo" (`lib/offline/missing-data.ts`).
- E2E `e2e/offline-sin-preparar.spec.ts`: todas las rutas no administrativas sin Preparar, sin indicadores de carga a los 3 s y con aviso claro.

### 11.6 Kill-switch y rollback
- **Flag remoto**: `GET /api/eval-col/config/offline` (o el `ENV_FILE` del deploy, `VITE_APP_OFFLINE` = `off|read|full`) consultado al arrancar online y guardado en `meta.killSwitch`. `off` → no se persiste, la outbox solo envía (no acepta encolar offline), se muestra solo banner.
- **Flag por feature**: `meta.offline` y handlers se registran solo si `offlineFeatures.includes("planilla")` etc.
- **SW autodesregistrable**: build de emergencia con `sw.ts` que hace `self.registration.unregister()` + borra caches + `clients.navigate` (patrón "kill switch SW"); se despliega con `wrangler deploy` normal. Nunca se borra IndexedDB desde el kill-switch (preserva la outbox); la app sin SW sigue sincronizando.
- Rollback de Worker: `wrangler rollback` (CLAUDE.md §9) **no** deshace el SW instalado → por eso el SW se publica con `Cache-Control: no-cache` en `/sw.js` y el kill-switch es el camino.

### 11.7 Estimación
| Fase | Front | Backend |
|---|---|---|
| 0 | 2–2,5 sem | 1–2 días |
| 1 | 3–4 sem | — |
| 2 | 4–5 sem | 1,5–2 sem |
| 3 | 3–4 sem | 3–5 días |
| 4 | 2–3 sem | — |
| **Total** | **14–18,5 sem** | **~2,5–3 sem** |

---

## 12. Plan de pruebas

| Nivel | Herramienta | Qué |
|---|---|---|
| Unitario | Vitest (nuevo proyecto `unit`, node + `fake-indexeddb`) — hoy no hay script `test`; se agrega `pnpm test:unit` | backoff, classify, coalesce, DAG/orden, idmap remap, guard `tmp:`, persister selectivo, buster, limpieza por usuario, migración de `handlerVersion`. |
| Integración | Vitest + MSW con fallas (`HttpResponse.error()`, `delay("infinite")`, 409/422/503) | procesador completo, refresh antes de flush, 401 pausa, 403 permiso, regla 75. |
| E2E | Playwright (`context.setOffline`, `page.route` abort tras enviar, dos pestañas, `context.clearCookies`) | escenarios de aceptación de cada fase, multi-pestaña, cambio de usuario, actualización de SW durante sync. Ninguna carga infinita sin conexión sin haber preparado (`e2e/offline-sin-preparar.spec.ts`) y todas las rutas con datos tras preparar (`e2e/offline-all-routes.spec.ts`). |
| Manual | Checklist en dispositivos: Chrome Android de gama baja, Safari iOS (instalada/no), Chrome Windows, Firefox | quotas, privado, evicción. |
| Backend | colección Postman con Idempotency-Key repetida, CAS | BE-1/2/5. |
Fase 0 incluye agregar el script `test:unit` y CI en `ci.yml`.

---

## 13. Métricas

Registradas en el ring log y, si se aprueba, enviadas en lote a un endpoint `POST /eval-col/telemetria/offline` (sin datos personales): ops encoladas/enviadas/rechazadas/conflicto por kind, tiempo en cola p50/p95, intentos promedio, tamaño de IndexedDB, tiempo de hidratación, frecuencia de estados degradado/offline, versiones de SW activas. Go/no-go por fase en §11.

---

## 14. Preguntas abiertas

| # | Pregunta | Propuesta por defecto |
|---|---|---|
| P1 | ¿Qué perfiles necesitan offline? ¿Solo docentes? | Solo docentes (planeador, planilla, asistencia). |
| P2 | ~~Ventana máxima de escritura offline sin reautenticar~~ | **Resuelta: 14 días** (§0.2). |
| P3 | ¿Aceptan que la sync ocurra solo con la app abierta (no en segundo plano real)? | Sí. |
| P4 | ~~¿Se aprueban cambios de esquema BE-3B/BE-5?~~ | **Resuelta: aprobados**, en PRs separados revisados antes del merge (§0.1). |
| P5 | ¿Cifrado con PIN offline o solo minimización + modo compartido? | Minimización + modo compartido; reevaluar al cerrar P6. |
| P6 | **¿Hay política institucional sobre datos de menores en equipos personales?** | **PENDIENTE — bloqueador** para habilitar escrituras offline fuera del piloto. Mientras tanto: modo compartido por defecto (§0.3). |
| P7 | ¿Matrícula necesita lectura offline (lista)? | No. ¿Se acepta el **borrador local sin adjuntos** de agregar/editar matrícula, o también debe esperar a P6? (propuesta: esperar a P6; solo piloto) |
| P8 | ¿Observaciones cualitativas de informes editables offline? | No en v1 (además, docentes solo consultan informes: `reports-page.tsx:418-421`). |
| P9 | ~~Límite de tamaño de archivo de soporte~~ | **Resuelta: 10 MB offline**, 150 MB / 60 archivos por usuario (§0.4). |
| P10 | ¿Las ops se identifican por funcionario (pk) o por email (`sub`)? Afecta cambio de correo | Por `sub`, con confirmación si cambia. |
| P11 | ¿Se permite telemetría anónima? | Sí, opt-out. |
| P12 | ¿Instalar como PWA (manifest, "Agregar a inicio")? | Sí. |
| P13 | ¿Kill-switch por backend (endpoint config) o por variable de build? | Ambos. |
| P14 | ¿Quién atiende conflictos: el docente o se notifica al coordinador? | El docente. |
| P15 | Con BE-5, ¿qué gana en asistencia cuando choca el docente con el coordinador? ¿Siempre conflicto manual, o el coordinador prevalece? | Conflicto manual por estudiante (§7.7). |
| P16 | ¿El índice único de asistencia incluye `BLOQUE` (dos bloques del mismo día) y cómo se trata preescolar (`ACTIVIDAD`, sin bloque)? ¿Hay duplicados históricos que limpiar antes del índice? | Incluye bloque; `COALESCE(bloque,0)`; script de detección previo. |
| P17 | ¿Se permite **"Marcar todos"** offline, dado que su efecto depende del estado del servidor al sincronizar? | Sí, con el copy de §8.9; sin optimista por estudiante. |
| P18 | Recursos de actividad de 10–20 MB: ¿se acepta que offline solo admitan hasta 10 MB? | Sí (§0.4). |
| P19 | ¿Se mantiene el orden real de la saga de editar actividad (estudiantes antes que adaptaciones, evidencias dentro del PUT) o se alinea con CLAUDE.md? | Mantener el real y corregir CLAUDE.md §6. |
| P20 | `/verificar/b` es pública: ¿alguna objeción a que el SW de la PWA también sirva su shell (no sus datos)? | No; el shell es el mismo bundle. |

---

## 15. Bugs encontrados de paso

No son del alcance offline, pero varios afectan la sincronización (dependemos de invalidar bien). Se corrigen en Fase 0 o se reportan aparte.

| # | Bug | Evidencia | Efecto |
|---|---|---|---|
| X1 | Las **tabs de unidades** (`unidades.tabs(alcance)`) no se invalidan al crear/eliminar unidad | `api/query-keys.ts:121` vs `create-unidad.ts:87` / `delete-unidad.ts:37` (invalidan `unidades.all`) | Una tab nueva (referente) no aparece hasta que vence el `staleTime` de 5 min. |
| X2 | Calificar celda, bulk y observar **no invalidan `actividad.calificaciones(id)`** | `use-calificar-celda.ts:96-98`, `use-calificar-bulk.ts:93`, `use-observar-estudiante.ts:55-57` (solo planilla y nota) | El `ActividadDetallePanel` en `?modo=grades` muestra la nota vieja tras calificar desde la planilla (y tras sync). |
| X3 | Creación de evidencias de referente usa `apiPath(..., "")` | `curricular-references/api/mutations/use-statement-mutations.ts:157` | En real postea a `/eval-col` sin path. |
| X4 | Rutas de `_establishment` registradas dos veces en `routeTree` | `router.tsx` (`routeTree`, bajo `appLayoutRoute` y bajo `establishmentLayoutRoute`) | Ya conocido (CLAUDE.md §4); duplica el match y puede saltarse el `NoticeProvider`. |
| X5 | Clamp de ponderación suma actividades de **todos los grupos** | `columns-unidad-actividades.tsx:54-59` | El tope del front no coincide con el trigger por (unidad, grupo). |
| X6 | Export de matrícula, reservas, pre-matrícula e inscritos solo existen en MSW | `coverage/api/mutations/export-selected-matricula.ts:13` y `/coverage/*` | Fallan en test/producción con o sin red. |
| X7 | CLAUDE.md §6 describe un orden de saga de actividad que no es el del código | §8.8 de este plan | Riesgo de implementar el handler con el orden equivocado. |
| X8 | `use-sedes-opciones-query.ts:9` con `staleTime: 0` siendo un catálogo | asistencia | Refetch innecesario; offline debe persistirse igual. |
