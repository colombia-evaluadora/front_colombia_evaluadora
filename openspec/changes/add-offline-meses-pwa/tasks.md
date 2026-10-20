# Tasks: Offline de meses (PWA)

## 0. Bug de testv2
- [x] 0.1 `/app` sin red aterriza en una pantalla apta offline (#730)
- [x] 0.2 Equipo personal por defecto con piloto `*` (#730)
- [x] 0.3 Banner y gate derivan de una sola lista; auditoría de rutas + e2e (#730)

## 1. Almacenamiento (D-1)
- [x] 1.1 `persist()`, `estimate()`, riesgos y tarjeta de estado en Preparar
- [x] 1.2 Botón de instalación (`beforeinstallprompt`) e instrucciones iOS
- [x] 1.3 Aviso global al abrir la app si el almacenamiento no es persistente

## 2. Duración máxima (D-2, D-5)
- [x] 2.1 `VITE_APP_OFFLINE_MAX_DAYS` alinea sesión, outbox, menú y retención
- [x] 2.2 TTL por clase solo marca antigüedad; no borra antes del máximo
- [x] 2.3 `X-Client-Captured-At` en todas las escrituras de la outbox
- [x] 2.4 `VITE_APP_OFFLINE_MAX_DAYS` en `.env.example` (el `ENV_FILE` de test usa el default 180)

## 3. Sesión y equipos (D-3, D-4, D-8)
- [x] 3.1 PIN local (PBKDF2) y pantalla de desbloqueo
- [x] 3.2 Cifrado AES-GCM de queries y payloads de la outbox (pendiente: blobs de adjuntos y Cache API de archivos)
- [ ] 3.3 (EN ESPERA de OK de esquema) Registro/revocación de equipos y borrado remoto (requiere OK de esquema en sso)

## 4. Preparar todo y sincronizar (D-6, D-11)
- [x] 4.1 Plan reanudable de todo el año + adjuntos con tamaño + antigüedad
- [x] 4.2 Pantalla "Sincronizar ahora" con reporte y refresco

## 5. Backend (D-7)
- [x] 5.1 Gateway propaga `X-Client-Captured-At`; funciones de nota/asistencia validan periodo abierto en la captura
- [x] 5.2 Lo capturado con el periodo cerrado sigue el flujo existente de solicitud al coordinador (Reglas 55/75); el periodo académico cerrado bloquea con CE422
- [x] 5.3 `X-Min-Client-Version` y aviso de actualización

## 6. USB (D-9)
- [x] 6.1 Exportar/importar paquete firmado y cifrado

## 7. Extras
- [x] 7.1 EE y Sedes: crear/editar/eliminar ocultos sin red
- [x] 7.2 Paquete USB: la firma ECDSA prueba integridad; la identidad la da la sesión del que importa (sin registro de equipos hasta aprobar D-3)

## 8. Ninguna carga infinita sin conexión (D-13)
- [x] 8.1 `OfflineAwareQueryClient`: `networkMode` por query (sin datos `always`, con datos `online`); `retry` sin reintentos sin red; mutaciones con `networkMode: "always"`
- [x] 8.2 Evaluar `networkMode: "offlineFirst"` como default global: descartado (decisión en design D-13)
- [x] 8.3 Mensajes sin conexión en `getErrorMessage`, `ErrorPage` y `NetworkSessionError` (lectura / escritura / sesión)
- [x] 8.4 `useOfflineStall` + `DataTable`, `Skeleton`, `Spinner`, `LoadingLabel`, `Select` y `ComboboxField` sin cargas infinitas
- [x] 8.5 Banner: "Parte de esta pantalla no está guardada en este equipo" (`meta.offlineOptional` para lo accesorio del header)
- [x] 8.6 E2E `offline-sin-preparar.spec.ts` (todas las rutas no administrativas sin Preparar) y `offline-all-routes.spec.ts` sigue verde

## 9. Guardar todo en el equipo (D-6 ampliado, D-12, D-14)
- [x] 9.1 "Preparar todo el año" cubre las listas con filtros: rail por día, calendario por mes y pestaña, unidades, referentes (todas las páginas y detalle), cascada de informes, calendarios y resúmenes de asistencia por sede/mes, listas de estudiantes de las próximas 2 semanas y catálogos de cada pantalla
- [x] 9.2 Motor compartido (una corrida a la vez, tareas opcionales, reanudable) y "Datos guardados: hace X" en el header
- [x] 9.3 Autopreparación incremental en segundo plano (al entrar, cada 4 h, dentro de la cuota; se apaga por equipo o con `VITE_APP_OFFLINE_AUTO_PREPARE=off`)
- [x] 9.4 App instalada: equipo personal sin checkbox ni piloto; respeta el kill-switch
- [x] 9.5 App instalada: todo el año al primer ingreso con progreso, incremental al volver la red y `persist()` automático
- [x] 9.6 App instalada: cerrar sesión bloquea (contraseña verificada en el equipo o PIN); "Borrar los datos de este equipo" con doble confirmación si hay pendientes
- [x] 9.7 E2E `offline-app-instalada` (matchMedia standalone) y `offline-all-routes` exige que nada falte tras preparar; unit de política, credencial local, motor y fechas
