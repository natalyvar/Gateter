/**
 * Cuenta caracteres igual que el backend (len() de Python = code points),
 * no unidades UTF-16 como String.length: "😺".length === 2, pero cuenta 1.
 */
export const countChars = (text) => [...text.trim()].length;
