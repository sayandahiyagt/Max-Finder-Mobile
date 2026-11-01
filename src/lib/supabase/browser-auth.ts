import { createSupabaseBrowserClient } from "./browser";

export function subscribeToBrowserAuthState(
  onSignedInChange: (isSignedIn: boolean) => void,
) {
  const supabase = createSupabaseBrowserClient();
  let active = true;
  supabase.auth
    .getUser()
    .then(({ data: { user } }) => {
      if (active) onSignedInChange(Boolean(user));
    })
    .catch(() => {
      if (active) onSignedInChange(false);
    });
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) =>
    onSignedInChange(Boolean(session?.user)),
  );

  return () => {
    active = false;
    subscription.unsubscribe();
  };
}
