# CLAUDE.md

Guía para Claude Code (claude.ai/code) y cualquier agente que trabaje en este repo. Prioriza lo **no obvio**: contratos con el backend, trampas y qué patrón copiar cuando conviven varios.

---

## 1. Comandos

Gestor de paquetes: **pnpm** (fijado a `11.25.0` en CI; `package.json` no declara `packageManager`). Node 24 en CI.

```bash
pnpm install                # dependencias
pnpm dev                    # Vite en :5173 (proxy /api → VITE_APP_API_PROXY_TARGET, default http://localhost:8080)
pnpm build                  # tsc -b && vite build  (variables/params sin usar ROMPEN el build)
pnpm exec tsc -b --noEmit   # typecheck solo (lo que corre CI)
pnpm lint                   # oxlint
pnpm format                 # oxfmt . — aplicalo solo sobre archivos que edites mucho
pnpm preview                # sirve el build
pnpm storybook              # Storybook en :6006
pnpm build-storybook
pnpm test-storybook         # tests de interacción/a11y contra Storybook ya levantado en :6006
pnpm test-storybook:ci      # sirve storybook-static + espera + corre test-runner
```

- **No hay script `test` de unidad.** Vitest está configurado con un único proyecto `storybook` (browser mode, Playwright Chromium, `vite.config.ts`). Existen algunos `*.test.ts` sueltos (`components/search/query-syntax.test.ts`, tests de handlers MSW en `establishment/{campuses,employees,institution}`, `administration/roles-menus/api/types/role-menu.test.ts`, `planeador/lib/recurso-preview.test.ts`) pero ningún script de npm los corre.
- Test puntual de Storybook: `pnpm test-storybook -t "<nombre>"`.
- `pnpm format:check` falla en ~todo el repo (nunca pasó por oxfmt): **no es gate** y no asumas que el código existente está formateado.
- Antes de dar algo por terminado: `pnpm exec tsc -b --noEmit` y `pnpm lint`.

---

## 2. Stack

- React 19 + TypeScript 6 + Vite 8, **React Compiler activo** (`@rolldown/plugin-babel` + `reactCompilerPreset`): no agregues `useMemo`/`useCallback` por reflejo.
- **TanStack Router** (code-based, no file-based) · **TanStack Query** (todo estado de servidor) · **TanStack Form** · **TanStack Table**.
- UI: shadcn estilo **`base-sera` sobre Base UI (`@base-ui/react`), NO Radix** · Tailwind v4 CSS-first · sonner (toasts) · zod v4 · date-fns · axios · MSW.
- Alias `@/*` → `src/*`. Se usa el alias incluso dentro del mismo feature.

### TypeScript (`tsconfig.app.json`)
- **Sin `"strict": true`** → `strictNullChecks` apagado. No confíes en que el compilador te avise de `null`/`undefined`.
- Activos: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` (**prohibido `enum`, `namespace`, parameter properties** — usá uniones de literales / objetos `as const`), `verbatimModuleSyntax` (**usá `import type`** para tipos), `noFallthroughCasesInSwitch`.

### Estilo de código
- oxfmt: **sin punto y coma**, comillas dobles.
- oxlint: `react/rules-of-hooks` es error; `react/only-export-components` warning (con `allowConstantExport`).
- **Todo texto de UI, mensajes de error y comentarios en español.** Identificadores mayormente en inglés, pero los términos de dominio sin traducción limpia quedan en español (`sede`, `jornada`, `matricula`, `planilla`, `enunciado`…). Rutas y claves de permisos en español.
- Los comentarios del repo son largos y explican el **porqué** (citan migraciones del backend `V488`, `id_query`, colecciones Postman). Mantené ese estilo cuando la razón no sea obvia.
- Componentes como **named exports** (el router los carga por nombre).
- **Nombres de archivos y carpetas de `src/` en kebab-case**: todo en minúsculas y guiones, sin guiones bajos ni mayúsculas (`form-user-details.tsx`, `ui/stories/`, `caras/02-muy-feliz/02-muy-feliz-verde.png`). Aplica también a mocks, assets y helpers.

---

## 3. Estructura

```
src/
  main.tsx          # arranca MSW (si corresponde) y luego renderiza
  provider.tsx      # QueryClient → Theme → Tooltip → RouterContextProvider (+ <Toaster/>)
  router.tsx        # TODAS las rutas (≈960 líneas)
  index.css         # tokens de tema Tailwind v4
  components/       # UI transversal: layout/, notice/, search/, ui/ (shadcn), data-table, pagination, date-picker…
  config/           # env.ts, paths.ts, breadcrumbs.ts
  features/<f>/     # un dominio de negocio por carpeta (ver §6)
  hooks/            # use-data-table, use-table-pagination, use-field-variant, use-mobile, use-truncated
  lib/              # infraestructura: clientes HTTP, auth, query client, helpers de backend (ver §5)
  mocks/            # MSW: browser.ts, handlers/, db/
  types/            # api.ts (User, Role, AuthResponse), declaraciones de módulos
worker/index.js     # Cloudflare Worker: estáticos + proxy /api/*
```

### Convención de un feature (ideal)
```
features/<feature>[/<subfeature>]/
  api/
    query/        # use-xxx.ts / use-xxx-query.ts: fetchXxx + toXxx(row) + xxxQueryKey + hook
    mutations/    # un archivo por operación
    types/        # tipos de dominio (camelCase)
    schema.ts     # zod: validateSearch de las rutas + schemas de formularios
    ui-mappings*.ts  # enum/catálogo ↔ etiqueta/badge de UI
  components/     # dialogs/, forms/, table/, search/, sheets/ (según haga falta)
  hooks/          # use-filters.ts (filtros en URL) etc.
  pages/          # componentes montados por el router (named export)
  lib/, utils/    # helpers puros
```
Los features reales se desvían (ver §6). **Al editar, seguí la convención del sub-feature en el que estás**; al crear algo nuevo, seguí los "patrones preferidos" de §7.

---

## 4. Arranque, router y navegación

### Boot
1. `main.tsx` → `enableMocking()`: si `env.ENABLE_API_MOCKING`, importa dinámicamente `mocks/browser` y hace `worker.start()` **antes** de renderizar. `onUnhandledRequest` solo reporta requests `/api/*` no manejadas.
2. `provider.tsx`: `QueryClientProvider` → `ThemeProvider` → `TooltipProvider` → `RouterContextProvider` (renderiza `HeadContent`/`Matches`/`Scripts`, no `RouterProvider`). El contexto del router (`{ queryClient }`) se fija al crearlo en `router.tsx`.

### Rutas (`src/router.tsx` + `src/config/paths.ts`)
- Cada página: `createRoute({ getParentRoute, path: paths.app.x.path, component: lazyRouteComponent(() => import("@/features/..."), "NombreExportado"), validateSearch, staticData: { breadcrumb } })`.
- **Agregar una ruta requiere 3 cosas**: (1) la entrada en `paths.ts` (`path` relativo al padre + `getHref()` absoluto), (2) el `createRoute`, (3) **agregarla al `routeTree`** al final del archivo. Si olvidás (3), la ruta no existe.
- Hijos de `/app` usan paths **relativos** (`"cobertura/matricula"`); `getHref()` devuelve `/app/...`. Params con sintaxis `$param`.
- **No pongas un param dinámico de un segmento junto a hermanos estáticos**: usá `detalle/$id` o `editar/$id` (antes `matricula/$id` se tragaba `matricula/configuracion`).
- Los route objects se **exportan** y los features los importan desde `@/router` para hooks tipados: `coberturaMatriculaRoute.useSearch()`, `.useNavigate()`, `.useParams()`.
- Opciones: `defaultPreload: "intent"`, `scrollRestoration`, `defaultNotFoundComponent`, `defaultErrorComponent`.

### Árbol
- `/` → siempre redirige a `/login` (no hay landing).
- `_auth` (pathless, `AuthLayout`): `/login` (si ya hay sesión redirige a `redirectTo || /app`), `/forgot-password`, `/forgot-username`, `/check-email?token`, `/restore-password?token`, `/activate?token`.
- `/app` (`ProtectedLayout`): `beforeLoad` → `hasSession(queryClient)`; sin sesión → `redirect({ to: "/login", search: { redirectTo } })`.
  - `/app/` (index): carga el menú del usuario y redirige al **primer ítem del sidebar** (`getFirstNavUrl`); fallback `/app/cobertura/reserva-de-cupo`.
  - `cobertura/*` → `features/coverage`
  - `_audits` (pathless + `NoticeProvider`) → `registro-de-actividad/*` → `features/administration/audits`
  - `administracion/roles-menus` → `features/administration/roles-menus`
  - `establecimiento-educativo/periodos*` → `features/establishment/academic-period`
  - `_establishment` (pathless + `NoticeProvider`) → `establecimiento-educativo/{general,sedes,funcionarios,agregar,editar/$id}` → `establishment/{institution,campuses,employees}`
  - `gestion-academica/{informes,referentes-curriculares}*` → `features/academic-management`
  - `planeador/*` → `features/planeador`
  - `asistencia*` → `features/academic-management/asistencia`
- **Bug conocido**: las rutas de `_establishment` están agregadas dos veces en `routeTree` (directo bajo `appLayoutRoute` y dentro de `establishmentLayoutRoute`, ~L918-933). No copies ese patrón; una ruta va solo bajo el padre de su `getParentRoute`.

### Search params
- Schemas zod en `features/<f>/api/schema.ts`, pasados a `validateSearch`.
- Patrón: toda clave `.optional().catch(undefined)`; `page`/`pageSize` con `z.coerce.number().catch(0).default(0)`; más `sortBy`/`sortDir`. **Una URL inválida nunca debe tirar.** (Excepción a evitar: `asistenciaManualSearchSchema` exige `fecha`/`sede` sin `.catch`.)
- `page`, `pageSize`, `sortBy`, `sortDir` son los nombres que espera `useTablePagination`.
- Actualizar filtros: `navigate({ search: (prev) => ({ ...prev, ..., page: 0 }), replace: true })`.

### Breadcrumbs (`config/breadcrumbs.ts`)
- `staticData.breadcrumb: Crumb[] | (params) => Crumb[]` con `Crumb = { label, to? }`.
- Gana el match **más profundo** (no se concatenan niveles): cada ruta hoja declara la **miga completa**. Usá las constantes de grupo (`COBERTURA_CRUMB`, `ESTABLECIMIENTO_CRUMB`…) al inicio.
- Todas las migas deben tener `to` (si falta alguna, no se emite el JSON-LD). No muestres ids opacos como miga; `humanizeSlug` para slugs.

### Sidebar / menú (`features/navigation`)
- El menú **lo decide el backend por rol**: `GET /eval-col/my-menus` (unión de menús de todos los roles del usuario). No uses `/menus` (catálogo completo) ni `/sso-admin/myMenu` (legacy) para el sidebar.
- `menu-mapper.ts` arma un árbol de 2 niveles (padre por `idParent`, orden `menuOrder`, descarta `visible:false` y nodos sin URL).
- Íconos del backend (`"Book-Open-Icon"`, `"user"`, `"fas fa-..."`) → `getNavIcon()` en `navigation/api/ui-mappings.ts`.
- Rutas hermanas que deben marcar activo el mismo ítem: `NAV_PATH_ALIASES` en `nav-main.tsx`.
- Menú y permisos se cachean con `staleTime: Infinity`; mutaciones de menús invalidan `["navigation","menu"]`.

---

## 5. Infraestructura (`src/lib`)

### Un solo gateway, varios prefijos
Toda llamada va a `env.API_URL` (`/api`, mismo origen). En dev lo proxea Vite; en deploy, el Worker. Los microservicios se distinguen por prefijo de path:

| Prefijo | Servicio | Cómo llamarlo |
|---|---|---|
| `/eval-col/...` | motor de queries SSO de la app (la mayoría) | `evalCol.*` o `api.*` con path completo |
| `/auth/...`, `/sso-admin/...`, `/register/...` | auth-center / SSO | `api.*` sin prefijo |
| `/audit-cval/...` | auditoría (ClickHouse read-only) | `apiPath(mock, real, AUDIT_API_PREFIX)` |
| `/files/...` | file-service (multipart, view tokens) | `postMultipart` / `patchMultipart` (`lib/files.ts`) |
| `/reportes/<key>` | exportación PDF/Excel | `downloadReport` (`lib/report-client.ts`) |
| `/ai/...` | ai-control-service (observaciones de informes) | `api.post` |

### `api-client.ts` — instancia axios `api`
- **El interceptor desenvuelve `response.data`** y hay un `declare module "axios"` global que retipa `get/post/put/patch/delete` a `Promise<T>`. Todo `api.x<T>()` resuelve **directo al body**. (La augmentación es global: afecta también a `report-client`, que por eso pasa genéricos explícitos `post<AxiosResponse<Blob>>`.)
- `api.query<T>(url, body)`: **POST semánticamente de lectura** (filtros/orden en el body).
- **Token solo en memoria** (`setAuthToken`), nunca en `localStorage`. La persistencia la da la cookie httpOnly `sso_refresh` + `POST /auth/refresh`.
- Listas que hay que mantener al agregar endpoints de auth:
  - `UNAUTHENTICATED_ENDPOINTS`: no se les adjunta Bearer.
  - `PUBLIC_ENDPOINTS`: un 401 ahí no es "sesión vencida".
  - `PROBE_ENDPOINTS`: nunca muestran toast (404 esperado).
  - (Ojo: `/sso-admin/activationTokenStatus` y `/activateAccount` no están en ninguna.)
- Sesión vencida (401 fuera de login/públicos): latch `isHandlingExpiredSession` → un solo toast, `queryClient.clear()`, `window.location.href = /login?redirectTo=...`.
- Toast global de error con `cleanErrorMessage(data.message)`, salvo probes o `setSuppressGlobalErrorToast(true)` (lo activa `NoticeProvider`, ver §7).
- `cleanErrorMessage`: traduce violaciones `UNIQUE` de Postgres vía `CONSTRAINT_MESSAGES` (agregá ahí nuevas constraints disparables por el usuario); si no, primera línea sin el prefijo `"Conflict: ERROR: "` (los `RAISE` de PL/pgSQL están pensados para el usuario).
- Helpers: `getErrorMessage(error)` (para banners en diálogos), `isNotFoundError` (404 → not-found del router en páginas de detalle), `isConflictError` (409).

### `eval-col-client.ts` — `evalCol`
- Antepone `/eval-col` y desenvuelve el envelope `{ rows, outParams }` (acepta arrays planos del mock).
- `getRows`, `postRows` (lecturas por POST), `postRow`, `patchRow`, `putRow`, `put`. `toRow` **tira si no hay filas**.
- Es la opción preferida para endpoints nuevos de eval-col.

### `api-routes.ts` — `apiPath(mockPath, realPath, prefix = "/eval-col")`
- Con mocks devuelve `mockPath` (rutas viejas en inglés: `/establishments/campuses`), sin mocks `${prefix}${realPath}` (rutas reales en español).
- **Nunca escribas `/eval-col` dentro de `realPath`.** Endpoints de auth-center sin prefijo → pasá `""`.

### `response-envelope.ts`
- El backend real envuelve cada SELECT en `{ rows: [...] }`; MSW suele devolver la forma ya desenvuelta. Estas funciones son **no-op con mocks activos**.
- `unwrapRows` (lista) · `unwrapRow` (una fila, tira si vacío) · `unwrapPaginated` (`fn_*_listar_paginado` → `{ rows, pageCount, totalCount }`, la forma que esperan las tablas).
- Úsalas con `api.*`; `evalCol` ya desenvuelve (siempre).

### Auth (`auth.ts`, `auth-mapper.ts`, `authorization.tsx`)
- `useLogin` → `POST /auth/login` (header `x-remember-me: true` si "Mantener sesión iniciada"; el backend ajusta el `Max-Age` de la cookie). Respuesta: solo `{ token, ... }`, **sin usuario**.
- El usuario se deriva **decodificando el JWT sin verificar** (`toAuthUserFromToken`): `sub` = email, `name`, `roles[]`. `isSuperAdmin` = rol `CEVAL-SUPER_ADMINISTRADOR`. `role` es `"ADMIN"` solo si el claim literal es `"ADMIN"` → **los usuarios reales casi siempre quedan `USER`**; para chequeos finos usá `user.roles` o `useMenuPermission`.
- `getUser()` = `POST /auth/refresh` (no hay `/auth/me`); `useUser()` (key `["auth-user"]`); `hasSession(queryClient)` para guards.
- `useLogout` → `POST /auth/logout` + `queryClient.clear()` (necesario: menú/permisos tienen `staleTime: Infinity`).
- **Permisos por pantalla (preferido)**: `useMenuPermission("CODIGO")` (`features/navigation/api/use-menu-permission.ts`) → `{ puedeCrear, puedeEditar, puedeEliminar, puedeVer, isLoading }`; **todo denegado mientras carga**. Códigos: `ESTABLECIMIENTO`, `SEDES_EDUCATIVAS`, `FUNCIONARIOS`, `PERIODOS_ACADEMICOS`, `MATRICULA`, …
- `<Authorization allowedRoles>` / `useAuthorization()` (tira si no hay usuario): legacy, un solo uso.
- **No hay gating por rol en el router**, solo por sesión.

### TanStack Query (`query-client.ts`, `react-query.ts`)
- Defaults: `retry: false`, `refetchOnWindowFocus: false`, `staleTime: 60s`.
- `MutationConfig<typeof fn>` para tipar opciones de hooks de mutación.

### Otros helpers
- `report-client.ts` — `downloadReport(key: ReportKey, { format: "pdf"|"excel", filters, sorting, columns, filtersLabel })`: instancia axios aparte (blob, sin unwrap, sin toast global). Lee `Content-Disposition` y `X-Report-Rows`, dispara la descarga y **devuelve `{ status, message }` sin tirar** (422 = demasiadas filas). `columns` = columnas visibles en orden; `filters` = los mismos que usa la tabla (por eso los normalizadores de filtros se exportan). Para un reporte nuevo, agregá la clave a la unión `ReportKey`.
- `files.ts` — `postMultipart`/`patchMultipart(path, data, files)`: aplana el payload a claves con punto y omite null/undefined; **no setees `Content-Type`**. Destino `query` lleva prefijo (`/files/eval-col/...`), destino `endpoint` no (`/files/register/...`). `fetchArchivoViewUrl(id)` → URL corta ya rooteada en `/api/...` (no concatenar con baseURL). En componentes usá `useArchivoViewUrl(fk_tarchivo)` / `<ArchivoImage>` (`features/files`), pasando el **id**, nunca una URL.
- `query-request-mapping.ts` — `toSingleSort(sorting)`: el backend real bindea `:BODY.SORTING.ID/.DESC` como objeto y `null` rompe el validador de placeholders. Solo para el backend real (el mock espera el array).
- `catalogs.ts` (slugs `CATALOGS.X`) · `catalog-options.ts`: `toSelectOptions` (value = **id**, para forms) vs `toSearchOptions` (value = **código**, para filtros/URL). **Todo `<Select items>` de `ui/select.tsx` necesita `toSelectItemsMap(options)`** o el trigger no muestra la etiqueta.
- Fechas — **dos módulos con funciones homónimas y semántica distinta**: `date-value.ts` (`yyyy-MM-dd`, `formatDateValue` → `""` al limpiar) vs `date-time-value.ts` (`yyyy-MM-dd'T'HH:mm`, y su `formatDateValue` → **`null`** al limpiar, para modelos `string | null`). Importá del correcto.
- `success-messages.ts` — `SUCCESS_MESSAGES[entidad].{created,updated,deleted,deletedMany(n),deactivated}`. Los toasts de éxito salen de acá, **no** del `message` del backend. Los de error sí usan el mensaje del backend.
- `text-input.ts` — sanitizadores de `onChange`: `toDigitsOnly(v, max)` (VARCHAR numéricos; **nunca `type="number"`**), `toNitInput`, `toDigitsOrRangeInput`, `toLettersOnly`, `toSafeTextInput`.
- `image-file.ts` — límites (2 MB, jpeg/png/svg, 4000 px), `imageFileSchema`, `optionalImageFile` (`nullish` = mantener la imagen existente), validadores sync/async.
- `forms/index.ts` — `useAppForm`, `withForm`, `useFieldContext`, `useFormContext` (`createFormHook` con `fieldComponents`/`formComponents` vacíos a propósito).
- `utils.ts` — `cn()`.

### Variables de entorno (`src/config/env.ts`)
Solo se leen las `VITE_APP_*` (se les quita el prefijo) y se validan con zod; todas tienen default. **Todo lo `VITE_APP_*` queda en el bundle público: nunca secretos.**

| Variable | Default | Uso |
|---|---|---|
| `VITE_APP_API_URL` | `/api` | baseURL de axios |
| `VITE_APP_ENABLE_API_MOCKING` | **`true` si falta** | solo `active` \| `inactive` (otro valor tira al importar). `.env.example` trae `inactive` |
| `VITE_APP_APP_URL` | `http://localhost:5173` | URLs absolutas (JSON-LD de migas) |
| `VITE_APP_NAME` | `COLOMBIA-EVALUADORA` | id de app en el SSO (`?app=`) |
| `VITE_APP_API_PROXY_TARGET` | `http://localhost:8080` | **solo** `vite.config.ts` (proxy dev); no está en `env.ts` |

Cambiar el modo mock cambia paths (`apiPath`), unwrapping (`response-envelope`) y ramas `if (env.ENABLE_API_MOCKING)` de varios hooks.

---

## 6. Features (dominio y particularidades)

### `coverage` — Cobertura
Todo plano en la raíz del feature (sin sub-carpetas) aunque tiene 4 subdominios:
- **Matrícula** (el más completo y **real**): lista, agregar (~70 campos), detalle, editar, configuración de campos por establecimiento (visible/obligatorio/editable), retirar/reingresar, cambios masivos de sede/grado/grupo (`move-matricula.ts`), homologación. Endpoints `/eval-col/matricula/query`, `/eval-col/cobertura-academica/matricula[/{id}]` (GET detalle, POST/PATCH **multipart**, **PUT = eliminar**, `{id}/retirar|reingresar` PUT). `create-matricula.ts` orquesta: resolver sede/jornada **por nombre** → periodo (`/periodos/resolver-matricula`) → grado → buscar/crear estudiante y acudiente → multipart → documentos extra. Formularios con `useState` + validación manual guiada por la config de campos (decisión documentada en `schema.ts`).
- **Reserva de cupo**, **Pre-matrícula** (prototipo: año 2025→2026 hardcodeado, `onConfirm` con TODO), **Inscritos** (detalle stub): endpoints `/coverage/...` **solo existen en MSW** → no funcionan con mocks apagados.
- Trío a copiar para pantallas de lista: `table-matricula.tsx` + `api/query/use-matricula-query.ts` + `hooks/use-matricula-filters.ts`.
- Los mocks de matrícula para retirar/eliminar quedaron desactualizados respecto de los paths reales.

### `establishment` — Establecimiento educativo
- `institution/` (EE: DANE, NIT, datos complementarios, escudo, rector), `campuses/` (sedes), `employees/` (funcionarios + permisos rol×sede×jornada), `academic-period/` (periodos y todo lo que cuelga: periodos de evaluación, criterios, escalas de valoración, grados, grupos, plan de estudio, áreas/asignaturas, especialidades, horario, asignaciones académicas — como tabs lazy en `evaluation-periods-section.tsx`, cada tab con su `NoticeProvider`).
- `institution`/`campuses`/`employees`: **legacy** — ramas mock/real con `apiPath`, forms con `useState` + `safeParse` manual, mutaciones partidas en `create.ts` (fn) + `use-create.ts` (hook), payloads camelCase anidados: en modo real el fn de la mutación pasa los valores por un adaptador local (`toRealBackendPayload` en `institution/api/mutations/create.ts` y `employees/api/mutations/update.ts`, `toRealCreatePayload`/`toRealUpdatePayload` en `campuses/api/mutations/create.ts`) que aplana catálogos a `.id` y saca `id`/campos read-only; con mocks se manda el objeto de dominio tal cual (`toOutgoingPayload`).
- `academic-period`: **más nuevo** — solo backend real (`/eval-col/...` hardcodeado, sin mocks), forms con `useForm` de TanStack + zod `validators`, un archivo por operación (`create-grade.ts` exporta `useCreateGrade`), bodies **UPPER_SNAKE planos** (`FK_SEDE`, `PAGE_INDEX`, `SORTING_ID`, `RESERVA: "S"|"N"`).
- Dos sistemas de catálogos: `employees/api/query/use-catalogs.ts` (`useCatalogQuery(CATALOGS.X)`) y `academic-period/api/query/fetch-select-category.ts` (`fetchSelectCategory("JORNADA")` → `GET /eval-col/select/:CATEGORIA`). Otros features importan ambos.
- Resultados de escritura `{ rows: [{ fn_x: id }] }` → `extractWriteResultId`; bulk delete → `summarizeBulkDelete`/`formatBulkDeleteError`.
- Archivos gigantes (editá con cuidado, en porciones): `employees/components/dialogs/dialog-manage.tsx` (67 KB), `dialog-create-rating-scale.tsx`, `dialog-create-study-plan.tsx`, `add-establishment-page.tsx`.

### `academic-management` — Gestión académica
- `curricular-references/`: referentes curriculares (enfoque FORMATIVO/EVALUATIVO que determina reglas del planeador), con enunciados y evidencias (evidencia = enunciado con `ENUNCIADO_PADRE`). `export.ts` solo funciona con MSW.
- `reports/` (página en `academic-management/pages/reports-page.tsx`): Informes — cascada sede→año→jornada→periodos (incluye "Final", `PERIODO_FINAL_ID = -1`)→grupos; consolidar, observaciones cualitativas de preescolar generadas por IA (`/ai/observaciones/*`, 409 si no se manda `SOBRESCRIBIR`), boletín PDF. Todo el estado en la URL. Todo vía `evalCol.postRows` (lecturas por POST).
- `asistencia/`: calendario mensual, registro manual por sesión (preescolar usa `ACTIVIDAD` en lugar de `ASIGNATURA`/`BLOQUE`), seguimiento. Sus mutaciones **no** aceptan `mutationConfig`. Acoplamiento circular con planeador (`invalidarPlaneadorPorAsistencia`).

### `planeador` — Planeador docente
- Dominio: **Actividades** (ventana de fechas, tipo, evaluativa/formativa/recuperación, instrumento de evaluación: Rúbrica / Lista de cotejo / Escala de valoración / Otro, recursos, adaptaciones, estudiantes) agrupadas en **Unidades temáticas** (método de cálculo Ponderado / Promedio simple / Suma de puntos → la actividad lleva `PONDERACION` **o** `NOTA_MAXIMA`, nunca ambos; criterios por nivel; instrumento propio de la unidad desde V488). **Planilla** de calificación por periodo→grado→grupo→asignatura.
- Páginas: actividades (rail por día `?dia` + calendario mensual o `ActividadDetallePanel` si `?actividad`, modos `?modo=grades|approval`), crear/editar actividad, unidades (`?unidad`, tabs por referente `?instrumento`), crear/editar unidad, planilla (estado local), vista previa de recurso (el recurso viaja en search; el form se guarda en sessionStorage con `lib/actividad-form-draft.ts`).
- `components/forms/form-editar-actividad.tsx` (~5.200 líneas) sirve para crear y editar. `defaultValues` se leen una vez al montar: la página espera los datos y usa `key={id}`. Controles de Base UI ignoran `<fieldset disabled>` → cada sección recibe `disabled` explícito.
- **Guardado multi-paso con orden obligatorio**: actividad (POST/PUT) → vínculo unidad → evidencias (una por request) → materiales (PUT, reemplazo total) → instrumento (PUT; necesita que el PUT de actividad ya haya fijado `FK_TLV_INSTRUMENTO_EVALUACION`, si no 400/22023) → adaptaciones (reemplazo total) → criterios → estudiantes. Los PUT de reemplazo total **borran archivos que no se reenvíen por `archivoId`**.
- Contrato: bodies UPPER_SNAKE, flags `"S"|"N"`, **campos JSONB se mandan como string JSON** (`DEFINICION`, `MATERIALES`, `ADAPTACIONES`, `CALIFICACION`), no hay DELETE (bajas por PATCH). Nombres de catálogo → `pk_lista_valor` con `resolveXxxId(nombre)` al armar el body.
- Query keys bajo `["planeador", ...]` (`"actividades-mias"`, `"actividad", id`, `"unidad", id, <sub>`, `"planilla", ...`).
- "Instrumento" tiene **dos significados**: `?instrumento=` / `/unidades/tabs` = etiqueta del referente ("Unidad temática" / "Proyecto pedagógico"); `Actividad.instrumento` = instrumento de evaluación. Además, nombre visible ("Rúbrica") ≠ código de planilla (`RUBRICA`).
- Detectar unidad formativa con `useUnidadReferenteQuery(...).esFormativo`, no con `enfoquePedagogico` (viene hardcodeado).
- El mock devuelve objetos camelCase de dominio (no filas snake_case) → ~10 hooks ramifican por `env.ENABLE_API_MOCKING`.
- Invalidación de actividades: create/update/delete usan `invalidarListadosActividades` (`api/query/invalidar-listados-actividades.ts`), que refresca `actividades-mias`/`-calendario`/`-stats`, el listado legado y el detalle. **Bug conocido**: `importar-actividades-json.ts` todavía invalida solo `["planeador","actividades"]` (+ unidades), que no prefija `actividades-mias`/`-calendario`/`-stats`.

### `administration`
- `roles-menus/`: asignación de menús a roles (transferencia de dos paneles, "Solo lectura", reordenamiento por drag nativo HTML5), CRUD de menús y planes. El árbol es estrictamente de 2 niveles y el backend rechaza hijos sin su padre → todo guardado pasa por `partitionKnownMenus` + `withRequiredParents` (`api/types/role-menu.ts`, con tests). Todo vía `evalCol`.
- `audits/` ("Registro de actividad"): sesiones, operaciones por sesión, grilla de tablas, operaciones por tabla, ver cambios, **revertir** (`POST /sso-admin/audit/revert`), export. Real vía `apiPath(..., AUDIT_API_PREFIX)` + `api/real-mapping.ts`.
- No hay pantalla de usuarios acá: los funcionarios están en `establishment/employees`.

### `auth`
Login email/contraseña contra el SSO (**no hay login Microsoft ni selección de rol**). Recuperación de contraseña (`forgotPassword` → `check-email` → `restorePassword`; compatible con dos versiones del backend, ambas terminan en `EmailNotRegisteredError`), recuperar usuario por documento, activación de cuenta (reusa el form de restore). `passwordRules` en `api/schema.ts` es la fuente única de reglas y del checklist visual.

### Otros
- `assistant`: sheet de chat con `@tanstack/ai-react`, **conectado a un mock** (`lib/mock-chat.ts`), sin modelo ni endpoint.
- `files`: `useArchivoViewUrl` (token de vista de 5 min, refetch 1 min antes) + `ArchivoImage`.

### Acoplamientos entre features (aceptados, pero tenelos presentes)
`establishment/academic-period` es proveedor de casi todos (`fetchSelectCategory`, sedes, grados, asignaturas, jornadas). `CatalogItem` sale de `establishment/employees/api/types/catalog`. `ExportFormat`/`ExportResult` de `establishment/institution/api/types/export.ts`. Planeador ↔ asistencia en ambos sentidos.

---

## 7. Patrones preferidos para código nuevo

### Query hook
```ts
// features/<f>/api/query/use-things.ts
interface ThingRow { pk_tthing: number; nombre: string; total_count: number } // snake_case del backend
export interface Thing { id: number; name: string }                           // camelCase de dominio

const toThing = (row: ThingRow): Thing => ({ id: row.pk_tthing, name: row.nombre })

export const thingsQueryKey = (params: ThingsParams) => ["things", params] as const

export function toThingsFilters(params: ThingsParams) { /* normalizador EXPORTADO: lo reusa el export */ }

async function fetchThings(params: ThingsParams) {
  const rows = await evalCol.postRows<ThingRow>("/things/query", { ...toThingsFilters(params) })
  return { rows: rows.map(toThing), pageCount: /* desde total_count */ }
}

export function useThingsQuery(params: ThingsParams) {
  return useQuery({ queryKey: thingsQueryKey(params), queryFn: () => fetchThings(params), placeholderData: (prev) => prev })
}
```
- Keys: `["<kebab-plural>", params]` para listas; detalle con `enabled: Boolean(id)`. Si el detalle tiene key distinta a la lista, **invalidá ambas** al mutar. Catálogos: `staleTime: Infinity`.
- `queryOptions()` casi no se usa; no es obligatorio.

### Mutation hook
```ts
export function useCreateThing({ mutationConfig }: { mutationConfig?: MutationConfig<typeof createThing> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: createThing,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["things"] }) // prefijo; verificá que realmente prefije las keys de lectura
      onSuccess?.(...args)
    },
  })
}
```
- fn con varios argumentos → un solo objeto de variables.
- **Los mensajes de éxito no van en el hook**: el llamador hace `notify(SUCCESS_MESSAGES.thing.created)`; errores `notify(getErrorMessage(error), { variant: "error" })`.

### Contrato con el backend real (eval-col)
- Bodies en **UPPER_SNAKE** exactamente como los bindings SQL (`FK_TGRUPO`, `PAGEINDEX`/`PAGE_INDEX`, `SORTING: { ID, DESC }`…). El nombre exacto varía por endpoint: **copiá el del endpoint vecino o la colección Postman**, no lo inventes.
- **El validador de placeholders rechaza cualquier hoja no declarada**: aplaná catálogos a `.id`, sacá `id` y campos read-only, sacá campos solo-front (`operatingLicense`, `minAbsences`, `isPrincipal`…). Respetá typos del backend (`comune`).
- Respuestas snake_case → mapear a camelCase en el archivo de query. `total_count` suele venir repetido en cada fila; `pageCount` se calcula en front. Paginación **0-based**.
- Verbos poco convencionales: baja lógica por `PUT /x/:id` o `PATCH .../eliminar`, bulk delete `PUT /x/bulk-delete { pks }`. Mirá el endpoint vecino.
- Lecturas complejas por POST (`api.query` / `evalCol.postRows`).

### Pantalla de lista
- `TableScreen` > `TableScreenHeader` > `TableScreenTitle` (+ `action`) / `TableScreenToolbar` (search a la izquierda, `TableScreenActions` a la derecha; **ya renderiza `<NoticeOutlet/>`**) / `TableScreenBody` (+ `TableScreenFooter` para forms de página completa) — `components/layout/table-screen.tsx`.
- `const f = useTablePagination()` (URL) → `useDataTable({ ...f, columns, data, pageCount, columnVisibilityStorageKey })` → `<DataTable table isPending isError onRetry />` + `<Pagination ... viewOptions={<DataTableViewOptions table/>} />`.
- En modales/sub-tablas envolvé en `<TablePaginationProvider>` para paginar en estado local y no pisar la URL.
- **Todo archivo que use TanStack Table lleva `"use no memo"` en la primera línea** (el React Compiler rompe TanStack Table).
- Columnas: factory `createColumns({ onEdit })` en `table/columns-*.tsx`; `DataTableColumnHeader`; `columnDef.meta.label` en español (lo usa el menú de columnas). La columna con id **`"actions"`** es especial (overlay sticky al hover; `size` 48 por botón).
- Filtros: `hooks/use-filters.ts` con `xRoute.useSearch()/useNavigate()` → `{ filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount }`; aplicar resetea `page: 0`.
- Búsqueda estilo Gmail en un solo input (`estado:(Activo) texto libre`): `SearchQueryBar` + `useQuerySearch` + `components/search/query-syntax.ts`; cada feature define su sintaxis en `components/search/query-syntax.ts`. Popover avanzado: `advanced-filters-popover.tsx`.
- Permisos: `useMenuPermission("CODIGO")` para mostrar crear/editar/eliminar.
- Export: diálogo con PDF/Excel → `downloadReport(key, { format, filters: toThingsFilters(...), columns })`.

### Formularios
- Preferido: TanStack Form (`useAppForm` de `@/lib/forms`, o `useForm` directo como en `academic-period`) con zod en `validators: { onChange/onSubmit: schema }` y `<form.Field>` envolviendo `Field`/`FieldLabel`/`FieldError` + inputs de `ui/`. Estado inválido: `isTouched || submissionAttempts > 0`. Botón de submit externo con `form={FORM_ID}`. Create y edit comparten componente.
- Referencias: `establishment/academic-period/components/forms/form-academic-period.tsx`, `dialogs/dialog-create-grade-group.tsx`, `coverage/components/forms/form-filter-reservations.tsx`.
- **No copies** los forms `useState` + `safeParse` manual de campuses/employees/institution/curricular-references (salvo que edites ahí mismo).
- Diálogo con form: `NoticeBanner` local para errores mientras está abierto; éxito con `notify()` de página y cerrar; `ConfirmDiscardDialog` al cerrar sucio; no cerrar mientras hay save pendiente.
- Inputs numéricos que son VARCHAR: `toDigitsOnly`, no `type="number"`.

### Avisos (`components/notice/`)
- `NoticeProvider` + `<NoticeOutlet/>` + `useNotify()` → `notify(msg, { variant, autoCloseMs })`. Un aviso por pantalla (el nuevo reemplaza al anterior).
- El provider debe ser **ancestro** del componente que llama `useNotify` (por eso las páginas envuelven un `...Content` interno). Fuera de un provider, `useNotify` cae a un toast de sonner.
- **Mientras haya un `NoticeProvider` montado, el toast global de errores de axios está suprimido** (conteo de referencias). La pantalla debe mostrar sus propios errores con `getErrorMessage`.
- Guardar y navegar: `queueNotice()`; el provider de destino lo muestra al montar. Por eso existen los layouts pathless `_audits` / `_establishment`.

### UI y estilos
- **Base UI, no Radix**: para componer triggers usá `render={<Button ... />}`, no `asChild`. Si renderizás un `Link`, agregá `nativeButton={false}`.
- `Button`/`Badge`: dos ejes — `variant` (`fill|soft|outline|ghost|link`) × `color` (`primary|secondary|muted|neutral|destructive|info|warning|success`). Íconos dentro con `data-icon="inline-start|inline-end"`.
- `Field variant="outlined"` da label flotante estilo MUI (`FieldVariantContext`).
- **Íconos: siempre desde `@/components/ui/icons`.** Exporta nombres estilo Phosphor (`XIcon`, `TrashIcon`, `PencilIcon`, `ControlPointIcon` = Agregar, `FileDownloadOutlinedIcon` = Exportar) pero son `react-icons` Material (`Md*`) envueltos; **no hay paquete de Phosphor instalado**. Para uno nuevo, importalo en `icons.tsx` y exportalo con nombre estilo Phosphor.
- Tokens Tailwind (`src/index.css`, `@theme inline`): superficies (`background`, `card`, `popover`, `sidebar-*`), marca (`primary`, `secondary`, `accent`, `muted`), semánticos `red|green|yellow|blue|purple|orange|navy` (+ `-foreground`, `-stroke` para bordes, `-22` para relleno suave). Usá `text-red`/`bg-red-22`, no clases `destructive`.
- Dos ejes de tema en `<html>`: modo (`.dark`, next-themes, key `vite-ui-theme`) y paleta (`data-theme="red"`, `ColorThemeProvider`, key `vite-ui-color-theme`). **Un token nuevo va en los 4 bloques** (`:root`, `.dark`, `[data-theme="red"]`, `.dark[data-theme="red"]`) y en `@theme inline`.
- `cn()` siempre; variantes con `cva`; clases dinámicas escritas literalmente (Tailwind no ve strings armados).
- Componentes compartidos útiles: `confirm-remove-button.tsx` (`onConfirm` async; devolver `false` mantiene abierto), `confirm-discard-dialog.tsx`, `select-items-dialog.tsx` (multi-select tipo input), `date-picker.tsx` (`mode: date|datetime|time`; `enabledDaysOfWeek` es 0-6 de JS, el backend usa 1-7 con domingo=1), `image-upload-field.tsx`, `table-sort-header.tsx` / `table-row-actions.tsx` (tablas manuales sin TanStack).

---

## 8. Mocking (MSW)

- `VITE_APP_ENABLE_API_MOCKING` es de **build**. `dev` (Worker de vitrina) se buildea con `active`; `test`/`production` con `inactive`.
- `src/mocks/handlers/index.ts` concatena los arrays `xxxHandlers` de cada dominio. **MSW usa el primer match**: registrá rutas estáticas antes que las `:id`.
- DB **en memoria** (arrays/Maps exportados y mutados directo), sin persistencia: recargar resetea todo. faker con **seed fija** por archivo (datos reproducibles). Ids con `db/next-id.ts` (`max + 1`).
- Archivos `*-helpers.ts` en `handlers/` (p. ej. `session-operations-helpers.ts`) son helpers, no handlers: no exportan un array de handlers ni se registran en `index.ts`.
- Auth mock (`db/auth.ts`, `handlers/auth.ts`): JWT `alg: none`, cookie `sso_refresh` simulada, `/auth/refresh` identifica por cookie. Usuarios fixture: `admin@example.com`, `user@example.com`, `docente@example.com` (contraseña `password`). Tokens fijos `mock-reset-token`, `mock-activation-token`.
- Agregar un handler: datos en `mocks/db/<dominio>/x.ts` tipados con los tipos del feature → `mocks/handlers/<dominio>/x.ts` con `http.*` + `await delay(...)` → registrarlo en `index.ts`. **El path y la forma de respuesta los dicta el hook en modo mock** (`apiPath` puede devolver la ruta vieja en inglés; `response-envelope` es no-op con mocks): leé el hook antes de escribir el handler.
- Partes sin mock (solo backend real): `establishment/academic-period`, `adaptaciones-reutilizables` del planeador. Partes solo-mock: reservas, pre-matrícula, inscritos, export de referentes.

---

## 9. CI/CD, ramas y deploy

```
feature/* ──squash──▶ dev ──merge commit──▶ test ──merge commit──▶ main ──tag v*──▶ producción
                       │                     │
                       └ deploy-dev          └ deploy-test (sin gate de CI)
```

| Workflow | Disparo | Hace |
|---|---|---|
| `ci.yml` | PR / push a **`dev`** únicamente | `tsc -b --noEmit`, `pnpm lint`, `pnpm build` |
| `deploy-dev.yml` | CI exitoso por push a `dev` (o manual) | deploy env `dev` del SHA verificado |
| `deploy-test.yml` | push a `test` (o manual) | deploy env `test` — **no hay CI**: lo que se pushee directo a `test` sale sin verificar |
| `release.yml` | tag `v*` (`vX.Y.Z[-pre]`) o manual | deploy env `production` (requiere aprobación de reviewer) |
| `deploy.yml` | reutilizable | escribe `.env` desde el secreto `ENV_FILE`, `pnpm build`, `wrangler deploy --env <env>` (+ `--var API_PROXY_TARGET` si está la variable del environment) |

| Env | Worker | Dominio | Backend |
|---|---|---|---|
| dev | `colombiaevaluadorav2-dev` | `devv2.colombiaevaluadora.com` | MSW |
| test | `colombiaevaluadorav2` (**sin sufijo a propósito**, no renombrar) | `testv2.colombiaevaluadora.com` | backend de test |
| production | `colombiaevaluadorav2-production` | `productionv2.colombiaevaluadora.com` | backend productivo |

- `worker/index.js`: `/api` y `/api/*` se reenvían a `API_PROXY_TARGET` (preservando `Set-Cookie`); el resto va a `env.ASSETS` (SPA). Mismo origen = sin CORS ni mixed content.
- `wrangler.jsonc`: `run_worker_first: ["/api/*"]` es imprescindible (sin él los POST dan 405). Los bloques `env.*` **no heredan** `vars` ni `routes`. **El target debe ser hostname, no IP** (Cloudflare devuelve error 1003).
- Secretos: `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` a nivel repo; `ENV_FILE` por environment (no es confidencial: termina en el bundle). `scripts/setup-environment-secrets.sh <env>` lo carga y valida claves contra `.env.example`.
- Promoción `test → main`: `scripts/promote-test-to-main.sh [--merge] [--take-test]` (simula el merge, abre PR, **nunca squash**). Después: `git checkout main && git pull --ff-only && git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`. `dev → test` es PR manual con merge commit.
- Rollback: `wrangler deployments list --name <worker>` + `wrangler rollback <id>`, o re-disparar `release.yml` con un tag anterior.
- Storybook (`wrangler.storybook.jsonc`) se deploya a mano.

### Convenciones
- Commits: `type(scope): descripción corta [taskId]` (`.github/commit_template.md`), ej. `feat(planeador): instrumento de evaluacion propio de la unidad [ae27d3]`.
- PRs: plantilla `.github/pull_request_template.md` (qué cambia, tipo, pantallas afectadas, evidencia, validación, checklist).
- Base de trabajo: ramas desde `dev`. `test` y `main` solo reciben merges.

---

## 10. Storybook

- Stories solo del design system: `src/components/ui/stories/*.stories.tsx` (+ `badge.mdx`, `button.mdx`). Features sin stories.
- CSF Factories: `import preview from "../../../../.storybook/preview"`, `preview.meta({...})`, `meta.story(...)`. Títulos `Design System/<Categoría>/<Componente>`. Docs en español.
- Toolbar `palette` replica el contrato de tema (`data-theme` + `.dark`). El test-runner (`.storybook/test-runner.ts`) corre axe sobre stories "Design System" y falla solo en impactos critical/serious.

---

## 11. Trampas rápidas (checklist)

- ¿Endpoint nuevo? Decidí cliente (`evalCol` vs `api` vs `files` vs `downloadReport`), si necesita `apiPath` + handler MSW, y si toca las listas de endpoints de `api-client.ts`.
- ¿Invalidación? Verificá que la key invalidada sea **prefijo real** de las keys de lectura (hay bugs de esto en planeador).
- ¿Tabla? `"use no memo"`.
- ¿`<Select items>`? `toSelectItemsMap`.
- ¿Pantalla con `NoticeProvider`? Los errores de axios ya no salen solos: mostralos vos.
- ¿Ruta nueva? `paths.ts` + `createRoute` + `routeTree` + breadcrumb completo.
- ¿Fecha? `date-value` vs `date-time-value`.
- ¿Enum? Prohibido (`erasableSyntaxOnly`): unión de literales.
- `strictNullChecks` apagado: chequeá nulls a mano en datos del backend (filas de detalle pueden traer catálogos con `name` vacío; validá por `id != null` y resolvé la etiqueta desde el catálogo cargado).

---

## 12. Proyecto hermano

Existe `front_pigse` (mismo stack y patrones), con el que a veces se comparte código puntual (p. ej. auth). No asumas que vive dentro de este repo ni lo modifiques sin pedido explícito. Las colecciones Postman que citan los comentarios del planeador casi todas **no están en este repo** (solo `planeador-ver-editar-actividad.postman_collection.json`).
