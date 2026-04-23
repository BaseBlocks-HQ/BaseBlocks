import type { LibraryEntity } from "../types";

export function searchLibraryEntities(
  query: string,
  entities: Iterable<LibraryEntity>,
  limit = 20,
) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  return Array.from(entities)
    .map((entity) => {
      const name = entity.name.toLowerCase();
      const path = entity.path.toLowerCase();
      let score = -1;

      if (name === trimmed) score = 1000;
      else if (name.startsWith(trimmed)) score = 500;
      else if (name.includes(trimmed)) score = 250;
      else if (path.includes(trimmed)) score = 100;

      return { entity, score };
    })
    .filter((result) => result.score >= 0)
    .sort(
      (a, b) => b.score - a.score || a.entity.path.localeCompare(b.entity.path),
    )
    .slice(0, limit)
    .map((result) => result.entity);
}
