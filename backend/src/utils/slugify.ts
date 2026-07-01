export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const uniqueSlug = (text: string): string => {
  const base = slugify(text);
  const timestamp = Date.now().toString(36);
  return `${base}-${timestamp}`;
};
