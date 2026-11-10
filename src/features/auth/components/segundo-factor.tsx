import { useEffect, useState } from "react"
import QRCode from "qrcode"

import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import type { ConfiguracionApp } from "@/features/auth/api/segundo-factor"

/** QR de la app de autenticación + la clave para escribirla a mano (U.5.DOS.3). */
export function QrApp({ config }: { config: ConfiguracionApp }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    QRCode.toDataURL(config.uri, { margin: 1, width: 192 })
      .then((url) => vigente && setSrc(url))
      .catch(() => vigente && setSrc(null))
    return () => {
      vigente = false
    }
  }, [config.uri])

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      {src ? (
        <img src={src} alt="Código QR para la app de autenticación" className="size-44 rounded-lg border bg-white p-1" />
      ) : (
        <Skeleton className="size-44 rounded-lg" />
      )}
      <div className="text-sm">
        <p>
          1. Abra su app de autenticación (p. ej. Google Authenticator o Microsoft Authenticator) y escanee el
          código.
        </p>
        <p className="text-muted-foreground mt-2">
          ¿No puede escanear? Clave: <span className="font-mono font-semibold tracking-wider">{config.secreto}</span>
        </p>
      </div>
    </div>
  )
}

/** Los 10 códigos de respaldo, que solo se muestran esta vez. */
export function CodigosRespaldo({ codigos }: { codigos: string[] }) {
  function descargar() {
    const texto = [
      "Control Escolar — códigos de respaldo de la verificación en dos pasos",
      "Cada código sirve una sola vez. Guárdelos en un lugar seguro.",
      "",
      ...codigos,
    ].join("\n")
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "codigos-de-respaldo.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  function imprimir() {
    const w = window.open("", "_blank", "width=480,height=640")
    if (!w) return
    w.document.title = "Códigos de respaldo"
    const pre = w.document.createElement("pre")
    pre.style.font = "16px monospace"
    pre.textContent = ["Códigos de respaldo — Control Escolar", "", ...codigos].join("\n")
    w.document.body.appendChild(pre)
    w.print()
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2 rounded-lg border p-3 font-mono text-sm sm:grid-cols-5">
        {codigos.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" color="primary" onClick={descargar}>
          <FileDownloadOutlinedIcon data-icon="inline-start" />
          Descargar
        </Button>
        <Button variant="outline" color="primary" onClick={imprimir}>
          Imprimir
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">Cada código sirve una sola vez. Guárdelos en un lugar seguro.</p>
    </div>
  )
}
