import { getStore } from "@/lib/store";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const store = await getStore();
  const demoUsers = store.users
    .filter((u) => u.demo)
    .map((u) => ({ id: u.id, name: u.name, title: u.title, role: u.role }));

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">EcoMetrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ESG Evidence &amp; Action — sign in to see the dashboard, priorities, actions and report.
        </p>
      </div>
      <LoginForm demoUsers={demoUsers} redirectTo={from && from.startsWith("/") ? from : "/"} />
    </div>
  );
}
