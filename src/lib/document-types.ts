export const DOCUMENT_ENTITY_TYPES = [
  "cliente",
  "contratto",
  "veicolo",
  "assicurazione",
  "multa",
  "sinistro",
  "officina",
  "fattura",
  "altro",
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];
