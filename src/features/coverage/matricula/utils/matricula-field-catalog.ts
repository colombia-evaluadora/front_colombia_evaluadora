/**
 * Catálogo de campos del formulario de matrícula. El catálogo REAL de
 * "Configuración de parámetros requeridos" lo devuelve el backend
 * (`fn_matricula_config_obtener`, ver `use-matricula-field-config-query.ts`)
 * — esto queda solo como fixture para el mock (`mocks/db/matricula-field-
 * config.ts`), armado con las mismas 14 secciones que trae el backend real
 * para que MSW se vea igual de real.
 */
export interface MatriculaFieldCatalogEntry {
  /** Solo se usa para fabricar `fkCampo` en el mock — no viaja al backend. */
  id: string
  label: string
  /** No se puede des-requerir ni ocultar desde "Configuración de parámetros
   * requeridos" — sin esto el formulario de matrícula no tiene forma de
   * identificar al estudiante ni la sede. Queda fijo en `required: true,
   * visible: true` y sus switches se ven pero deshabilitados. */
  locked?: boolean
  /** Solo para el fixture del mock (`mocks/db/matricula-field-config.ts`):
   * `requerido` inicial cuando el campo no está `locked` — copia el default
   * confirmado contra el backend real (Documento de Identidad y Certificado
   * del año anterior vienen `requerido: true` de fábrica). Sin esto el mock
   * simula todo como opcional y el sheet de archivos se ve distinto en dev
   * que contra el backend real. */
  defaultRequired?: boolean
}

export interface MatriculaFieldCatalogSection {
  title: string
  fields: MatriculaFieldCatalogEntry[]
}

export const MATRICULA_FIELD_CATALOG: MatriculaFieldCatalogSection[] = [
  {
    title: "Información de matrícula",
    fields: [
      { id: "matricula-campus", label: "Sede", locked: true },
      { id: "matricula-shift", label: "Jornada", locked: true },
      { id: "matricula-grade", label: "Grado", locked: true },
      { id: "matricula-group", label: "Grupo", locked: true },
      { id: "matricula-status", label: "Estado de la matrícula" },
      { id: "matricula-specialty", label: "Carácter/Especialidad/Énfasis" },
    ],
  },
  {
    title: "Información del estudiante",
    fields: [
      { id: "student-document-type", label: "Tipo de documento del estudiante", locked: true },
      { id: "student-document-number", label: "Documento estudiante", locked: true },
      { id: "student-first-name", label: "Nombre del estudiante", locked: true },
      { id: "student-second-name", label: "Segundo nombre del estudiante" },
      { id: "student-last-name", label: "Primer apellido del estudiante", locked: true },
      { id: "student-second-last-name", label: "Segundo apellido del estudiante" },
      {
        id: "student-document-expedition-department",
        label: "Lugar expedición documento estudiante departamento",
      },
      {
        id: "student-document-expedition-municipality",
        label: "Lugar expedición documento estudiante municipio",
      },
      // `locked` aunque el catálogo real lo mande editable: el formulario
      // (`MatriculaStudentSection`) siempre lo valida como obligatorio sin
      // mirar la configuración — se fija acá para que el toggle de la
      // pantalla de configuración no prometa algo que el alta no respeta.
      { id: "student-birth-date", label: "Fecha de nacimiento", locked: true },
      { id: "student-birth-place-department", label: "Lugar de nacimiento departamento" },
      { id: "student-birth-place-municipality", label: "Lugar de nacimiento municipio" },
      { id: "student-gender", label: "Género del estudiante", locked: true },
      { id: "student-ethnicity", label: "Etnia/Resguardo" },
    ],
  },
  {
    title: "Domicilio del estudiante",
    fields: [
      { id: "student-residence-address", label: "Dirección del estudiante" },
      {
        id: "student-residence-department",
        label: "Lugar de residencia departamento estudiante",
      },
      {
        id: "student-residence-municipality",
        label: "Lugar de residencia municipio estudiante",
      },
    ],
  },
  {
    title: "Información de contacto del estudiante",
    fields: [
      { id: "student-contact-phone", label: "Teléfono de estudiante" },
      { id: "student-contact-email", label: "Email estudiante" },
    ],
  },
  {
    title: "Información académica del año anterior",
    fields: [
      { id: "previous-year-situation", label: "Situación del año anterior" },
      { id: "previous-year-condition", label: "Condición del estudiante fin del año anterior" },
      { id: "previous-institution", label: "Nombre de la institución anterior" },
      { id: "welfare-institution", label: "Institución bienestar de origen" },
    ],
  },
  {
    title: "Sector de origen",
    fields: [
      { id: "origin-private-sector", label: "Proviene del sector privado" },
      { id: "origin-another-municipality", label: "Proviene de otro municipio" },
      { id: "origin-which-municipality", label: "¿Cuál?" },
    ],
  },
  {
    title: "Víctima conflicto armado",
    fields: [
      { id: "conflict-victim-population", label: "Población víctima conflicto" },
      { id: "conflict-last-expelling-municipality", label: "Último municipio expulsor" },
    ],
  },
  {
    title: "Información complementaria",
    fields: [
      { id: "complementary-stratum", label: "Estrato socio económico del estudiante" },
      { id: "complementary-sisben", label: "Sisbén" },
      { id: "complementary-eps", label: "EPS" },
      { id: "complementary-ars", label: "ARS" },
      { id: "complementary-special-conditions", label: "Condiciones especiales del estudiante" },
      { id: "complementary-talent", label: "Talento del estudiante" },
    ],
  },
  {
    title: "Subsidio o beneficios",
    fields: [
      { id: "benefits-subsidized", label: "Subsidiado" },
      { id: "benefits-funding-source", label: "Fuente de recursos" },
      { id: "benefits-head-household-student", label: "Alumnos madre cabeza de familia" },
      { id: "benefits-head-household-children", label: "Hijos de madre cabeza de familia" },
      { id: "benefits-public-force-veteran", label: "Veteranos de la fuerza pública" },
      { id: "benefits-national-heroes", label: "Héroes de la nación" },
    ],
  },
  {
    title: "Información del acudiente",
    fields: [
      { id: "guardian-relationship", label: "Parentesco", locked: true },
      { id: "guardian-first-name", label: "Nombre del acudiente" },
      { id: "guardian-second-name", label: "Segundo nombre del acudiente" },
      { id: "guardian-last-name", label: "Primer apellido del acudiente" },
      { id: "guardian-second-last-name", label: "Segundo apellido del acudiente" },
      { id: "guardian-document-type", label: "Tipo de documento del acudiente", locked: true },
      { id: "guardian-document-number", label: "Documento acudiente" },
      {
        id: "guardian-document-expedition-department",
        label: "Lugar expedición documento acudiente departamento",
      },
      {
        id: "guardian-document-expedition-municipality",
        label: "Lugar expedición documento acudiente municipio",
      },
      { id: "guardian-gender", label: "Género del acudiente" },
    ],
  },
  {
    title: "Domicilio del acudiente",
    fields: [
      { id: "guardian-residence-address", label: "Dirección de acudiente" },
      { id: "guardian-residence-department", label: "Lugar de residencia departamento acudiente" },
      {
        id: "guardian-residence-municipality",
        label: "Lugar de residencia municipio acudiente",
      },
    ],
  },
  {
    title: "Información de contacto de acudiente",
    fields: [
      { id: "guardian-contact-phone", label: "Teléfono de acudiente" },
      { id: "guardian-contact-email", label: "Email acudiente" },
    ],
  },
  {
    title: "Información laboral del acudiente",
    fields: [
      { id: "guardian-employment-profession", label: "Profesión acudiente" },
      { id: "guardian-employment-entity-name", label: "Nombre de la entidad acudiente" },
      { id: "guardian-employment-entity-address", label: "Dirección de la entidad acudiente" },
      { id: "guardian-employment-entity-phone", label: "Teléfono de la entidad acudiente" },
      { id: "guardian-employment-entity-position", label: "Cargo entidad acudiente" },
    ],
  },
  {
    // Orden confirmado contra la respuesta real de `fn_matricula_config_
    // obtener` (colegio "colegio chino", 2026-09-13): Foto, Certificado
    // Médico, Documento de Identidad, Otros Documentos, Certificado del año
    // anterior — no es el mismo orden en que aparecen los campos en
    // `SUPPORT_FILE_FIELDS` (`form-create-matricula.tsx`), así que el mapeo
    // id↔clave de `MatriculaSupportFiles` se arma a mano ahí, no por índice.
    title: "Archivo de soporte",
    fields: [
      { id: "file-student-photo", label: "Foto del Estudiante" },
      { id: "file-medical-certificate", label: "Certificado Medico" },
      { id: "file-student-id-document", label: "Documento de Identidad", defaultRequired: true },
      { id: "file-other-documents", label: "Otros Documentos Relevantes" },
      {
        id: "file-previous-year-certificate",
        label: "Certificado de Estudios del Año Anterior",
        defaultRequired: true,
      },
    ],
  },
]
