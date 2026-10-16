# Project Context

> Resumen para OpenSpec destilado de `CLAUDE.md` (que sigue siendo la guía detallada del repo). Si algo difiere, manda el código y luego `CLAUDE.md`.

## Purpose

Front web de **Colombia Evaluadora**: gestión académica para establecimientos educativos colombianos. Docentes planifican actividades y unidades (planeador), califican en la planilla, registran asistencia y consultan referentes curriculares; directivos y administradores gestionan cobertura (matrícula), establecimiento (sedes, funcionarios, periodos), roles/menús y auditoría.

## Tech Stack

- React 19 + TypeScript 6 + Vite 8, React Compiler activo.
- TanStack Router (code-based, `src/router.tsx` + `src/config/paths.ts`), TanStack Query (todo el estado de servidor), TanStack Form, TanStack Table.
- UI shadcn estilo `base-sera` sobre Base UI (no Radix), Tailwind v4 CSS-first, sonner, zod v4, date-fns, axios, MSW.
- Despliegue: Cloudflare Worker (`worker/index.js`) sirve estáticos y proxea `/api/*` al gateway (mismo origen).
- pnpm, Node 24 en CI.

## Project Conventions

### Code Style
- oxfmt (sin punto y coma, comillas dobles), oxlint.
- TypeScript sin `strict` (sin `strictNullChecks`), con `noUnusedLocals/Parameters`, `erasableSyntaxOnly` (prohibido `enum`/`namespace`), `verbatimModuleSyntax` (`import type`).
- Texto de UI, mensajes y comentarios en español; identificadores en inglés salvo términos de dominio (`sede`, `jornada`, `planilla`, `matricula`…).
- Componentes como named exports; alias `@/*` → `src/*`.

### Architecture Patterns
- Un dominio por carpeta en `src/features/<f>/` con `api/{query,mutations,types}`, `components/`, `hooks/`, `pages/`.
- Clientes HTTP: `api` (axios que desenvuelve `response.data`), `evalCol` (prefijo `/eval-col` + envelope `{ rows }`), `postMultipart` (file-service), `downloadReport`.
- Backend eval-col: bodies UPPER_SNAKE exactos, respuestas snake_case mapeadas a camelCase en el archivo de query, paginación 0-based.
- Sesión: access token solo en memoria; refresh por cookie httpOnly `sso_refresh` + `POST /auth/refresh`.
- Menú y permisos por rol desde el backend (`/eval-col/my-menus`, `/usuarios/permisos-menu`).
- Avisos con `NoticeProvider`/`useNotify`; el toast global de errores de axios se suprime mientras haya un provider montado.

### Testing Strategy
- Hoy no hay script `test` de unidad; Vitest corre solo el proyecto `storybook` (browser mode). Gate de CI: `tsc -b --noEmit`, `pnpm lint`, `pnpm build`.
- La iniciativa offline agrega un proyecto Vitest `unit` (node + `fake-indexeddb`) con script `pnpm test:unit` y E2E con Playwright.

### Git Workflow
- `feature/*` → squash a `dev` → merge commit a `test` → merge commit a `main` → tag `v*` a producción.
- Commits `type(scope): descripción [taskId]`. Nunca promover a `main` sin pedido explícito.

## Domain Context

- **Planeador**: actividades (ventana de fechas, evaluativa/formativa/recuperación, instrumento de evaluación) agrupadas en unidades temáticas; guardado multi-paso con orden obligatorio.
- **Planilla**: calificación por periodo → grado → grupo → asignatura; notas definitivas/proyectadas calculadas en el servidor.
- **Asistencia**: calendario mensual, registro manual por sesión (preescolar usa `ACTIVIDAD` en vez de asignatura/bloque), seguimiento; Regla 75 genera solicitudes en el servidor.
- **Periodo cerrado**: cambios se convierten en solicitudes al coordinador.

## Important Constraints

- Datos de menores: política institucional sobre equipos personales **pendiente** (bloqueador P6 de la iniciativa offline).
- No se agregan columnas/tablas en `sso` sin aprobación explícita; cada cambio ajusta la migración Flyway dueña del objeto.
- Todo `VITE_APP_*` queda en el bundle público.
- MSW registra un Service Worker en el entorno `dev` (vitrina con mocks).

## External Dependencies

- Gateway `/api` con microservicios: eval-col (motor de queries SSO), auth-center/SSO (`/auth`, `/sso-admin`), auditoría (`/audit-cval`), file-service (`/files`), reportes (`/reportes`), IA (`/ai`).
- Cloudflare Workers (wrangler) para dev/test/production.
