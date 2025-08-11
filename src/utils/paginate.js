// src/utils/paginate.js
export function paginate(items, page = 1, limit = 50) {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    slice: items.slice(start, start + limit),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit))
  };
}
