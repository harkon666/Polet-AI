export const POLET_PROGRAM_ID = 'fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q';

export function shortProgramId(programId: string = POLET_PROGRAM_ID): string {
  return `${programId.slice(0, 8)}...${programId.slice(-6)}`;
}
