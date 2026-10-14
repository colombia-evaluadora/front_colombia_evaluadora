## ADDED Requirements

### Requirement: Service Worker de app shell
El build SHALL registrar un Service Worker (`vite-plugin-pwa`, `injectManifest`) que precachea todos los assets de `dist/` y responde navegaciones con `index.html`, y MUST NOT cachear ni interceptar requests a `/api`.

#### Scenario: Recarga sin red
- **WHEN** el usuario recarga `/app/planeador/actividades` sin conexión tras haberla visitado online
- **THEN** el shell y los chunks se sirven desde el precache

#### Scenario: Verificación pública de boletín
- **WHEN** se abre `/verificar/b/<codigo>` sin red en un equipo con la PWA
- **THEN** se sirve el shell y se muestra "No pudimos verificar el boletín porque no hay conexión. Intenta de nuevo cuando tengas internet."
- **AND** nunca se muestra un estado de verificación cacheado

### Requirement: Aviso de nueva versión
El SW SHALL usar `registerType: "prompt"` y mostrar un toast persistente "Hay una nueva versión de Colombia Evaluadora." con botón "Actualizar"; MUST NOT activar la nueva versión automáticamente mientras haya una sincronización en curso u operaciones pendientes.

#### Scenario: Deploy con pendientes
- **WHEN** hay una versión nueva y la outbox tiene operaciones pendientes
- **THEN** "Actualizar" queda deshabilitado con "Termina de sincronizar para actualizar" y se aplica al terminar el lote

### Requirement: Kill-switch del Service Worker
El sistema SHALL poder desactivar el offline con un flag remoto o de build (`off | read | full`) y con un build de emergencia cuyo SW se desregistra, borra sus caches y recarga los clientes, MUST NOT borrar IndexedDB y MUST servir `/sw.js` con `Cache-Control: no-cache`.

#### Scenario: SW defectuoso en producción
- **WHEN** se despliega el build de emergencia
- **THEN** los clientes desregistran el SW en su próxima carga y conservan la outbox

#### Scenario: Flag en off
- **WHEN** el flag remoto vale `off`
- **THEN** no se persisten queries y solo se muestra el banner de conectividad

### Requirement: Convivencia con MSW
El SW de la PWA MUST NOT registrarse cuando los mocks de MSW están activos (entorno `dev`).

#### Scenario: Entorno dev
- **WHEN** la app arranca con `VITE_APP_ENABLE_API_MOCKING=active`
- **THEN** solo se registra el worker de MSW

## REMOVED Requirements

### Requirement: Sin Service Worker de aplicación
**Reason**: La Fase 1 introduce un Service Worker de app shell.
**Migration**: Ver "Service Worker de app shell" y "Kill-switch del Service Worker".
