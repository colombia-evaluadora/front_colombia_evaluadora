/**
 * Declaraciones de tipos para `@microlink/react`: el paquete no incluye
 * sus propios `.d.ts` ni existe un `@types/microlink__react` en
 * DefinitelyTyped, así que se declaran acá las piezas mínimas que usamos.
 *
 * - `<Microlink>`: renderiza una tarjeta default con metadatos. Útil como
 *   fallback chico cuando la API no devuelve un screenshot.
 * - `fetchFromApi`: llamada directa a la API de microlink.io para traer
 *   los datos crudos (incluido `screenshot.url`, una imagen PNG de la
 *   página entera) y renderizar lo que queramos.
 */
declare module "@microlink/react" {
  import type { ReactElement } from "react"

  export interface MicrolinkMedia {
    url: string
    type?: string
    size?: number
    width?: number
    height?: number
  }

  export interface MicrolinkData {
    title?: string
    description?: string
    url?: string
    publisher?: string
    image?: MicrolinkMedia
    screenshot?: MicrolinkMedia
    logo?: MicrolinkMedia
  }

  export interface MicrolinkProps {
    url: string
    /**
     * Si falla la llamada a la API de microlink, se renderiza este fallback
     * en vez del componente. Útil para enlaces que la API no sabe
     * describir (sitios internos, intranets, links bloqueados tras login).
     */
    fallback?: ReactElement | null
  }

  export interface FetchFromApiOptions {
    /** Si es `true`, pide también `screenshot` (PNG de la página entera). */
    screenshot?: boolean
    /** Si se setea, hace la llamada sincrónica y devuelve la data en vez
     *  de una promesa. Útil para `await` en un componente React. */
    prerender?: boolean
  }

  export const fetchFromApi: (
    url: string,
    options?: FetchFromApiOptions,
  ) => Promise<MicrolinkData>

  export const getApiUrl: () => string
  export const imageProxy: (url: string) => string

  const Microlink: (props: MicrolinkProps) => ReactElement | null

  export default Microlink
}
