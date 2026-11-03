/**
 * Alerta sonora de un aviso nuevo (HU 7). Se sintetiza con Web Audio (dos notas cortas) para no
 * servir un archivo de audio. notification-service ya decide si el aviso suena (`sonar`: sin
 * Ocupado, sin horario silencioso y con el sonido de la conversación encendido); acá se aplica el
 * apagado global del usuario y se evita una ráfaga de sonidos.
 *
 * Los navegadores bloquean el audio hasta la primera interacción con la página: si el contexto
 * sigue suspendido, el sonido simplemente no se oye (no es un error).
 */

const MIN_ENTRE_SONIDOS_MS = 1500

let ultimo = 0
let contexto: AudioContext | null = null

/** El evento `notification.created` pide sonar y el usuario no apagó el sonido. */
export function debeSonar(
  evento: unknown,
  sonidoActivo: boolean,
  archivadas: ReadonlySet<number> = new Set(),
): boolean {
  if (!sonidoActivo) return false
  if (typeof evento !== "object" || evento === null || (evento as { sonar?: unknown }).sonar !== true) return false
  // Conversación archivada = sin avisos. comms-service ya no los genera; esto cubre un aviso en
  // vuelo justo al archivar.
  const canal = canalDe((evento as { deep_link?: unknown }).deep_link)
  return canal == null || !archivadas.has(canal)
}

/** `?canal=` del deep link de un aviso del chat (`/app/comunicaciones/chat?canal=12&mensaje=3`). */
function canalDe(link: unknown): number | null {
  if (typeof link !== "string") return null
  const m = /[?&]canal=(\d+)/.exec(link)
  return m ? Number(m[1]) : null
}

/** `true` si se reprodujo (o se intentó); `false` si se omitió por la ventana anti-ráfaga. */
export function reproducirSonidoAviso(ahora = Date.now()): boolean {
  if (ahora - ultimo < MIN_ENTRE_SONIDOS_MS) return false
  ultimo = ahora
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return true
    contexto ??= new Ctx()
    const ctx = contexto
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined)
    const inicio = ctx.currentTime
    for (const [i, frecuencia] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      const t = inicio + i * 0.12
      osc.type = "sine"
      osc.frequency.value = frecuencia
      vol.gain.setValueAtTime(0.0001, t)
      vol.gain.exponentialRampToValueAtTime(0.15, t + 0.01)
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      osc.connect(vol).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  } catch {
    // Sin audio disponible: el aviso visual basta.
  }
  return true
}

/** Solo para pruebas. */
export function reiniciarSonidoAviso() {
  ultimo = 0
}
