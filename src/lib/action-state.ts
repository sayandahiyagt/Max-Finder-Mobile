export type FormActionState<TValues> =
  | { kind: "idle"; message: ""; values: null; submission: number }
  | {
      kind: "error";
      message: string;
      values: TValues;
      submission: number;
    };

export type ActionState =
  | { kind: "idle"; message: ""; submission: number }
  | { kind: "error"; message: string; submission: number };
