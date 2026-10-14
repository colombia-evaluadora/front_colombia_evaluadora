## ADDED Requirements

### Requirement: Unidades temáticas sin conexión
Crear y editar unidades y sus ponderaciones SHALL encolarse en la outbox con la versión leída, y el servidor MUST ser quien valide la suma de ponderaciones.

#### Scenario: Ponderaciones que no suman 100
- **WHEN** al sincronizar el servidor rechaza las ponderaciones
- **THEN** la op queda "No guardado" con el mensaje del servidor

#### Scenario: Ponderación mayor a 100 por trigger
- **WHEN** el trigger `tr_tactividad_ponderacion_unidad` lanza un `RAISE`
- **THEN** la op queda `rejected` mostrando ese mensaje

### Requirement: Imágenes de recursos disponibles sin conexión
Si el docente lo elige en "Preparar para usar sin conexión", las imágenes de recursos SHALL guardarse por id de archivo y MUST NOT guardarse URLs de vista con token.

#### Scenario: Recurso con imagen offline
- **WHEN** el docente abre la vista previa de un recurso preparado sin red
- **THEN** la imagen se muestra desde la cache local
