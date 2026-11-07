export const orientacionKeys = {
  all: ["orientacion"] as const,
  lista: (tipo: string, params: unknown) => ["orientacion", tipo, params] as const,
  atencion: (id: number) => ["orientacion", "atencion", id] as const,
  estudiantes: (search: string) => ["orientacion", "estudiantes", search] as const,
  remisionesDe: (matricula: string) => ["orientacion", "remisiones-de", matricula] as const,
}
