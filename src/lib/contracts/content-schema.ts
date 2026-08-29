// "backgroundImage" is a photograph the section is painted with rather than one it
// contains. It is never model-filled: a generated site picks its own art direction, and
// this is the slot an owner reaches for afterwards when they want a different backdrop.
export type FieldType =
  | "text"
  | "richtext"
  | "image"
  | "backgroundImage"
  | "color"
  | "select"
  | "list";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  itemSchema?: Field[];
  maxLength?: number;
  /** Empty is legal. Used for facts the description may not give (phone, email). */
  optional?: boolean;
}

export interface ContentSection {
  key: string;
  label: string;
  fields: Field[];
}

export interface ContentSchema {
  sections: ContentSection[];
}
