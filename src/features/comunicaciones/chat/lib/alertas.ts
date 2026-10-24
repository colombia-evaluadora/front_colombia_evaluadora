import type { AlertasConversacion, Conversacion } from "@/features/comunicaciones/chat/api/types"

/** Medios de aviso de la conversación; sin campos (mock viejo), el defecto de comms-service. */
export function alertasDe(c: Pick<Conversacion, "alertaCampana" | "alertaSonido" | "alertaCorreo">): AlertasConversacion {
  return {
    campana: c.alertaCampana ?? true,
    sonido: c.alertaSonido ?? true,
    correo: c.alertaCorreo ?? false,
  }
}

/** "Campana, sonido y correo" / "Sin avisos". El sonido solo cuenta con la campana. */
export function describirAlertas(a: AlertasConversacion): string {
  const medios = [a.campana && "campana", a.campana && a.sonido && "sonido", a.correo && "correo"].filter(
    Boolean,
  ) as string[]
  if (medios.length === 0) return "Sin avisos"
  const texto = medios.length === 1 ? medios[0] : `${medios.slice(0, -1).join(", ")} y ${medios.at(-1)}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const MEDIOS_ALERTA: Array<{ clave: keyof AlertasConversacion; etiqueta: string }> = [
  { clave: "campana", etiqueta: "Campana" },
  { clave: "sonido", etiqueta: "Sonido" },
  { clave: "correo", etiqueta: "Correo" },
]
