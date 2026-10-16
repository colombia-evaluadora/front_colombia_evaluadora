# Plan del port offline a PIGSE (`front_pigse`)

Solo plan: **no** se modifica `front_pigse` sin pedido explícito (CLAUDE.md §12, plan §9.8). `src/lib/offline/*` de este repo no depende de features, así que el port es copiar infraestructura y registrar handlers propios de PIGSE.

## 0. Diagnóstico de PIGSE (2026-10-16)

- Mismo stack (React 19, TanStack Query/Router, axios con unwrap, MSW). Cliente propio `lib/pigse-client.ts` en lugar de `evalCol`.
- Sin PWA, sin persistencia de queries, sin IndexedDB (`package.json` no trae `vite-plugin-pwa` ni `idb`).
- Features: `document-management` (carga de documentos, límite 25 MB por archivo), `monitoring`, `establishment`, `administration`, `auth`.
- Usuarios típicos: funcionarios de secretaría en oficina con red estable → el valor principal es **resiliencia** (Fase 0) y **lectura** (Fase 1), no escrituras offline.

## 1. Alcance propuesto

| Fase colombia | En PIGSE | Decisión |
|---|---|---|
| 0 Resiliencia (conectividad, banner, retry, kill-switch) | Sí | Copiar tal cual |
| 1 Lectura offline (SW app shell, persister selectivo) | Sí, solo consulta de documentos y monitoreo | Copiar; `meta.offline` solo en queries de lista |
| 2 Outbox | Solo metadatos de documentos (no archivos > 10 MB) | Opcional, tras piloto |
| 3 Sagas | No aplica | — |
| 4 Resto | Administración solo en línea | — |

## 2. Pasos (un PR por paso en `front_pigse`)

1. **Conectividad** — copiar `lib/offline/{connectivity,use-connectivity,banner-message,offline-mode,clock}.ts`, `components/offline/*` (banner, `OnlineOnlyTooltip`, `OnlineOnlyRouteGate`, empty state), íconos `Cloud*`. Ajustar `HEARTBEAT_PATH` al health del gateway PIGSE y agregarlo a `UNAUTHENTICATED_ENDPOINTS`/`PROBE_ENDPOINTS` + handler MSW. Llevar `connectivity.test.ts` y crear el proyecto Vitest `unit` (`pnpm test:unit`) y su paso en CI.
2. **Kill-switch** — `VITE_APP_OFFLINE=off|read|full` en `env.ts` y `.env.example`; documentar en un `KILL-SWITCH.md` propio.
3. **Persistencia de lectura** — `db.ts` (nombre de base `pigse-offline`, no reutilizar el de colombia), `query-persister.ts`, `query-meta.ts`, `session.ts` (limpieza por usuario y modo equipo compartido), `online-only-paths.ts` con los prefijos de PIGSE (`/app/administracion`, carga de documentos). Declarar `meta.offline` en listas de `document-management` y `monitoring`.
4. **App shell** — `vite-plugin-pwa` con la misma configuración (`/sw.js` con `Cache-Control: no-cache` en el Worker, `run_worker_first: ["/api/*"]`), `sw-update.ts`, manifest con nombre y colores de PIGSE.
5. **(Opcional) Outbox** — `lib/offline/outbox/*` tal cual; `features/offline/register-handlers.ts` y `/app/pendientes`. Handlers candidatos: edición de metadatos de documentos. `FILE_LIMITS.perFile` queda en 10 MB offline aunque PIGSE acepte 25 MB online (§0.4). Requiere `Idempotency-Key` en los endpoints de PIGSE (BE-1): verificar en el backend antes de empezar.
6. **Pruebas** — copiar `e2e/offline-resilience.spec.ts`, `offline-reads.spec.ts` adaptando rutas y usuarios fixture; `playwright.matrix.config.ts` para la matriz Chromium/Firefox/WebKit; checklist manual de [`CHECKLIST-MULTINAVEGADOR.md`](CHECKLIST-MULTINAVEGADOR.md) reducido a los pasos 1, 2, 8, 9, 12, 15.

## 3. Riesgos

- Divergencia: cada fix en `lib/offline` de colombia debe portarse a mano. Mitigación: mantener `lib/offline` sin imports de features y registrar en el PR de colombia si aplica a PIGSE; a futuro, paquete compartido.
- P6 (datos de menores en equipos personales) aplica igual en PIGSE si persiste datos de estudiantes: modo compartido por defecto.
- Backend de PIGSE: confirmar endpoint de health sin auth e idempotencia antes del paso 5.

## 4. Estimación

Pasos 1–4: 1,5–2 semanas front. Paso 5: 2 semanas + backend. Paso 6: 3–4 días.
