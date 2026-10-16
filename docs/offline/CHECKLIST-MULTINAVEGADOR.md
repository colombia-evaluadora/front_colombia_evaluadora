# Checklist multi-navegador offline (tarea 6.4)

Cierre de las fases 0–4 de [`PLAN-offline.md`](PLAN-offline.md) §12. Lo reproducible está automatizado; lo que depende del dispositivo real se valida a mano en `test` (testv2) antes del go/no-go ([`GO-NO-GO.md`](GO-NO-GO.md)).

## 1. Automatizado

```bash
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e:matrix             # e2e/*.spec.ts en Chromium, Firefox y WebKit (dev server + MSW)
pnpm test:e2e:matrix --project=webkit e2e/offline-writes.spec.ts   # un navegador / un spec
pnpm test:e2e:pwa                # app shell + SW (solo Chromium: build de producción)
```

Cubre: banner y estados de conectividad, lectura desde cache persistida, encolado y sincronización de la outbox, recarga a mitad de envío, dos pestañas, 401/403 durante el flush. WebKit de Playwright en Windows **no es Safari iOS**: no reproduce cuotas, evicción a los 7 días ni el comportamiento de PWA instalada.

Resultados de la primera corrida (2026-10-16, Windows 11, Playwright 1.61):

| Spec | Chromium | Firefox | WebKit |
|---|---|---|---|
| `offline-resilience.spec.ts` | ✔ | ✘ 1 de 4 ("recarga con la API caída… Reintentar recupera": no aparece el `ErrorPage`) | ✔ |
| `offline-reads.spec.ts` | ✔ | ✘ 5 (todos los escenarios con `context.setOffline`; el worker termina por timeout) | sin correr (corte por tiempo) |
| `offline-writes*.spec.ts` | ✔ (corrida de la Fase 2) | sin correr | sin correr |

**Pendiente**: investigar Firefox (sospecha: `context.setOffline` en Firefox no corta el heartbeat igual que en Chromium, o `navigator.locks`/IndexedDB en contexto efímero) y completar WebKit. Hasta entonces Firefox se valida a mano con la tabla de abajo.

## 2. Manual (por dispositivo)

Dispositivos: Chrome Android de gama baja, Safari iOS (navegador y app instalada en inicio), Chrome Windows, Firefox Windows. Usuario del piloto, equipo **personal** (desmarcar "equipo compartido").

| # | Paso | Esperado | Android | iOS Safari | iOS PWA | Chrome Win | Firefox |
|---|---|---|---|---|---|---|---|
| 1 | Iniciar sesión, "Preparar para usar sin conexión" | Progreso completo, sin errores | | | | | |
| 2 | Modo avión, recargar `/app/planeador/actividades` | App shell carga, datos desde cache, banner "Sin conexión" | | | | | |
| 3 | Registrar asistencia de un grupo sin red | "Guardado en este equipo…", badge pendiente | | | | | |
| 4 | Calificar 10 celdas de planilla sin red | Badges por celda; contador del header | | | | | |
| 5 | Editar un enunciado y activar un referente sin red | Encolado; inactivar deshabilitado | | | | | |
| 6 | Guardar observación de informe a mano sin red | Encolada; "Generar con IA" deshabilitado | | | | | |
| 7 | Abrir horario / asignaciones de un periodo sin red | Se ven; "Guardar" deshabilitado | | | | | |
| 8 | Abrir roles y menús sin red | "Esta sección necesita conexión" | | | | | |
| 9 | Volver a tener red | Un solo toast "Se sincronizaron N cambios"; `/app/pendientes` vacío | | | | | |
| 10 | Provocar conflicto (editar la misma celda desde otro equipo) | Diálogo de conflicto; "Conservar el mío" y "Usar el del servidor" funcionan | | | | | |
| 11 | Cerrar sesión con pendientes | Diálogo de bloqueo de cierre | | | | | |
| 12 | Ventana privada / incógnito | No persiste; aviso de modo sin almacenamiento | | | | | |
| 13 | Adjuntar soporte de 9 MB y de 11 MB sin red | 9 MB se encola; 11 MB "pesa más de 10 MB" | | | | | |
| 14 | Dejar el equipo 7+ días sin abrir (solo iOS) | Si Safari evictó: la app vuelve a pedir preparar; outbox perdida queda registrada | | | | | |
| 15 | Publicar una versión nueva con pendientes en cola | El SW actualiza sin perder la outbox | | | | | |

Anotar en cada celda ✔ / ✘ + versión del navegador; un ✘ en 2–11 es bloqueante para el go.
