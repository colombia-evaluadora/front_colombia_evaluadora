# Proposal: Offline de meses (PWA)

## Por qué
Docentes y coordinadores de zonas rurales trabajan 100% sin conexión durante
meses y van a la ciudad un día a sincronizar. Lo construido hasta la Fase 4
asume ausencias cortas: sesión offline de 14 días, outbox de 14 días, queries
persistidas que se borran a los 3-30 días, y nada que proteja IndexedDB de la
evicción del navegador. Además, en testv2 la app mostraba "Esta sección
necesita conexión" apenas se abría sin red (diagnóstico en
`docs/offline/AUDITORIA-RUTAS.md`, PR #730).

Requisito: **PWA, sin Tauri/Electron.**

## Qué cambia
- Almacenamiento persistente (`navigator.storage.persist()`), monitoreo de
  cuota y guía de instalación de la PWA (iOS borra a los 7 días si no está
  instalada).
- Duración máxima offline configurable (`VITE_APP_OFFLINE_MAX_DAYS`, default
  180) que alinea sesión, outbox, snapshot del menú y retención de datos.
- Desbloqueo local con PIN (PBKDF2 en WebCrypto) y cifrado en reposo
  (AES-GCM) de IndexedDB; registro y revocación de equipos con borrado remoto.
- "Preparar todo para trabajar sin conexión": descarga reanudable de todo el
  año escolar, con progreso, adjuntos opcionales con tamaño y "última
  preparación" con indicador de antigüedad.
- Pantalla "Sincronizar ahora" con progreso por lotes, reanudable, y reporte
  (subidos, conflictos, rechazados con motivo) seguido de refresco completo.
- Backend: toda escritura lleva el instante de captura; se aceptan notas y
  asistencia de un periodo que cerró después de la captura; si no, flujo de
  solicitud al coordinador. Compatibilidad con clientes viejos y aviso de
  actualización obligatoria.
- Respaldo por USB: paquete de sincronización firmado y cifrado exportable e
  importable en otro equipo con internet.

## Impacto
Front: `lib/offline/*`, `components/offline/*`, `features/offline/*`, login,
router. Backend (sso): funciones de calificación/asistencia del planeador,
auth-center (equipos registrados), gateway (headers). Decisiones sobre datos
de menores quedan como defaults revisables: **P6 sigue pendiente**.
