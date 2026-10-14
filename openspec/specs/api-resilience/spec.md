# api-resilience Specification

## Purpose
Describe cómo el cliente HTTP y TanStack Query reaccionan hoy a errores, lentitud y caídas de red (`src/lib/api-client.ts`, `src/lib/react-query.ts`).

## Requirements

### Requirement: Toast global por error de request
El sistema SHALL mostrar un toast de error por cada request de axios fallida, incluidos los errores de red, con el texto de `getErrorMessage`, salvo probes, sesión vencida o cuando un `NoticeProvider` montado suprime el toast global.

#### Scenario: Error de red en varias queries
- **WHEN** la red cae y tres queries fallan con `Network Error`
- **THEN** se muestran tres toasts de error

#### Scenario: Pantalla con NoticeProvider
- **WHEN** falla una request mientras hay un `NoticeProvider` montado
- **THEN** no se muestra el toast global y la pantalla pinta el error con `getErrorMessage`

### Requirement: Sin timeout de requests
El cliente axios SHALL NOT configurar `timeout`; una request queda pendiente hasta que el navegador la resuelva o la aborte.

#### Scenario: Portal cautivo o red muy lenta
- **WHEN** el gateway no responde
- **THEN** la request permanece pendiente indefinidamente y el botón de guardado sigue en "Guardando…"

### Requirement: Política de reintentos de queries
TanStack Query SHALL usar los defaults `retry: false`, `refetchOnWindowFocus: false` y `staleTime: 60 s`, sin `networkMode` explícito.

#### Scenario: Falla transitoria
- **WHEN** una query falla una vez por error de red
- **THEN** pasa a estado de error sin reintentar

### Requirement: Traducción de errores del backend
El sistema SHALL traducir violaciones `UNIQUE` conocidas mediante `CONSTRAINT_MESSAGES` y, en otro caso, mostrar la primera línea del mensaje sin el prefijo `"Conflict: ERROR: "`.

#### Scenario: RAISE de PL/pgSQL
- **WHEN** el backend responde 409 con `Conflict: ERROR: El periodo está cerrado`
- **THEN** el usuario ve "El periodo está cerrado"
