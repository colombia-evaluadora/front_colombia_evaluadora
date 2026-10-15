# Tasks: Web Push con VAPID propio

## 0. Decisiones previas (bloqueantes)
- [ ] 0.1 Aprobación explícita de `push_suscripcion` y del CHECK `WEBPUSH`
- [ ] 0.2 Decisión sobre iOS (PWA obligatoria o fallback)
- [ ] 0.3 Generar y custodiar claves VAPID por entorno (con backup)

## 1. Contrato
- [ ] 1.1 Documentar endpoints de clave pública y suscripciones
- [ ] 1.2 Documentar el payload mínimo `{ id, tipo, titulo, cuerpo }`

## 2. Backend (repo `sso`, fuera de este repo)
- [ ] 2.1 Tabla `push_suscripcion` y CHECK `WEBPUSH` (tras aprobación)
- [ ] 2.2 `WebPushProvider` (`aes128gcm`, TTL, `urgency`, 404/410 → inválida, backoff en 429/5xx)
- [ ] 2.3 Integración con preferencias y horario silencioso
- [ ] 2.4 Métricas de entregas y 410 en Grafana

## 3. Front
- [ ] 3.1 Handlers `push`, `notificationclick`, `pushsubscriptionchange` en `src/sw/sw.ts`
- [ ] 3.2 Hook de suscripción (estado del permiso, detección iOS standalone)
- [ ] 3.3 Botón "Activar en este dispositivo", guía de instalación iOS e instrucciones si está denegado
- [ ] 3.4 Lista de dispositivos suscritos en preferencias
- [ ] 3.5 Desuscribir en logout y cambio de usuario
- [ ] 3.6 Cerrar notificaciones del sistema al recibir `notification.read`
- [ ] 3.7 `pnpm exec tsc -b --noEmit` y `pnpm lint` en verde
