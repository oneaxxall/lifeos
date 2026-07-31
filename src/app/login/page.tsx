import * as React from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Masuk — LifeOS",
  description: "Masuk ke LifeOS.",
};

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
