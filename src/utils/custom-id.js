export function createUserScopedId(base, userId) {
  return `${base}:${userId}`;
}

export function parseUserScopedId(customId) {
  const parts = customId.split(':');
  const lastSegment = parts.at(-1);

  if (!/^\d{16,20}$/.test(lastSegment ?? '')) {
    return {
      base: customId,
      userId: null
    };
  }

  return {
    base: parts.slice(0, -1).join(':'),
    userId: lastSegment
  };
}
