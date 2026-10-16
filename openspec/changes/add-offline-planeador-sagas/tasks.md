# Tasks: Sagas del planeador (Fase 3)

## 1. Handlers
- [x] 1.1 Extraer la orquestación de crear actividad a pasos de saga encadenados (`features/planeador/offline`)
- [x] 1.2 Extraer la orquestación de editar actividad respetando el orden real (P19, D-F3-2)
- [x] 1.3 `recursosOmitidos` en la nota del paso de materiales y en el aviso
- [x] 1.4 Criterios como ops hermanas (equivalente a `allSettled`)
- [x] 1.5 Crear/editar unidad como saga de un paso

## 2. Ids temporales y borradores
- [x] 2.1 `tmp:` + idmap persistido + resolución al enviar + guard en el cliente HTTP
- [ ] 2.2 Rutas `tmp:` resolubles localmente, fusión de ediciones en la creación y badge en el calendario (diferido, D-F3-8; hoy: franja "creadas sin conexión")
- [ ] 2.3 `drafts` en IndexedDB con Blobs (diferido, D-F3-9)

## 3. Reemplazo total y catálogos
- [x] 3.1 Refetch del detalle antes del primer paso de una edición encolada; archivos ya guardados por `archivoId`; subida memorizada por paso
- [ ] 3.2 Resolvers de catálogo desde cache persistido; bloqueo con copy si falta (los pasos se envían online, donde los resolvers funcionan)

## 4. Backend (PRs separados)
- [ ] 4.1 BE-3 opción B: versión en `TACTIVIDAD`/`TUNIDAD` (diferido: requiere OK explícito del cambio de esquema; interino D-F3-4 por huella)
- [ ] 4.2 BE-6 limpieza de archivos huérfanos > 7 días

## 5. Pruebas
- [x] 5.1 Orden de pasos de crear/editar (`build-sagas.test.ts`) y motor de sagas (`saga.test.ts`: orden, remapeo, bloqueo, omitir, reintentar, reinicio, FIFO entre sagas, guard `tmp:`)
- [x] 5.2 E2E: editar unidad sin red, recarga y sincronización (`e2e/offline-sagas.spec.ts`)

## 6. Documentación
- [x] 6.1 Orden real de la saga documentado en `design.md` (D-F3-2)
- [x] 6.2 Pasos de la saga en `/app/pendientes` y badges en cards
