import type { Comunicado } from "@/features/comunicaciones/chat/api/types"

export const comunicados: Comunicado[] = [
  {
    conversacionId: 8,
    titulo: "Suspensión de clases por mantenimiento",
    descripcion: "Información importante para toda la comunidad",
    audiencia: ["ESTUDIANTES", "DOCENTES", "PADRES", "DIRECTIVOS"],
    publicarEn: "2026-02-23T13:00:00.000Z",
    publicadoPor: "Rectoría",
    esCreador: false,
    contenidoHtml:
      "<p>Estimados estudiantes y padres de familia,</p><p></p><p>Les informamos que el día martes 24 de febrero<br>las clases serán suspendidas debido a trabajos<br>de mantenimiento en la infraestructura eléctrica.</p><p></p><p>Las actividades se reanudarán normalmente el miércoles.</p><p></p><p>Agradecemos su comprensión.</p>",
  },
]
