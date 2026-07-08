export const PROCESS_RECORD_TYPES = ["planned", "actual"] as const;

export type ProcessRecordType = (typeof PROCESS_RECORD_TYPES)[number];

export const UNASSIGNED_TEAM_ID = "team-unassigned";

export const UNASSIGNED_TEAM_NAME = "製作班未定";
