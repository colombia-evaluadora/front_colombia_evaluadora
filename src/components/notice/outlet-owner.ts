export interface OutletRegistration {
  id: string
  prioritario: boolean
}

/** Quién pinta el aviso entre los `NoticeOutlet` montados bajo un mismo provider. */
export function elegirDuenoOutlet(registros: readonly OutletRegistration[]): string | null {
  return (registros.find((r) => r.prioritario) ?? registros[0])?.id ?? null
}
