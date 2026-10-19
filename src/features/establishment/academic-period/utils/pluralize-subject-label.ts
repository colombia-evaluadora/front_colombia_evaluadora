const VOWELS = "aeiouáéíóú"

export function pluralizeSubjectLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return trimmed

  const lastChar = trimmed.slice(-1).toLowerCase()
  if (VOWELS.includes(lastChar)) return `${trimmed}s`

  const withoutAccents = trimmed.normalize("NFD").replace(/[̀-ͯ]/g, "")
  return `${withoutAccents}es`
}
