# Design: Gateway de tiempo real

Fuente completa: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §4.1, §11.5, §14. Restricción transversal: **solo componentes self-hosted**.

## Context

- Un host Docker detrás de Cloudflare; el Worker reenvía `/api/*` al gateway (Spring Cloud Gateway + Traefik). Ninguno expone hoy rutas WS, aunque ambos las soportan (`lb:ws://`).
- El access token vive solo en memoria; la sesión se restaura con la cookie httpOnly `sso_refresh`.
- Infra reutilizable: Redis (pub/sub, TTL, Streams), RabbitMQ, Traefik + ACME, Alloy/Grafana.
- Escala esperada: 100–400 sockets por colegio en pico; ~20.000 con 50 colegios → 2 réplicas bastan.

## Goals / Non-Goals

**Goals**
- Entregar eventos servidor→cliente en < 2 s p95, sin duplicados tras reconexión.
- Autenticación compatible con token en memoria, sin exponer el JWT en URLs ni logs.
- Contrato de eventos estable que consumen notificaciones y luego chat y llamadas.

**Non-Goals**
- Mensajería de chat, presencia y "escribiendo" (→ `add-comunicaciones-mensajeria-mvp`).
- Escrituras por WS: todas siguen por REST.
- Señalización WebRTC (→ `add-comunicaciones-llamadas-livekit`).

## Decisions

### D-1.1 Gateway propio con WS nativo + Redis pub/sub
- **Decisión**: `comms-service` (Spring Boot) con WebSocket nativo y JSON propio; fan-out entre réplicas por Redis pub/sub; ruta `lb:ws://comms-service` en el gateway.
- **Alternativa en evaluación**: Centrifugo self-hosted sobre el Redis existente (presencia e historial incluidos; el backend publica por su API HTTP). Se decide tras el spike (pregunta abierta 3).
- **Alternativas descartadas**: STOMP sobre RabbitMQ (autorización por destino torpe y exponer el broker); SaaS (Pusher/Ably/Stream/Firebase) por el requisito self-hosted; polling por latencia y carga.

### D-1.2 Ticket de un solo uso
- **Decisión**: `POST /comms/ws-ticket` con Bearer devuelve `{ ticket, expiresIn: 30 }`; el ticket (aleatorio de 256 bits) se guarda en Redis con TTL 30 s y se consume en el handshake.
- **Alternativa descartada**: JWT en query string (queda en logs de Cloudflare/Traefik) o en cookie (el token no vive en cookie y obligaría a protección CSRF).

### D-1.3 `seq` por tópico y reanudación
- **Decisión**: cada evento lleva `seq` monotónico por tópico; el servidor conserva los últimos N (p. ej. 500 o 15 min) en Redis Streams. Al reconectar el cliente manda `resume { topic, afterSeq }`; si el hueco no está disponible responde `resync` y el cliente invalida las queries del tópico.
- **Alternativa descartada**: refetch total en cada reconexión; válido como fallback, caro como norma en redes escolares inestables.

### D-1.4 Cierre por reautenticación
- **Decisión**: el servidor cierra con `4001` cuando vence el token asociado al ticket y con `4003` si el usuario pierde acceso. Ante `4001` el cliente refresca, pide ticket y reconecta; ante `4003` no reintenta.
- **Alternativa descartada**: renovar el token por un mensaje dentro del socket; duplica la lógica de refresh que ya vive en `auth.ts`.

### D-1.5 Ruta de red
- **Decisión provisional**: `rt.<dominio>` proxied por Cloudflare sin Worker. El spike mide cierres en redeploy y límites del plan si se pasa por el Worker.
- **Alternativa de respaldo**: SSE (`EventSource` por `/api`) si WS por Cloudflare da problemas; el contrato de eventos no cambia.

### D-1.6 El WS no es fuente de verdad
- **Decisión**: los eventos solo hacen `setQueryData`/`invalidateQueries` sobre keys existentes; toda lectura sigue por REST + TanStack Query.
- **Alternativa descartada**: store propio alimentado por el socket; duplicaría la cache y rompería el plan offline (persister de Query).

## Risks / Trade-offs

- Cierres masivos en redeploy → reconexión con jitter (0–5 s) para evitar estampida.
- Proxies escolares que cortan WS inactivos → `ping` de aplicación cada 25 s.
- Servicio nuevo que operar → métricas y alertas desde el día uno.

## Migration Plan

1. Spike Fase 0 (Cloudflare + WS) y decisión WS propio vs Centrifugo.
2. Backend y ruta en `test` detrás de `VITE_APP_REALTIME_URL` (vacío = desactivado).
3. Front con fallback al polling actual mientras el flag esté apagado.

### Rollback
Vaciar `VITE_APP_REALTIME_URL`: el cliente no conecta y las pantallas vuelven a su polling.

## Open Questions

Decisiones pendientes del usuario (PLAN §10); ninguna se asume resuelta:

1. **Aprobación de esquema** en `sso`: este change no crea tablas (ticket en Redis), pero los siguientes sí; ¿se confirma que el historial de reanudación puede vivir solo en Redis?
2. **comms-service**: ¿se aprueba un microservicio nuevo o se embebe el gateway WS en un servicio existente?
3. **WS propio vs Centrifugo** self-hosted, y ruta de red (subdominio proxied sin Worker vs Worker vs SSE).
4. **Política de menores**: qué tópicos puede suscribir un estudiante o acudiente.
5. **Retención** del historial de reanudación (N eventos / minutos).
6. **iOS PWA**: sin impacto directo; el WS es el fallback cuando no hay push.
7. **ClamAV**: no aplica a este change.
