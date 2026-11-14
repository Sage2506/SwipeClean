const hevcMain10Pattern = /\bVideo:\s*hevc\s*\(\s*Main\s*10\s*\)/i;

export function isHevcMain10(streamInfo: string): boolean {
  return hevcMain10Pattern.test(streamInfo);
}
