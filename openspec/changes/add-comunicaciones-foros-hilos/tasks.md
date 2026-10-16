# Tasks: Foros de comunicaciones

## 1. Backend (repo `sso`)
- [x] 1.1 V560 editada: `tcanal.tipo` admite `FORO` e índice de nombre único para `CANAL` y `FORO`
- [x] 1.2 V585: `tforo_etiqueta`, `thilo` (FTS español, GIN), `thilo_etiqueta`, `thilo_mensaje`, `thilo_seguidor`, auditoría CDC
- [x] 1.3 V586: menú `FOROS` (`/app/comunicaciones/foros`) para los roles que tienen `COMUNICACIONES`
- [x] 1.4 `comms-service`: `foro/*` (REST, reglas, notificaciones, tópico `foro:`), política `comms.politica.foros`
- [x] 1.5 `notification-service`: tipos `FORO_MENCION` y `FORO_RESPUESTA` en el catálogo
- [x] 1.6 Test de integración (Testcontainers) del flujo completo y checks de Flyway

## 2. Front
- [x] 2.1 Tipos, claves, schema de búsqueda y hooks de lectura con `meta.offline`
- [x] 2.2 Mutaciones (publicar, responder, editar, reaccionar, seguir, resolver, fijar, cerrar, etiquetas, eliminar)
- [x] 2.3 Tiempo real `foro:<id>` + `canal:<id>`
- [x] 2.4 Pantalla `/app/comunicaciones/foros`: lista de foros, listado con orden/etiqueta/búsqueda, detalle hilado, diálogos
- [x] 2.5 Escrituras deshabilitadas sin conexión (`useOnlineOnly`)
- [x] 2.6 Mocks MSW con el contrato real y tests (`foros.test.ts`, `comunicaciones-foros.test.ts`)
- [x] 2.7 Ruta, migas y dueño de menú (`route-menu-ownership.test.ts`)

## 3. Pendiente
- [ ] 3.1 Adjuntos reales por file-service (hoy viajan nombre y formato, igual que el chat)
- [ ] 3.2 Aprobación institucional de la política de foros con menores (`pendienteDeAprobacion`)
