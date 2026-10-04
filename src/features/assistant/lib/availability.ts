// El asistente todavía no tiene un modelo detrás: mientras sea `false` el
// sheet se muestra en estado "Próximamente" (sin mensajes y con el composer
// deshabilitado). Al conectar el modelo real basta con reemplazar la conexión
// de `mock-chat.ts` y poner esto en `true`.
export const ASSISTANT_DISPONIBLE = false

export const ASSISTANT_PROXIMAMENTE_MENSAJE =
  "El asistente de Colombia Evaluadora estará disponible próximamente."
