# Tasks: Eventos de dominio

## 0. Decisiones previas (bloqueantes)
- [ ] 0.1 Aprobación de outbox/triggers en `sso`
- [ ] 0.2 Definir qué tipos reciben estudiantes y acudientes

## 1. Contrato
- [ ] 1.1 Documentar cada tipo (destinatarios, deep link, `dedupeKey`, agrupación, prioridad)

## 2. Backend (repo `sso`, fuera de este repo)
- [ ] 2.1 Outbox y publicador hacia `notificaciones.eventos` (tras aprobación)
- [ ] 2.2 Planeador: enviada a validación, aprobada, rechazada, intercambio
- [ ] 2.3 Asistencia: solicitud Regla 75 creada y resuelta
- [ ] 2.4 Informes: boletín, observaciones IA, consolidación
- [ ] 2.5 Establecimiento: asignación académica, rol asignado

## 3. Front
- [ ] 3.1 Mapa tipo → ícono/etiqueta/categoría en `ui-mappings.ts`
- [ ] 3.2 Invalidación de queries de dominio al recibir el evento
- [ ] 3.3 Corregir invalidaciones del planeador que no prefijan `actividades-mias`
- [ ] 3.4 Retirar polling por pantalla donde el evento ya esté activo
- [ ] 3.5 `pnpm exec tsc -b --noEmit` y `pnpm lint` en verde
