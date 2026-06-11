export const STAGE_LABEL: Record<string, string> = {
  GROUP_STAGE: "Groups",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarters",
  SEMI_FINALS: "Semis",
  THIRD_PLACE: "3rd place",
  FINAL: "Final",
};

/** Stages that can trigger a forfeit vote (excludes 3rd place). */
export const VOTE_STAGES: { key: string; label: string }[] = [
  { key: "GROUP_STAGE", label: STAGE_LABEL.GROUP_STAGE },
  { key: "LAST_32", label: STAGE_LABEL.LAST_32 },
  { key: "LAST_16", label: STAGE_LABEL.LAST_16 },
  { key: "QUARTER_FINALS", label: STAGE_LABEL.QUARTER_FINALS },
  { key: "SEMI_FINALS", label: STAGE_LABEL.SEMI_FINALS },
  { key: "FINAL", label: STAGE_LABEL.FINAL },
];
