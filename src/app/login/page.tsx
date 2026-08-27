import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accedi</CardTitle>
          <CardDescription>Fabri GROUP - Area riservata desk e amministrazione</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
