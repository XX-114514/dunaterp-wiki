export type ContentBlock =
  | { kind: 'paragraph' | 'heading'; text: string }
  | { kind: 'equation' | 'code'; text: string; label: string }
  | { kind: 'figure'; src: string; alt: string; caption: string }
  | { kind: 'table'; caption: string; columns: string[]; rows: string[][]; collapsed?: boolean }
  | { kind: 'links'; links: { label: string; href: string }[] };
