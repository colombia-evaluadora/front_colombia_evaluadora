import { api } from "@/lib/api-client"

/** 204 si se envió; 409 si la cuenta ya no está pendiente. Lo usan Establecimiento y Superadministradores. */
export async function resendActivation(correo: string): Promise<void> {
  await api.post("/auth/register/cval/funcionario/reenviar-activacion", { correo })
}
