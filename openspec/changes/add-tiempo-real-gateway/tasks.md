# Tasks: Gateway de tiempo real

## 0. Decisiones previas (bloqueantes)
- [ ] 0.1 Spike WS por Cloudflare (subdominio proxied sin Worker vs Worker) y registrar resultados
- [ ] 0.2 Decidir WS propio (`comms-service`) vs Centrifugo self-hosted
- [ ] 0.3 Aprobación del servicio nuevo en `sso`

## 1. Contrato
- [ ] 1.1 Documentar sobre `{ type, seq, ts, data }`, mensajes de control (`subscribe`, `resume`, `resync`, `ping`/`pong`) y códigos de cierre (`4001`, `4003`)
- [ ] 1.2 Documentar `POST /comms/ws-ticket` y el exchange RabbitMQ `tiempo-real.eventos`

## 2. Backend (repo `sso`, fuera de este repo)
- [ ] 2.1 Emisión y consumo de tickets en Redis (TTL 30 s, un solo uso)
- [ ] 2.2 Handshake, autorización de tópicos y fan-out por Redis pub/sub
- [ ] 2.3 Historial de reanudación (Redis Streams) y `resync`
- [ ] 2.4 Ruta `lb:ws://` en api-gateway/Traefik, DNS `rt.` y métricas

## 3. Front
- [ ] 3.1 `VITE_APP_REALTIME_URL` en `env.ts` y `.env.example` (vacío = desactivado)
- [ ] 3.2 Cliente WS con backoff + jitter, `ping` cada 25 s y `resume` por `seq`
- [ ] 3.3 `RealtimeProvider` montado solo con sesión; cierre en logout y cambio de usuario
- [ ] 3.4 `useRealtimeEvent(type, handler)` que parchea/invalida la cache de TanStack Query
- [ ] 3.5 Añadir `/comms/ws-ticket` a las listas de endpoints de `api-client.ts` que correspondan
- [ ] 3.6 Handler MSW de ticket + socket simulado para el entorno `dev`
- [ ] 3.7 `pnpm exec tsc -b --noEmit` y `pnpm lint` en verde
