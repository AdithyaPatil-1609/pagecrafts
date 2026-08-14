export type FieldType = "text" | "richtext" | "image" | "color" | "select" | "list";

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
