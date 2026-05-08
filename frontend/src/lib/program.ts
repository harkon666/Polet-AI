export const POLET_PROGRAM_ID = '33ubr2bpviBt5iLQgb2C6eyczFuka7uhSoxDxBnQktKY';

export function shortProgramId(programId: string = POLET_PROGRAM_ID): string {
  return `${programId.slice(0, 8)}...${programId.slice(-6)}`;
}
