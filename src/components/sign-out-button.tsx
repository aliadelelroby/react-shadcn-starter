import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import AuthClient from "~/lib/auth/auth-client";
import { authQueryOptions } from "~/lib/auth/queries";

export function SignOutButton() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await AuthClient.logout();
        // Refresh the page to update auth state
        window.location.reload();
      }}
      type="button"
      className="w-fit"
      variant="destructive"
      size="lg"
    >
      Sign out
    </Button>
  );
}
