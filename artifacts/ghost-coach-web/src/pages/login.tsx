import type { AuthStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login({ auth }: { auth: AuthStatus }) {
  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google/start";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to Ghost Coach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Real calendar access is restricted to the configured
            <code className="ml-1 mr-1">ALLOWED_EMAIL</code>
            account.
          </p>
          {!auth.allowedEmailConfigured && (
            <p className="text-sm text-amber-700">
              The server does not have an allowed email configured yet.
            </p>
          )}
          <Button onClick={handleGoogleSignIn} className="w-full">
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
