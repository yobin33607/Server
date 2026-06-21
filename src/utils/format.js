export function formatTimestamp(value) {
  if (!value) {
    return '`never`';
  }

  const unix = Math.floor(new Date(value).getTime() / 1000);
  return `<t:${unix}:F>`;
}

export function formatBoolean(value) {
  return value ? '`enabled`' : '`disabled`';
}
