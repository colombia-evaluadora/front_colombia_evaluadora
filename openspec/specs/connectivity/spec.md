# connectivity Specification

## Purpose
Describe cómo el front sabe si hay conexión con el servidor (`online`, `degraded`, `offline`) y cómo se lo muestra al usuario: un único `connectivityStore` alimentado por eventos del navegador, errores de red de axios y un heartbeat a `GET /eval-col/health`, con histéresis, detección de portal cautivo y un banner global bajo el header de `/app` (ver `src/lib/offline/connectivity.ts` y `src/components/layout/offline-banner.tsx`).

## Requirements

### Requirement: Estado único de conectividad
El sistema SHALL mantener un único `connectivityStore` con los estados `online`, `degraded` y `offline`, alimentado por `navigator.onLine`, los eventos `online`/`offline`, los errores de red reales de axios y un heartbeat, y MUST NOT considerar `navigator.onLine === true` como prueba de conexión.

#### Scenario: Evento offline del navegador
- **WHEN** el navegador emite `offline`
- **THEN** el estado pasa a `offline` de inmediato

#### Scenario: Errores de red repetidos
- **WHEN** ocurren 2 o más errores de red o timeouts en 60 s, o la latencia del heartbeat supera 4 s
- **THEN** el estado pasa a `degraded`

### Requirement: Heartbeat
El sistema SHALL consultar `GET /api/eval-col/health` (BE-4) cada 30 s en `online`, cada 10 s en `degraded` y con backoff hasta 60 s en `offline`, solo con la pestaña visible, y MUST validar que la respuesta sea `application/json` con un campo conocido.

#### Scenario: Portal cautivo
- **WHEN** `navigator.onLine` es verdadero pero el heartbeat recibe HTML o un 302
- **THEN** el estado es `degraded`
- **AND** el banner agrega "Puede que la red Wi-Fi requiera iniciar sesión."

#### Scenario: Solo eval-col caído
- **WHEN** el Worker responde pero eval-col devuelve 503
- **THEN** el estado es `degraded`

### Requirement: Histéresis
El paso de `offline` a `online` SHALL exigir 2 heartbeats correctos separados 3 s; el paso a `offline` MUST ocurrir solo por el evento `offline` o 2 fallas seguidas; el banner MUST esperar 1,5 s antes de aparecer.

#### Scenario: Red intermitente
- **WHEN** la red alterna cada pocos segundos
- **THEN** el banner no parpadea

### Requirement: Banner global de conexión
El layout de `/app` SHALL mostrar debajo del header un banner con `role="status"` y `aria-live="polite"` cuyo texto exacto depende del estado (ver escenarios); en `online` MUST estar oculto y hasta la Fase 2 MUST NOT mostrar acciones de cola.

#### Scenario: Pérdida de conexión
- **WHEN** el estado pasa a `offline` y se mantiene más de 1,5 s
- **THEN** aparece el banner `bg-navy-22 text-navy` con "Estás sin conexión. Puedes seguir consultando y registrando asistencia y calificaciones; se enviarán cuando vuelva la conexión."

#### Scenario: Sin conexión en una vista solo en línea
- **WHEN** el estado es `offline` y la vista actual es solo en línea
- **THEN** el banner dice "Estás sin conexión. Esta sección necesita conexión; tus datos guardados siguen disponibles en Planeador y Asistencia."

#### Scenario: Conexión degradada
- **WHEN** el estado es `degraded`
- **THEN** aparece el banner `bg-yellow-22 text-yellow` con "La conexión está lenta o inestable. Lo que guardes se enviará apenas se estabilice."

#### Scenario: Recuperación
- **WHEN** el estado vuelve a `online`
- **THEN** el banner se oculta

#### Scenario: Gateway caído
- **WHEN** el gateway responde 502 de Cloudflare
- **THEN** el banner degradado dice "No pudimos comunicarnos con el servidor" (no culpa a la red del usuario)
