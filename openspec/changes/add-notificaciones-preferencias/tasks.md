# Tasks: Preferencias de notificaciones

## 0. Decisiones previas (bloqueantes)
- [ ] 0.1 Aprobación explícita del esquema de preferencias y horario silencioso
- [ ] 0.2 Política de menores: horario por defecto y permisos de edición de estudiantes/acudientes

## 1. Contrato
- [ ] 1.1 Documentar `GET/PUT /notificaciones/preferencias` (matriz resuelta, celdas bloqueadas)
- [ ] 1.2 Documentar el piso institucional por rol y la prioridad `URGENTE_INSTITUCIONAL`

## 2. Backend (repo `sso`, fuera de este repo)
- [ ] 2.1 Tablas de preferencias y horario (tras aprobación)
- [ ] 2.2 Evaluación de reglas en el consumidor antes de push/email
- [ ] 2.3 Job de entrega diferida que omite lo ya leído
- [ ] 2.4 Email digest diario de no leídas

## 3. Front
- [x] 3.1 Query y mutación de preferencias (`["notificaciones", "preferencias"]`)
- [x] 3.2 Ruta `/app/notificaciones/preferencias` (`paths.ts` + `createRoute` + `routeTree` + miga)
- [ ] 3.3 Formulario TanStack Form + zod: matriz tipo × canal, horario silencioso, silencios temporales (matriz y horario hechos; falta silencio temporal por tipo)
- [ ] 3.4 Acción "Silenciar este tipo" en la bandeja
- [x] 3.5 Handlers MSW
- [x] 3.6 `pnpm exec tsc -b --noEmit` y `pnpm lint` en verde
