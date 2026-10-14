## MODIFIED Requirements

### Requirement: Invalidación tras calificar
Calificar celda, bulk y observar SHALL invalidar las queries de planilla, de nota y `actividad.calificaciones(id)` de las actividades afectadas, de modo que todas las vistas abiertas reflejen el valor del servidor (X2 del plan).

#### Scenario: Panel de detalle abierto
- **WHEN** se califica desde la planilla con el `ActividadDetallePanel` en `?modo=grades`
- **THEN** el panel se refresca y muestra la nota nueva

#### Scenario: Calificación masiva
- **WHEN** se califican varias celdas en bloque
- **THEN** se invalida `actividad.calificaciones(id)` una vez por actividad afectada
