import type { ActionState, FormActionState } from "@/lib/action-state";

export type LostPetReportFormValues = {
  petId: string;
  weightRange: string;
  lastSeenAt: string;
  lastSeenAtTimezoneOffset: string;
  contactMethod: string;
  contactValue: string;
  contactInstructions: string;
  description: string;
  locationLabel: string;
  latitude: string;
  longitude: string;
};

export type LostPetReportActionState = FormActionState<LostPetReportFormValues>;

export const initialLostPetReportActionState: LostPetReportActionState = {
  kind: "idle",
  message: "",
  values: null,
  submission: 0,
};

export type LostPetReportUpdateValues = {
  id: string;
  status: string;
  description: string;
};

export type LostPetReportUpdateActionState =
  FormActionState<LostPetReportUpdateValues>;

export const initialLostPetReportUpdateActionState: LostPetReportUpdateActionState = {
  kind: "idle",
  message: "",
  values: null,
  submission: 0,
};

export type LostPetReportRemovalActionState = ActionState;

export const initialLostPetReportRemovalActionState: LostPetReportRemovalActionState = {
  kind: "idle",
  message: "",
  submission: 0,
};
