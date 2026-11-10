import { LockIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { CamposDatos } from "@/features/gestion-estudiantil/inclusion/piar/utils/datos-piar"

export function TituloSensible({ children, requerido }: { children: React.ReactNode; requerido?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-normal">
      {requerido && <span className="text-red">*</span>}
      {children}
      <LockIcon className="size-4 text-muted-foreground" aria-label="Información sensible" />
    </span>
  )
}

// El formulario llega ya tipado desde cada página; aquí solo se recorren sus campos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormDatos = any

/** Voz, caracterización y valoración: comunes a Nuevo PIAR y a la ficha (información sensible, Regla 1). */
export function CamposDatosPiar({ form, abiertas = true }: { form: FormDatos; abiertas?: boolean }) {
  const area = (name: keyof CamposDatos, label: string, max: number, required = false) => (
    <form.AppField name={name}>{(f: FormDatos) => <f.TextareaField label={label} maxLength={max} required={required} />}</form.AppField>
  )
  return (
    <>
      <SeccionPlegable defaultAbierta={abiertas} titulo={<TituloSensible>Voz del estudiante y la familia</TituloSensible>} contentClassName="grid gap-5 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{area("gustos", "Gustos e intereses del estudiante", 1000)}</div>
        <div>{area("expectativas_estudiante", "Expectativas del estudiante", 1000)}</div>
        <div><form.AppField name="fuente_estudiante">{(f: FormDatos) => <f.TextField label="Fuente de las expectativas del estudiante" maxLength={200} showCounter />}</form.AppField></div>
        <div>{area("expectativas_familia", "Expectativas de la familia", 1000)}</div>
        <div><form.AppField name="fuente_familia">{(f: FormDatos) => <f.TextField label="Fuente de las expectativas de la familia" maxLength={200} showCounter />}</form.AppField></div>
      </SeccionPlegable>
      <SeccionPlegable defaultAbierta={abiertas} titulo={<TituloSensible requerido>Caracterización pedagógica</TituloSensible>} contentClassName="grid gap-5 p-4">
        {area("fortalezas", "Fortalezas y habilidades", 2000, true)}
        {area("barreras", "Barreras para aprender y participar", 2000, true)}
        {area("apoyos", "Apoyos que le resultan útiles", 2000)}
        {area("productos", "Productos de apoyo", 1000)}
      </SeccionPlegable>
      <SeccionPlegable defaultAbierta={abiertas} titulo={<TituloSensible requerido>Valoración pedagógica</TituloSensible>} contentClassName="grid gap-5 p-4">
        {area("valoracion", "Valoración pedagógica", 3000, true)}
      </SeccionPlegable>
    </>
  )
}
