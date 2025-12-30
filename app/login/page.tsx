import LoginForm from "@/app/login/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="py-2 sm:py-6">
      <LoginForm />
    </div>
  );
}
