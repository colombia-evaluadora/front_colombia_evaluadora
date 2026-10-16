# Change: Web Push con VAPID propio

## Why

`notification-service` solo tiene `FcmPushProvider` (Firebase Admin SDK, SaaS) y `FakePushProvider`; el front no maneja `push` en su Service Worker (`src/sw/sw.ts`). Para avisar a docentes y acudientes con la app cerrada se necesita Web Push estándar con **claves VAPID propias**, sin Firebase, OneSignal ni otro SaaS. El único tercero inevitable es el *push service* del navegador como transporte, con payload cifrado (RFC 8291) y mínimo.

Fuente de diseño: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §4.5, §12, §13.2 (change 4), §13.3 `notificaciones-push`, §14.5.

## What Changes

- `WebPushProvider` en `notification-service` (impl `WEBPUSH` en `provider_config`, ampliando el CHECK de `impl` — **cambio de esquema pendiente de aprobación**) con librería Java estándar, cifrado `aes128gcm`, TTL y `urgency`; 404/410 invalidan la suscripción.
- Tabla `push_suscripcion` (id, fk_usuario, endpoint UNIQUE, p256dh, auth, user_agent, plataforma, creada_en, ultimo_uso, invalida_en) (**pendiente de aprobación**).
- Endpoints `GET /notificaciones/push/vapid-public-key`, `POST /notificaciones/push/suscripciones`, `DELETE /notificaciones/push/suscripciones`.
- Payload mínimo `{ id, tipo, texto genérico }`: nunca contenido ni nombres de estudiantes; el contenido se pide autenticado al abrir.
- Service Worker: `push` (notificación con `tag = id`, `setAppBadge`), `notificationclick` (enfocar o abrir deep link + marcar leída), `pushsubscriptionchange` (re-suscribir). Se mantienen las reglas actuales (no interceptar `/api`, `SKIP_WAITING` manual).
- UX de permiso: nunca al cargar; botón "Activar en este dispositivo" en preferencias o banner suave tras una acción. Guía de instalación en iOS sin PWA; instrucciones si el permiso está denegado.
- Borrado de la suscripción en logout y al cambiar de usuario (equipos compartidos).
- Cierre de la notificación del sistema cuando se lee en otro dispositivo (`notification.read` → `getNotifications({ tag })` → `close()`).

## Impact

- Specs: nueva `notificaciones-push`.
- Código front: `src/sw/sw.ts`, `src/features/notificaciones/push/*` (suscripción, estado del permiso, lista de dispositivos), `src/lib/auth.ts` (desuscribir en logout), página de preferencias.
- Backend `sso`: `WebPushProvider`, tabla de suscripciones y CHECK de `impl` (**pendiente de aprobación**), secreto VAPID privado en el gestor de secretos.
- Operación: **perder la clave VAPID privada invalida todas las suscripciones** → backup del secreto.
- Depende de: `add-notificaciones-centro`, `add-notificaciones-preferencias`.
