# Design: Web Push con VAPID propio

Fuente completa: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §12, §14.5. Restricción transversal: **solo componentes self-hosted**; excepción inevitable y documentada: el push service del navegador como transporte cifrado.

## Context

- `notification-service` tiene `ProviderRegistry` con implementaciones por `provider_config.impl` (SMTP, RESEND, EMAILJS, TWILIO, VONAGE, FCM, FAKE).
- El front tiene Service Worker (`vite-plugin-pwa` `injectManifest`, Fase 1 offline) que no maneja push y no se registra con MSW activo.
- Equipos compartidos en colegios: varias personas usan el mismo navegador.

## Goals / Non-Goals

**Goals**
- Push en Android, escritorio (Chrome/Edge/Firefox/Safari ≥16) e iOS/iPadOS ≥16.4 con la PWA instalada.
- Ningún dato personal en el payload.
- Suscripciones limpias: una por usuario × navegador, eliminadas en logout.

**Non-Goals**
- Apps nativas.
- Emisión desde dominios concretos (→ `add-notificaciones-eventos-dominio`).

## Decisions

### D-4.1 VAPID propio en `notification-service`
- **Decisión**: `WebPushProvider` con librería Java de Web Push estándar y par de claves VAPID generado por el equipo; la privada en el gestor de secretos, la pública expuesta por endpoint.
- **Alternativas descartadas**: `FcmPushProvider` (exige proyecto Firebase y SDK de Firebase en el SW: SaaS); OneSignal y similares (SaaS).

### D-4.2 Payload mínimo
- **Decisión**: `{ id, tipo, titulo: "Colombia Evaluadora", cuerpo: "Tienes una notificación nueva" }`; el SW puede pedir el detalle autenticado solo si hay una pestaña abierta con sesión.
- **Alternativa descartada**: enviar título y cuerpo reales; expone datos de menores al push service de terceros y a la pantalla bloqueada.

### D-4.3 Invalidación por 404/410
- **Decisión**: respuesta 404/410 marca `invalida_en` y nunca se reintenta; 429/5xx reintenta con backoff y respeta `Retry-After`.
- **Alternativa descartada**: reintentar siempre; castiga al push service y puede bloquear la clave.

### D-4.4 Suscripción ligada a la sesión
- **Decisión**: el front borra la suscripción (`DELETE` + `unsubscribe()`) en logout y al detectar otro usuario; el backend acepta un `endpoint` repetido reasignándolo al usuario actual.
- **Alternativa descartada**: conservarla entre sesiones; en un equipo compartido el siguiente usuario vería avisos del anterior.

### D-4.5 Permiso solo tras gesto del usuario
- **Decisión**: `Notification.requestPermission()` solo desde un clic; en iOS sin `display-mode: standalone` se muestra la guía de instalación en lugar del botón.
- **Alternativa descartada**: pedir al cargar; los navegadores lo penalizan y la tasa de rechazo es alta.

### D-4.6 Service Worker
- **Decisión**: handlers `push`, `notificationclick` y `pushsubscriptionchange` en `src/sw/sw.ts`; `tag = id` para reemplazar y cerrar; la marca de leída se hace por `PATCH` con la sesión de la pestaña enfocada (el SW no tiene token).
- **Alternativa descartada**: guardar el token en el SW/IndexedDB; contradice la regla de token solo en memoria.

## Risks / Trade-offs

- Pérdida de la VAPID privada → todas las suscripciones dejan de funcionar; backup obligatorio.
- iOS sin instalar no recibe push → fallback in-app por WS + email digest.
- El SW no se registra con MSW (`dev`) → probar push en `test`.

## Migration Plan

1. Aprobación de esquema y generación de claves VAPID por entorno.
2. `WEBPUSH` activo en `test` para pilotos; `FAKE` sigue por defecto en el resto.
3. Botón "Activar en este dispositivo" visible solo si el provider está activo.

### Rollback
Volver `provider_config` a `FAKE`; las suscripciones quedan inertes y el front oculta el botón.

## Open Questions

Decisiones pendientes del usuario (PLAN §10):

1. **Aprobación de esquema**: `push_suscripcion` y ampliar el CHECK de `provider_config.impl` con `WEBPUSH`, ajustando la migración propietaria de `notification-service`.
2. **comms-service**: sin impacto; el emisor es `notification-service`.
3. **Política de menores**: ¿los estudiantes pueden suscribir dispositivos? ¿push para acudientes sobre sus hijos?
4. **Retención**: cuánto se conservan suscripciones inválidas o sin uso (propuesto: purga a 90 días sin `ultimo_uso`).
5. **WS vs Centrifugo**: el evento `notification.read` que cierra notificaciones llega por el gateway elegido.
6. **iOS PWA**: ¿se exige instalar la PWA para recibir notificaciones en iOS o basta el fallback in-app + email?
7. **ClamAV**: no aplica.
