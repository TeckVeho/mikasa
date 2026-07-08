import type { ProcessRecordType } from "@logivoice/shared";

export function processRecordUniqueKey(
  projectId: string,
  processTypeId: string,
  teamId: string,
  date: Date,
  recordType: ProcessRecordType = "actual",
) {
  return {
    projectId_processTypeId_teamId_date_recordType: {
      projectId,
      processTypeId,
      teamId,
      date,
      recordType,
    },
  };
}

export const ACTUAL_RECORD_TYPE = "actual" as const;
export const PLANNED_RECORD_TYPE = "planned" as const;
