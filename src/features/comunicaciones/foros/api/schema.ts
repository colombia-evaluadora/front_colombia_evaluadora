import { z } from "zod"

import { COLORES_ETIQUETA, ORDENES_FORO } from "@/features/comunicaciones/foros/api/types"

// Todo el estado de la pantalla vive en la URL: el deep link de una notificación
// (`?foro=&publicacion=&mensaje=`) abre la publicación y resalta la respuesta.
export const forosSearchSchema = z.object({
  foro: z.coerce.number().int().positive().optional().catch(undefined),
  publicacion: z.coerce.number().int().positive().optional().catch(undefined),
  mensaje: z.coerce.number().int().positive().optional().catch(undefined),
  orden: z.enum(ORDENES_FORO).optional().catch(undefined),
  etiqueta: z.coerce.number().int().positive().optional().catch(undefined),
  q: z.string().trim().max(200).optional().catch(undefined),
})

export type ForosSearch = z.infer<typeof forosSearchSchema>

export const MAX_TITULO = 150
export const MAX_ETIQUETAS = 5

export const publicacionSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Escribe un título para la publicación.")
    .max(MAX_TITULO, `El título admite hasta ${MAX_TITULO} caracteres.`),
  etiquetas: z.array(z.number()).max(MAX_ETIQUETAS, `Usa como máximo ${MAX_ETIQUETAS} etiquetas.`),
})

export const etiquetaSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe un nombre.").max(40, "Hasta 40 caracteres."),
  color: z.enum(COLORES_ETIQUETA),
  soloModeradores: z.boolean(),
})
