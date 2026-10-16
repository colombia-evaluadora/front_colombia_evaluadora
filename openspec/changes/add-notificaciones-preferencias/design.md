# Design: Preferencias de notificaciones

Fuente completa: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §6, §11.2–§11.4. Restricción transversal: **solo componentes self-hosted** (email por SMTP propio o el provider ya configurado en `provider_config`).

## Context

- El catálogo de tipos (change `add-notificaciones-centro`) declara canales por defecto y si el tipo es silenciable.
- `notification-service` ya despacha email real; push llega en `add-notificaciones-push-webpush`.
- Usuarios menores de edad: la Ley 1581 trata sus datos como sensibles; la política de comunicación con menores sigue abierta.

## Goals / Non-Goals

**Goals**
- El usuario controla push y email por tipo; la bandeja nunca pierde nada.
- Horario silencioso por usuario con piso institucional por rol.
- Entrega diferida correcta al terminar el horario.

**Non-Goals**
- Silenciar canales/conversaciones del chat (→ mensajería MVP).
- Suscripción del dispositivo a push (→ `add-notificaciones-push-webpush`).

## Decisions

### D-3.1 La bandeja no es desactivable
- **Decisión**: `in_app` es siempre verdadero en el servidor; el usuario solo controla `push` y `email`.
- **Alternativa descartada**: permitir apagar in-app; rompe el leído multi-dispositivo y la trazabilidad de comunicados con confirmación de lectura.

### D-3.2 Preferencias dispersas (solo excepciones)
- **Decisión**: se guardan solo filas que difieren del valor por defecto del tipo; el `GET` devuelve la matriz resuelta.
- **Alternativa descartada**: materializar tipo × usuario completo; crece con cada tipo nuevo y obliga a migrar datos.

### D-3.3 Piso institucional por rol
- **Decisión**: la institución define horario silencioso mínimo y tipos no silenciables por rol; la preferencia efectiva es la más restrictiva para push/email, excepto tipos `URGENTE_INSTITUCIONAL`, que atraviesan el horario.
- **Alternativa descartada**: solo preferencias individuales; no protege a estudiantes.

### D-3.4 Entrega diferida
- **Decisión**: lo retenido se marca `pendiente_hasta` en la entrega (no en la bandeja) y un job lo despacha al terminar el horario; si ya se leyó en la bandeja, no se envía.
- **Alternativa descartada**: descartar el push; el usuario no se enteraría de menciones fuera de horario.

### D-3.5 UI
- **Decisión**: TanStack Form + zod (patrón `form-academic-period.tsx`), matriz con `Switch` por celda, `date-picker` en modo `time` para el horario; zona horaria `America/Bogota` por defecto.
- **Alternativa descartada**: formulario `useState` + `safeParse` manual (legado, ver `CLAUDE.md` §7).

## Risks / Trade-offs

- Reglas confusas (usuario vs institución) → la UI muestra "Definido por tu institución" en celdas bloqueadas.
- Zonas horarias → todo en la zona del establecimiento.

## Migration Plan

1. Aprobación de esquema.
2. Valores por defecto equivalentes al comportamiento previo (todo activo salvo horario de estudiantes).
3. Página de preferencias visible con el centro.

### Rollback
Ignorar las preferencias en el consumidor (flag) y ocultar la página.

## Open Questions

Decisiones pendientes del usuario (PLAN §10):

1. **Aprobación de esquema**: `notificacion_preferencia` y `notificacion_horario_silencioso`; ¿dónde vive el piso institucional (tabla nueva o configuración)?
2. **comms-service**: sin impacto; todo vive en `notification-service`.
3. **Política de menores**: horario silencioso por defecto para estudiantes (propuesto 8 pm–6 am), si el estudiante puede modificar sus preferencias y si el acudiente puede verlas o fijarlas.
4. **Retención**: cuánto se conservan las entregas diferidas no despachadas.
5. **WS vs Centrifugo**: sin impacto.
6. **iOS PWA**: la matriz debe indicar que push no está disponible en iOS sin instalar.
7. **ClamAV**: no aplica.
