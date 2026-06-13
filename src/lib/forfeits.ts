export const PROOF_OPTIONS = [
  "Photo",
  "Video",
  "Voice note",
  "Screenshot",
  "Group chat enforcement",
] as const;

export type ProofOption = (typeof PROOF_OPTIONS)[number];
