# planeador-actividades Specification

## Purpose
Describe la consulta, creación y edición de actividades del planeador (`planeador-crear-actividad-page.tsx`, `planeador-editar-actividad-page.tsx`, `form-editar-actividad.tsx`).

## Requirements

### Requirement: Listado y calendario de actividades
El sistema SHALL listar las actividades del docente por día (`?dia`) y en calendario mensual, y mostrar el detalle en `ActividadDetallePanel` con `?actividad`, bajo query keys `["planeador", ...]`.

#### Scenario: Ver detalle
- **WHEN** el docente selecciona una actividad del rail
- **THEN** la URL toma `?actividad=<id>` y se muestra el panel de detalle

### Requirement: Creación multi-paso
Crear una actividad SHALL ejecutarse en el componente de página en este orden: crear actividad, materiales, instrumento, adaptaciones y criterios (estos con `Promise.allSettled`), sin registro persistente de los pasos pendientes.

#### Scenario: Navegador cerrado a mitad
- **WHEN** el navegador se cierra después de crear la actividad y antes del instrumento
- **THEN** la actividad queda creada sin instrumento y no hay forma de reanudar los pasos

#### Scenario: Recursos omitidos
- **WHEN** el PUT de materiales devuelve `recursosOmitidos`
- **THEN** la página avisa cuántos recursos no se adjuntaron

### Requirement: Edición multi-paso con orden real
Editar una actividad SHALL ejecutar: desvincular/vincular unidad, PUT de actividad (con evidencias y criterios), materiales, instrumento, estudiantes y adaptaciones. Los PUT de reemplazo total MUST reenviar por `archivoId` los archivos que deben conservarse.

#### Scenario: Instrumento sin tipo fijado
- **WHEN** el PUT de instrumento se envía antes de que el PUT de actividad fije `FK_TLV_INSTRUMENTO_EVALUACION`
- **THEN** el backend responde 400/22023

### Requirement: Borrador de formulario en sessionStorage
El formulario de actividad SHALL guardar un borrador en `sessionStorage` (`actividad-form-draft.ts`) para la vista previa de recursos.

#### Scenario: Recarga con blob URLs
- **WHEN** el borrador contiene URLs `blob:` y la pestaña se recarga
- **THEN** las URLs dejan de ser válidas y los archivos adjuntos se pierden
