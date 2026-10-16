# Tasks: Offline de meses (PWA)

## 0. Bug de testv2
- [x] 0.1 `/app` sin red aterriza en una pantalla apta offline (#730)
- [x] 0.2 Equipo personal por defecto con piloto `*` (#730)
- [x] 0.3 Banner y gate derivan de una sola lista; auditoría de rutas + e2e (#730)

## 1. Almacenamiento (D-1)
- [x] 1.1 `persist()`, `estimate()`, riesgos y tarjeta de estado en Preparar
- [x] 1.2 Botón de instalación (`beforeinstallprompt`) e instrucciones iOS
- [ ] 1.3 Aviso global al abrir la app si el almacenamiento no es persistente

## 2. Duración máxima (D-2, D-5)
- [x] 2.1 `VITE_APP_OFFLINE_MAX_DAYS` alinea sesión, outbox, menú y retención
- [x] 2.2 TTL por clase solo marca antigüedad; no borra antes del máximo
- [x] 2.3 `X-Client-Captured-At` en todas las escrituras de la outbox
- [x] 2.4 `VITE_APP_OFFLINE_MAX_DAYS` en `.env.example` (el `ENV_FILE` de test usa el default 180)

## 3. Sesión y equipos (D-3, D-4, D-8)
- [ ] 3.1 PIN local (PBKDF2) y pantalla de desbloqueo
- [ ] 3.2 Cifrado AES-GCM de queries/outbox/blobs
- [ ] 3.3 Registro/revocación de equipos y borrado remoto (requiere OK de esquema en sso)

## 4. Preparar todo y sincronizar (D-6, D-11)
- [ ] 4.1 Plan reanudable de todo el año + adjuntos con tamaño + antigüedad
- [ ] 4.2 Pantalla "Sincronizar ahora" con reporte y refresco

## 5. Backend (D-7)
- [ ] 5.1 Gateway propaga `X-Client-Captured-At`; funciones de nota/asistencia validan periodo abierto en la captura
- [ ] 5.2 Flujo de solicitud al coordinador para rechazos `PERIODO_CERRADO`
- [ ] 5.3 `X-Min-Client-Version` y aviso de actualización

## 6. USB (D-9)
- [ ] 6.1 Exportar/importar paquete firmado y cifrado
