// Formatos de fecha y de nombre comunes a las pantallas de Gestión Estudiantil.

/** `2026-10-28...` → `28/10/2026` sin pasar por zona horaria (es un DATE). */
export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return ""
  const [anio, mes, dia] = fecha.slice(0, 10).split("-")
  return `${dia}/${mes}/${anio}`
}

/** `14:35:00` → `14:35`. */
export function formatHora(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : ""
}

/** Timestamp de una acción o del cierre → `28/10/2026 14:35` (hora local del navegador). */
export function formatFechaHora(valor: string | null | undefined): string {
  if (!valor) return ""
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return valor
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y"])

/**
 * «Carolina Medina» → «C. Medina»: inicial del primer nombre + primer apellido. El backend solo
 * da el nombre completo (nombres y luego apellidos): con 2 o 3 palabras el apellido es la 2.ª;
 * con 4 o más, la penúltima. Las partículas («de», «del», «de la», «y») se unen al apellido.
 */
export function abreviarPersona(p: { nombre?: string | null } | string | null | undefined): string {
  const nombre = (typeof p === "string" ? p : p?.nombre)?.trim()
  if (!nombre) return ""
  const palabras = nombre.split(/\s+/)
  if (palabras.length === 1) return palabras[0]
  const apellido = palabras.length <= 3 ? 1 : palabras.length - 2
  let inicio = apellido
  while (inicio > 1 && PARTICULAS.has(palabras[inicio - 1].toLowerCase())) inicio--
  return `${palabras[0][0]}. ${palabras.slice(inicio, apellido + 1).join(" ")}`
}

/** `2027-05-18T09:00:00` → «18/05/2027 9:00 a. m.» (hora de Colombia tal cual, sin zona). */
export function formatFechaHora12(valor: string | null | undefined): string {
  if (!valor) return ""
  const [fecha, hora] = valor.split("T")
  if (!hora) return formatFecha(fecha)
  const [hh, mm] = hora.split(":").map(Number)
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${formatFecha(fecha)} ${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`
}
