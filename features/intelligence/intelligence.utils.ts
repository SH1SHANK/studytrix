export function getRelativePath(fullPath: string, currentFolderPath: string): string {
  const normalizedFull = fullPath
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const normalizedRoot = currentFolderPath
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalizedFull.length === 0) {
    return "";
  }

  if (normalizedRoot.length === 0) {
    return normalizedFull.join(" > ");
  }

  let startIndex = 0;
  while (
    startIndex < normalizedRoot.length
    && startIndex < normalizedFull.length
    && normalizedRoot[startIndex] === normalizedFull[startIndex]
  ) {
    startIndex += 1;
  }

  const relative = normalizedFull.slice(startIndex);
  if (relative.length === 0) {
    return normalizedFull[normalizedFull.length - 1] ?? "";
  }

  return relative.join(" > ");
}
