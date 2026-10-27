/**
 * Regla única de formato de correo para crear o editar cuentas y personas.
 *
 * La parte local (antes de la @) solo admite ASCII: letras sin tilde, números
 * y los signos de RFC 5322. Es la misma regla que `EmailAddressPolicy` del SSO
 * (auth-center / sso-admin): el `@Email` de Java deja pasar tildes y ñ, pero
 * los proveedores de correo no entregan a esas direcciones y casi siempre son
 * un error de tipeo ("nacale.uninorte.edú@gmail.com").
 *
 * Además, sin puntos al inicio, al final ni seguidos antes de la @, y el
 * dominio con la forma que exige el `@Email` de Hibernate en el backend:
 * etiquetas de letras, números y guiones (sin empezar ni terminar en guion)
 * separadas por puntos, y una terminación de dos letras o más. Antes el
 * dominio aceptaba cualquier cosa (`KDJDJ++¨.COM`).
 */
export const CORREO_REGEX =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,}$/u

export const MENSAJE_CORREO_INVALIDO =
  "Ingresa un correo electrónico válido (ej. nombre@dominio.com): antes de la @ solo letras sin tilde, números y . _ - +, sin ñ ni espacios."
