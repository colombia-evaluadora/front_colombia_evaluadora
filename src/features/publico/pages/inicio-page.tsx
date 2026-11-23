import { useState, type ComponentType } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  CaretRightIcon,
  ClockCountdownIcon,
  EnvelopeIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PersonAddIcon,
  QuestionFillIcon,
  ShieldCheckIcon,
  ShieldLockIcon,
  SignInIcon,
  ChalkboardTeacherIcon,
  UsersIcon,
  EyeSlashIcon,
  GlobeIcon,
  LockIcon,
  QuestionIcon,
  UserCircleIcon,
} from "@/components/ui/icons"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

type Tono = "primary" | "green" | "purple"

// Clases literales para que Tailwind las vea. Cada servicio tiene su color de
// acento para distinguirlos de un vistazo: primary = inscribir, verde = consultar
// el estado, morado = verificar documentos.
const TONOS: Record<Tono, string> = {
  primary: "bg-primary/10 text-primary",
  green: "bg-green/15 text-green",
  purple: "bg-purple/15 text-purple",
}

const SERVICIOS: { icon: Icon; tono: Tono; title: string; text: string; to: string }[] = [
  {
    icon: PersonAddIcon,
    tono: "primary",
    title: "Inscribir",
    text: "Inscripciones abiertas, con hasta 3 opciones de cupo en orden de preferencia, de uno o de varios establecimientos.",
    to: paths.publico.inscribir.getHref(),
  },
  {
    icon: MagnifyingGlassIcon,
    tono: "green",
    title: "Consultar inscripción",
    text: "Vea el estado de cada opción, su posición en el orden de admisión y su número de sorteo. Elija una opción o anule la inscripción.",
    to: paths.publico.consultarInscripcion.getHref(),
  },
  {
    icon: ShieldCheckIcon,
    tono: "purple",
    title: "Verificar un documento",
    text: "Compruebe con el código o el QR que un boletín, certificado, constancia o carné es auténtico, y si fue reemplazado o anulado.",
    to: paths.publico.verificar.getHref(),
  },
]

const PASOS = [
  { title: "Datos", text: "Del aspirante y de su acudiente." },
  { title: "Opciones de cupo", text: "Grado y hasta 3 opciones." },
  { title: "Código al correo", text: "Válido por 15 minutos." },
  { title: "Comprobante", text: "Con el número de inscripción." },
]

const PROTECCION: { icon: Icon; title: string; text: string }[] = [
  { icon: EnvelopeIcon, title: "Verificación por correo", text: "Cada trámite se confirma con un código que vence en 15 minutos." },
  { icon: EyeSlashIcon, title: "Sin exponer datos", text: "No mostramos datos de personas antes de verificar." },
  { icon: ClockCountdownIcon, title: "Intentos limitados", text: "5 intentos por código y bloqueo de 15 minutos." },
  { icon: ListChecksIcon, title: "Con trazabilidad", text: "Las acciones importantes quedan en la Bitácora." },
]

// El prototipo no trae el texto de las preguntas: redactadas con los datos de
// los informes (Cobertura §3.3, Adm. §12.4 y §13). Pendientes de validar.
const PREGUNTAS = [
  {
    q: "¿Necesito una cuenta para inscribir a un aspirante?",
    a: "No. La inscripción se confirma con un código que enviamos al correo del acudiente y vale 15 minutos. Al terminar recibe el comprobante con el número de inscripción.",
  },
  {
    q: "¿Cuántas opciones de cupo puedo elegir?",
    a: "Hasta 3, en orden de preferencia, de uno o de varios establecimientos.",
  },
  {
    q: "¿Cómo sé si un documento es auténtico?",
    a: "Escriba el código que aparece junto al código QR del documento, o escanee el QR. Verá si el documento es auténtico, si fue reemplazado por una versión más reciente o si fue anulado.",
  },
  {
    q: "Olvidé mi contraseña, ¿qué hago?",
    a: "Use ¿Olvidó su contraseña? con su número de documento. Si corresponde a una cuenta activa, le enviamos un enlace al correo registrado que vale 1 hora.",
  },
  {
    q: "¿Qué pasa si me equivoco varias veces?",
    a: "Después de 5 intentos fallidos el acceso se bloquea 15 minutos por seguridad.",
  },
]

/** U.1.INI.1 Página de inicio pública. No muestra datos de ninguna persona (Regla 31). */
export function InicioPage() {
  return (
    <>
      <Hero />
      <Section icon={GlobeIcon} title="Sin crear una cuenta" subtitle="Tres servicios abiertos a cualquier persona, protegidos con un código que llega al correo.">
        <div className="grid gap-4 md:grid-cols-3">
          {SERVICIOS.map((s) => (
            // Toda la tarjeta es el enlace (área de toque grande en móvil).
            <Link
              key={s.title}
              to={s.to}
              className="group bg-card focus-visible:ring-ring flex flex-col gap-3 rounded-xl border p-6 transition-shadow outline-none hover:border-primary-stroke hover:shadow-md focus-visible:ring-2"
            >
              <div className="flex items-start justify-between">
                <IconTile icon={s.icon} tono={s.tono} />
                <CaretRightIcon
                  className="text-muted-foreground group-hover:text-primary size-6 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </div>
              <h3 className="text-navy dark:text-foreground text-lg leading-snug font-bold">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.text}</p>
            </Link>
          ))}
        </div>
      </Section>

      <PasosInscripcion />

      <Section icon={UserCircleIcon} title="Si ya tiene cuenta" subtitle="El mismo ingreso para todos; la plataforma muestra lo que corresponde a cada perfil.">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="bg-card flex gap-4 rounded-xl border p-6">
            <IconTile icon={UsersIcon} />
            <div>
              <h3 className="text-base leading-snug font-bold">Acudientes y estudiantes</h3>
              <p className="text-muted-foreground text-sm">
                Consulte el avance académico, la matrícula, el seguimiento y las comunicaciones, y mantenga sus datos al día en Mi cuenta.
              </p>
            </div>
          </article>
          <article className="bg-card flex gap-4 rounded-xl border p-6">
            <IconTile icon={ChalkboardTeacherIcon} />
            <div>
              <h3 className="text-base leading-snug font-bold">Funcionarios de los establecimientos</h3>
              <p className="text-muted-foreground text-sm">
                Cobertura, gestión académica y estudiantil, comunicaciones y reportes, según el rol de cada persona.
              </p>
            </div>
          </article>
        </div>
        {/* "¿Olvidó su contraseña?" ya está en el formulario de inicio de sesión. */}
        <div className="mt-6">
          <Button color="primary" nativeButton={false} render={<Link to={paths.auth.login.getHref()} />}>
            <SignInIcon data-icon="inline-start" />
            Iniciar sesión
          </Button>
        </div>
      </Section>

      <Section icon={LockIcon} title="Su información está protegida" className="bg-[#f1f5fd] dark:bg-navy/25">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROTECCION.map((p) => (
            <li key={p.title} className="bg-card flex items-start gap-4 rounded-xl border p-5">
              <IconTile icon={p.icon} />
              <div>
                <p className="text-navy dark:text-foreground font-semibold">{p.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={QuestionIcon} title="Preguntas frecuentes">
        <Accordion className="bg-card rounded-xl border px-4">
          {PREGUNTAS.map((p) => (
            <AccordionItem key={p.q} value={p.q}>
              <AccordionTrigger>{p.q}</AccordionTrigger>
              <AccordionContent>{p.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </>
  )
}

function Hero() {
  return (
    // Fondo azul muy claro y plano (prototipo U.1.INI.1);
    // en modo oscuro se apoya en el navy para no deslumbrar.
    <section className="bg-[#f1f5fd] dark:bg-navy/25">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:py-16">
        <div className="flex flex-col items-start gap-5">
          <span className="bg-primary-22 text-primary rounded-full px-4 py-1.5 text-sm">
            Plataforma Colombia Evaluadora
          </span>
          <h1 className="text-navy dark:text-foreground text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
            La vida escolar de su <span className="sm:block">establecimiento,</span>
            <span className="sm:block">en un solo lugar</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Inscriba a un aspirante, consulte el estado de su inscripción y verifique documentos oficiales de manera fácil y segura.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              nativeButton={false}
              render={<Link to={paths.publico.inscribir.getHref()} />}
            >
              <PersonAddIcon data-icon="inline-start" />
              Inscribir
            </Button>
            <Button
              variant="outline"
              color="neutral"
              nativeButton={false}
              render={<Link to={paths.publico.consultarInscripcion.getHref()} />}
            >
              <MagnifyingGlassIcon data-icon="inline-start" />
              Consultar mi inscripción
            </Button>
          </div>
          <p className="flex items-center gap-2 text-sm">
            <QuestionFillIcon className="text-primary size-5" aria-hidden="true" />
            <span className="text-navy dark:text-foreground font-medium">¿Ya tiene cuenta?</span>
            <Link to={paths.auth.login.getHref()} className="text-primary font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
        <VerificarCard />
      </div>
    </section>
  )
}

/**
 * Pasos de la inscripción como línea de tiempo: horizontal desde md (círculos
 * unidos por una línea, texto centrado debajo) y vertical en móvil.
 */
function PasosInscripcion() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Mismo fondo que la sección principal (Hero). */}
        <div className="rounded-xl border bg-[#f1f5fd] p-6 sm:p-8 dark:bg-navy/25">
          <SectionHeader icon={ListChecksIcon} title="Cómo se inscribe un aspirante" />

          <ol className="mt-8 grid md:grid-cols-4">
            {PASOS.map((p, i) => (
              <li
                key={p.title}
                className="relative flex gap-4 pb-6 last:pb-0 md:flex-col md:items-center md:gap-3 md:px-3 md:pb-0 md:text-center"
              >
                {/* Conector hacia el siguiente paso: vertical en móvil, horizontal desde md. */}
                {i < PASOS.length - 1 && (
                  <span
                    aria-hidden
                    className="bg-primary-stroke absolute top-9 bottom-1 left-4 w-px md:top-4 md:bottom-auto md:left-[calc(50%+1.25rem)] md:h-px md:w-[calc(100%-2.5rem)]"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-card border-primary text-primary border-2",
                  )}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-navy dark:text-foreground font-semibold">{p.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function VerificarCard() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState("")
  const limpio = codigo.trim()

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        if (limpio) navigate({ to: paths.verificarBoletin.getHref(limpio) })
      }}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ShieldLockIcon className="text-primary size-5" aria-hidden="true" />
        Verificar un documento
      </h2>
      <p className="text-muted-foreground text-sm">Escriba el código que aparece junto al código QR del documento.</p>
      <Field variant="outlined">
        <FieldLabel htmlFor="inicio-codigo">Código del documento</FieldLabel>
        <Input
          id="inicio-codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="K7QM-4XPA-9TRB"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Button type="submit" color="primary" disabled={!limpio}>
        Verificar
      </Button>
    </form>
  )
}

function Section({
  icon,
  title,
  subtitle,
  className,
  children,
}: {
  icon: Icon
  title: string
  subtitle?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={className}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <SectionHeader icon={icon} title={title} subtitle={subtitle} />
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}

/** Título de sección: ícono a la izquierda y título (+ subtítulo) al lado; igual en todas. */
function SectionHeader({ icon, title, subtitle }: { icon: Icon; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} />
      <div>
        <h2 className="text-navy dark:text-foreground text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function IconTile({ icon: Icon, tono = "primary" }: { icon: Icon; tono?: Tono }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", TONOS[tono])}>
      <Icon className="size-5" aria-hidden />
    </span>
  )
}
