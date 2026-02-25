export function hasExplicitRepositoryContext(input: {
  pathname: string;
  isPersonalPath: boolean;
  isAcademicPath: boolean;
  hasRepoQueryParam: boolean;
}): boolean {
  if (input.isPersonalPath || input.isAcademicPath) {
    return true;
  }

  if (!input.hasRepoQueryParam) {
    return false;
  }

  return input.pathname !== "/";
}
