const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function appPath(path: string): string {
  return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}
