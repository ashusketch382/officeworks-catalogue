/** "men's clothing" -> "mens-clothing" */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "men's clothing" -> "Men's clothing" */
export function toDisplayName(value: string): string {
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
