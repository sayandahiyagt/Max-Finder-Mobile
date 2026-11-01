import type { ActionState, FormActionState } from "@/lib/action-state";

export type PetProfileFormValues = {
  name: string;
  species: string;
  breed: string;
  color: string;
  size: string;
  age: string;
  dateOfBirth: string;
  description: string;
};

export type PetProfileActionState = FormActionState<PetProfileFormValues>;

export type PetProfileAction = (
  previousState: PetProfileActionState,
  formData: FormData,
) => Promise<PetProfileActionState>;

export const initialPetProfileActionState: PetProfileActionState = {
  kind: "idle",
  message: "",
  values: null,
  submission: 0,
};

export type PetProfileDeleteActionState = ActionState;

export const initialPetProfileDeleteActionState: PetProfileDeleteActionState = {
  kind: "idle",
  message: "",
  submission: 0,
};
