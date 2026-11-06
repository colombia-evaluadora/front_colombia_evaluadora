/**
 * Datos protegidos (Regla 11), igual que `fn_fun_enmascarar_correo` / `_telefono` del SSO:
 * Ver detalle los muestra así aunque quien mira pueda editarlos.
 */
export function enmascararCorreo(correo: string): string {
  const valor = correo.trim()
  if (!valor || valor.includes("****")) return valor
  const [local, dominio = ""] = valor.split("@")
  if (!dominio) return `${local.slice(0, 2)}****`
  const extension = dominio.includes(".") ? `.${dominio.split(".").pop()}` : ""
  return `${local.slice(0, 2)}****@${dominio.slice(0, 2)}***${extension}`
}

export function enmascararTelefono(telefono: string): string {
  const valor = telefono.trim()
  if (!valor || valor.includes("***")) return valor
  return valor.length >= 8 ? `${valor.slice(0, 3)}***${valor.slice(-4)}` : `${valor.slice(0, 2)}***${valor.slice(-2)}`
}
