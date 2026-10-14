# Tasks: Sagas del planeador (Fase 3)

## 1. Handlers
- [ ] 1.1 Extraer la orquestación de crear actividad a `actividad.crear` con ops encadenadas
- [ ] 1.2 Extraer la orquestación de editar actividad a `actividad.editar` respetando el orden real (P19)
- [ ] 1.3 `recursosOmitidos` en `lastResult` y en el resumen
- [ ] 1.4 Criterios como ops hermanas (equivalente a `allSettled`)

## 2. Ids temporales y borradores
- [ ] 2.1 `tmp:` + `idmap` + reescritura al enviar + guard en el cliente HTTP
- [ ] 2.2 Rutas `tmp:` resolubles localmente y redirección al id real
- [ ] 2.3 `drafts` en IndexedDB con Blobs

## 3. Reemplazo total y catálogos
- [ ] 3.1 Refetch del detalle antes de armar PUT de materiales/adaptaciones
- [ ] 3.2 Resolvers de catálogo desde cache persistido; bloqueo con copy si falta

## 4. Backend (PRs separados)
- [ ] 4.1 BE-3 opción B (aprobada): versión en `TACTIVIDAD`/`TUNIDAD`, PR propio en `sso`
- [ ] 4.2 BE-6 limpieza de archivos huérfanos > 7 días

## 5. Pruebas
- [ ] 5.1 Test que compara el orden de requests online vs outbox
- [ ] 5.2 E2E de aceptación con reinicio del equipo

## 6. Documentación
- [ ] 6.1 Corregir CLAUDE.md §6 con el orden real de la saga (X7), si P19 se confirma
