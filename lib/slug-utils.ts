export function generateSlug(name: string, author: string): string {
  const cleanText = (text: string) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');

  const cleanName = cleanText(name);
  const cleanAuthor = cleanText(author);

  return `${cleanAuthor}-${cleanName}`;
}

export function validateSlug(slug: string): boolean {
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug) && slug.length <= 100 && slug.length >= 3;
}

export function resolveSlugConflict(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
}