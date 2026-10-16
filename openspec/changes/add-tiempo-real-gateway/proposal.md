# Change: Gateway de tiempo real propio (Fase 1 de comunicaciones)

## Why

Hoy no existe ningún `WebSocket`/`EventSource`/STOMP ni en el front ni en `sso`: todo "tiempo real" es *polling* (`refetchInterval` de 60 s en el prototipo de chat, banners por pantalla en planeador y asistencia). El centro de notificaciones, el chat y las llamadas necesitan un canal servidor→cliente de baja latencia (< 2 s) que respete la sesión con token en memoria y que sea **100 % self-hosted** (sin Pusher, Ably, Stream ni Firebase).

Fuente de diseño: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §2.3, §4.1, §11.5, §13.2 (change 1), §13.3 `tiempo-real`, §14.

## What Changes

- Gateway WebSocket propio (recomendado: `comms-service` Spring Boot con WS nativo + fan-out por el Redis existente; alternativa: Centrifugo self-hosted sobre el mismo Redis — **decisión abierta**).
- Autenticación por **ticket corto de un solo uso**: `POST /comms/ws-ticket` (Bearer) → ticket de 30 s → `wss://rt.<dominio>/ws?ticket=`. El access token nunca va en la URL ni en cookie.
- Protocolo JSON propio con sobre `{ type, seq, ts, data }`, suscripción por tópicos autorizados en el servidor (`user:<sub>` en esta fase) y `seq` monotónico por tópico.
- Reconexión con backoff exponencial + jitter y reanudación `resume { topic, afterSeq }`; si el servidor ya no tiene el historial responde `resync` y el cliente invalida las queries afectadas.
- Cierre con código de reautenticación (`4001`) al vencer el token; el cliente pide un ticket nuevo tras `POST /auth/refresh`.
- Front: `features/comunicaciones/realtime` (cliente, `RealtimeProvider`, `useRealtimeEvent`) que **solo parchea la cache de TanStack Query** (`setQueryData`/`invalidateQueries`), nunca es fuente de verdad.
- Publicación de eventos desde otros servicios vía el RabbitMQ existente (exchange `tiempo-real.eventos`), con patrón outbox donde haya escritura en BD.
- Despliegue: subdominio `rt.<dominio>` proxied por Cloudflare **sin Worker** (o por el Worker si el spike lo valida), Traefik + ACME existentes.

## Impact

- Specs: nueva `tiempo-real`.
- Código front: `src/features/comunicaciones/realtime/*`, `src/provider.tsx`, `src/lib/api-client.ts` (listas de endpoints para `/comms/ws-ticket`), `src/lib/auth.ts` (cerrar socket en logout), `src/config/env.ts` (`VITE_APP_REALTIME_URL`), handler MSW para el entorno `dev`.
- Backend `sso` (documentado aquí, implementado en su repo): servicio nuevo o Centrifugo, ruta en api-gateway/Traefik, consumo de RabbitMQ. **Sin cambios de esquema en este change** (el ticket vive en Redis con TTL).
- Infra: DNS `rt.`, reglas de Cloudflare, métricas en Grafana (sockets, latencia de fan-out, reconexiones).
- Bloqueado por: decisiones abiertas de `comms-service` y WS propio vs Centrifugo (ver `design.md`).
