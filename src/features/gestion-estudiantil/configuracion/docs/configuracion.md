# Configuración de Gestión Estudiantil

Ruta `/app/gestion-estudiantil/configuracion`, menú `CONFIGURACION_GE`. Todo es del establecimiento (sin Sede ni Jornada).

- Acceso: `GET /gestion-estudiantil/configuracion/acceso?ESTABLECIMIENTO=` → `puede_ver`, `puede_crear`, `puede_editar`,
  `puede_eliminar`, `puede_editar_umbrales`. Los botones se deshabilitan según estas banderas; no se ocultan.
- Pestaña activa en `sessionStorage` (`configuracion-ge-pestana`). La URL vieja `/catalogo-anotaciones` redirige aquí
  con la pestaña Catálogo (alias en `navigation/lib/route-access.ts`).
- Establecimiento y banderas: `hooks/use-configuracion-acceso.ts` (usa `hooks/use-establecimiento-configuracion.ts`; si
  `/establecimientos/opciones` da 403, el establecimiento sale de las sedes de la cascada de Informes).
- Campos: `components/campo-numerico.tsx` y `REJILLA_CAMPOS` (celdas de al menos 28rem, para que la etiqueta flotante
  del Field outlined quepa en una línea).
- Selectores: las opciones salen del backend (`select/INSTANCIA_DISCIPLINARIA`, `GET /sanciones/efectos`,
  `select/TIPO_COMPORTAMIENTO`, `select/TIPO_SITUACION`, `select/AVISO_ACUDIENTE_SM_SEGUIMIENTO`,
  `select/CAUSA_INASISTENCIA`, `select/GRADOS`). Sin lista en el backend, y por eso fijas: Estado (Activo/Inactivo,
  booleano `HABILITADO`) y las condiciones de la matrícula (CHECK de V638). Tiene duración es un Switch.
- Tablas: las tres muestran «Columnas visibles» con todas las columnas salvo acciones (clasificaciones, junto al título).
- Lógica en `hooks/` (estado, validación y envío); los componentes son de presentación.

| Pestaña | Endpoints | Permiso de escritura |
|---|---|---|
| Catálogo de anotaciones | los de `catalogo-anotaciones/api` | `puede_crear` / `puede_editar` / `puede_eliminar` (Eliminar también exige `!en_uso`) |
| Proceso disciplinario | `GET`/`PUT /proceso-disciplinario/plazos`; `clasificaciones` y `sanciones` (`/query`, `POST`, `PUT /:ID`, `PATCH /:ID/estado`, `PATCH /:ID/eliminar`); `GET /sanciones/efectos` | igual que el catálogo; plazos con `puede_editar` |
| Parámetros de riesgo | `GET`/`PUT /prevencion/parametros` (api de `prevencion/`, compartida) y `GET`/`PUT /prevencion/parametros/causas-reservadas` | `puede_editar` y el `puede_editar` de los parámetros |
| Servicio social | `GET`/`PUT /servicio-social/parametros` | `puede_editar` |
| Seguimiento de remisiones | `GET`/`PUT /configuracion-remisiones/plazo` (hooks de `reintegracion/api`) | `puede_editar` y el `puede_editar` del plazo |
| Niveles de convivencia | `GET`/`PUT /configuracion/niveles-convivencia` | `puede_editar_umbrales` (Administrador) |

## Ficheros

- `api/`: `types.ts`, `query-keys.ts`, `query/use-configuracion-query.ts`, `query/use-proceso-query.ts`,
  `query/use-riesgo-servicio-query.ts`, `mutations/niveles.ts`, `mutations/proceso.ts`, `mutations/riesgo-servicio.ts`.
- `hooks/`: `use-configuracion-acceso`, `use-establecimiento-configuracion`, `use-sancion-form`, `use-clasificacion-form`,
  `use-plazos-form`, `use-plazo-remisiones-form`, `use-niveles-form`, `use-parametros-riesgo-form`, `use-servicio-social-form`.
- `components/`: `encabezado-configuracion.tsx`, `campo-numerico.tsx`, `catalogo/catalogo-tab.tsx`,
  `riesgo/riesgo-tab.tsx` (movido desde Prevención), `servicio-social/servicio-social-tab.tsx`,
  `remisiones/remisiones-tab.tsx`, `niveles/niveles-tab.tsx`, `proceso-disciplinario/` (`proceso-tab.tsx`,
  `bloque-plazos.tsx`, `columns-proceso.tsx`, `search-sanciones.tsx`, `campos-catalogo.tsx`, `dialog-clasificacion.tsx`,
  `dialog-sancion.tsx`, `dialog-eliminar-proceso.tsx`).
- `utils/`: `pestana.ts`, `niveles.ts`, `proceso.ts`, `riesgo.ts`, `servicio-social.ts` (cada uno con test). Los errores del backend que son de un campo
  (duplicado, longitudes, efecto/duración, sector, días) se muestran inline (`errorBackendACampo`); el resto en banner.

## Bitácora

- Fase 1: página, ruta y redirección, acceso, catálogo como pestaña (acciones con `AccionesFila`), Seguimiento de
  remisiones y Niveles de convivencia.
- Corrección: la etiqueta de «Plazo de seguimiento de remisiones (días hábiles)» se partía en dos líneas; se arregla
  con `REJILLA_CAMPOS`, sin tocar el Field.
- Fase 2: Proceso disciplinario (plazos, clasificación de faltas, catálogo de sanciones).
- Fase 3: Parámetros de riesgo movidos desde Prevención (sin la pestaña ni `puede_parametros` allí), con aviso en
  salud mental y causas reservadas; Servicio social; sanciones con paginación del servidor; Tiene duración como Switch;
  «Columnas visibles» en todas las tablas; lógica extraída a `hooks/`.

## Pendientes

- Servicio social: el prototipo dice «Se puede marcar además el Noveno», pero el backend lo rechaza («El grado Noveno no
  es de la educación media ni un ciclo equivalente (Ciclo 5 o 6)»). El selector ofrece toda la lista GRADOS; no hay
  endpoint con solo los grados admitidos.
- `SubjectsMultiSelect` deja activa la X de los chips aunque esté deshabilitado: aquí se ignora el cambio sin permiso.
- Duración «Hasta fin del período» del prototipo: el backend solo guarda `TIENE_DURACION` (booleano); se muestra Sí/No.
- Eliminar es lógico en el backend (`active = false`).
