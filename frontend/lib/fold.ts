// Lets someone type "muhendislik" and still match "Mühendisliği". NFD strips
// the accents, but not the dotless ı, so that gets its own replace.
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}
