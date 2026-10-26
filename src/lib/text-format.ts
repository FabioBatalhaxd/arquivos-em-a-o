/** Translates English gender labels used in spreadsheets (woman/women → Feminino, man/men → Masculino). */
export function translateGender(value: string): string {
  return value
    .replace(/\bwom[ae]n\b/gi, 'Feminino')
    .replace(/\bfemale\b/gi, 'Feminino')
    .replace(/\bm[ae]n\b/gi, 'Masculino')
    .replace(/\bmale\b/gi, 'Masculino');
}

// Short all-caps words (UF, CD, SFS, AG.) and anything with digits are acronyms/codes and keep their original form.
const ACRONYMS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO CD SFS AG. BF UF SLA ID'.split(' '));
const keep = (word: string) => /\d/.test(word) || ACRONYMS.has(word);

/** Display-only sentence case: "EM TRÂNSITO" → "Em trânsito", preserving acronyms and codes. */
export function displayText(value: string): string {
  if (!value) return value;
  const out = value.split(/(\s+)/).map(w => (keep(w) ? w : w.toLocaleLowerCase('pt-BR'))).join('');
  return out.charAt(0).toLocaleUpperCase('pt-BR') + out.slice(1);
}
