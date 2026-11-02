import type { FormActionState } from "@/lib/action-state";

export type SpottingFormValues = {
  species: string;
  breed: string;
  weightRange: string;
  spottedAt: string;
  spottedAtTimezoneOffset: string;
  description: string;
  distinguishingCharacteristics: string;
  locationLabel: string;
  latitude: string;
  longitude: string;
};

export type SpottingActionState = FormActionState<SpottingFormValues>;

export const initialSpottingActionState: SpottingActionState = {
  kind: "idle",
  message: "",
  values: null,
  submission: 0,
};
