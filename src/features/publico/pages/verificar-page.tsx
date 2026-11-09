import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { BackToHomeLink, PublicSplit } from "@/components/public/public-page"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ShieldCheckIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { paths } from "@/config/paths"

/**
 * U.4.COD.1 Verificación — escribir el código, para quien no puede escanear el QR.
 * Por ahora solo hay verificación de boletines (sso V559): el código lleva a
 * su página. Los demás documentos llegan con "Documentos emitidos" (Adm. §12.4).
 */
export function VerificarPage() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState("")
  const limpio = codigo.trim()

  return (
    <PublicSplit
      icon={ShieldCheckIcon}
      title="Verificar un documento"
      description="Compruebe que un documento lo emitió la plataforma."
      points={["Autenticidad en segundos", "Sin mostrar datos personales", "Con el código o el código QR"]}
      breadcrumb={["Verificar un documento"]}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (limpio) navigate({ to: paths.verificarBoletin.getHref(limpio) })
        }}
      >
        <Field>
          <FieldLabel htmlFor="codigo-verificacion">
            <span aria-hidden="true" className="text-red">*</span> Código de verificación
          </FieldLabel>
          <Input
            id="codigo-verificacion"
            required
            className="h-12"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="K7QM-4XPA-9TRB"
            autoComplete="off"
            spellCheck={false}
          />
          <FieldDescription>Escriba el código que aparece debajo del código QR del documento.</FieldDescription>
        </Field>
        <Button type="submit" size="lg" color="primary" disabled={!limpio}>
          Verificar
        </Button>
      </form>
      <BackToHomeLink />
    </PublicSplit>
  )
}
