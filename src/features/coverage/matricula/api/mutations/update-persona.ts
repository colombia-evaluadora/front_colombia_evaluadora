import { patchMultipart } from "@/lib/files"
import {
  toUpdatePersonaBody,
  type UpdatePersonaBodyInput,
} from "@/features/coverage/matricula/api/mutations/to-update-persona-body"

export async function updatePersona(pkTusuario: number, input: UpdatePersonaBodyInput): Promise<void> {
  await patchMultipart(`/eval-col/usuarios/${pkTusuario}`, toUpdatePersonaBody(input), {})
}
