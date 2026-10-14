## ADDED Requirements

### Requirement: Clasificación de errores de red
El cliente HTTP SHALL exponer `isNetworkError(error)`, verdadero cuando no hay `response`, el código es `ECONNABORTED` o `ERR_NETWORK`, o el status es 502, 503, 504 o 520–524, y MUST reportar cada error de red al store de conectividad.

#### Scenario: Gateway caído
- **WHEN** una request recibe 502 de Cloudflare
- **THEN** `isNetworkError` es verdadero y la conectividad registra la falla

#### Scenario: Error de negocio
- **WHEN** una request recibe 409 con un `RAISE` de PL/pgSQL
- **THEN** `isNetworkError` es falso y el error se trata como hoy

### Requirement: Clave de idempotencia por mutación
El cliente SHALL enviar el header `Idempotency-Key` con un UUID v4 nuevo en cada mutación (no en lecturas por POST); el valor MUST conservarse si la misma operación se reintenta.

#### Scenario: Mutación enviada
- **WHEN** el docente guarda una calificación
- **THEN** la request lleva `Idempotency-Key` con un UUID v4

#### Scenario: Lectura por POST
- **WHEN** se ejecuta `evalCol.postRows` o `api.query`
- **THEN** la request no lleva `Idempotency-Key`

### Requirement: Timeouts de requests
El cliente axios SHALL abortar las requests a los 20 s y las multipart a los 120 s, permitiendo override por llamada; un timeout MUST clasificarse como error de red.

#### Scenario: Red 2G
- **WHEN** una request no responde en 20 s
- **THEN** se aborta, la UI deja de esperar y la conectividad pasa a `degraded`

#### Scenario: Subida de archivo lenta
- **WHEN** un multipart de 10 MB tarda 90 s
- **THEN** la subida no se aborta

## MODIFIED Requirements

### Requirement: Toast global por error de request
El sistema SHALL mostrar un toast de error por cada request fallida con error de negocio, con el texto de `getErrorMessage`, salvo probes, sesión vencida o cuando un `NoticeProvider` montado suprime el toast global. Los errores de red MUST NOT producir toasts; su único reflejo es el banner de conectividad.

#### Scenario: Error de red en varias queries
- **WHEN** la red cae y tres queries fallan con `Network Error`
- **THEN** no se muestra ningún toast
- **AND** aparece el banner de conexión

#### Scenario: Error de negocio
- **WHEN** una mutación falla con 409 y mensaje del backend
- **THEN** se muestra un toast con el mensaje limpio, como hoy

#### Scenario: Pantalla con NoticeProvider
- **WHEN** falla una request de negocio mientras hay un `NoticeProvider` montado
- **THEN** no se muestra el toast global y la pantalla pinta el error con `getErrorMessage`

### Requirement: Política de reintentos de queries
TanStack Query SHALL usar `retry` solo para errores de red, con un máximo de 2 reintentos, `networkMode: "online"` explícito, `refetchOnWindowFocus: false` y `staleTime: 60 s`. Las mutaciones MUST NOT reintentarse automáticamente.

#### Scenario: Falla transitoria
- **WHEN** una query falla una vez por error de red y el segundo intento responde
- **THEN** la query termina en éxito sin mostrar error

#### Scenario: Error de negocio en query
- **WHEN** una query falla con 400
- **THEN** no se reintenta

## REMOVED Requirements

### Requirement: Sin timeout de requests
**Reason**: Las requests colgadas en portales cautivos y redes lentas dejaban la UI en "Guardando…" indefinidamente.
**Migration**: Reemplazado por "Timeouts de requests" (20 s general, 120 s multipart).
