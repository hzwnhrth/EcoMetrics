"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DemoUser {
  id: string;
  name: string;
  title: string;
  role: string;
}

const ROLE_HINT: Record<string, string> = {
  owner: "full access incl. report sign-off",
  manager: "everything except sign-off",
  staff: "view + upload only",
};

export function LoginForm({
  demoUsers,
  redirectTo,
}: {
  demoUsers: DemoUser[];
  redirectTo: string;
}) {
  const [busy, setBusy] = useState(false);
  const [demoId, setDemoId] = useState(demoUsers[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function submit(body: Record<string, string>, path: string) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      // full navigation so the layout re-reads the session cookie
      window.location.href = redirectTo;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "sign-in failed");
      setBusy(false);
    }
  }

  const field = "flex flex-col gap-1.5";
  const label = "text-xs font-medium text-muted-foreground";
  const demoItems = Object.fromEntries(
    demoUsers.map((u) => [u.id, `${u.name} — ${u.title}`])
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demo accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pick a role to explore without typing credentials.
          </p>
          <div className="flex items-center gap-2">
            <Select value={demoId} onValueChange={(v) => setDemoId(v as string)} items={demoItems}>
              <SelectTrigger className="w-full min-w-0 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {demoUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.title} ({ROLE_HINT[u.role] ?? u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => submit({ demo_user_id: demoId }, "/api/auth/login")}
              disabled={busy || !demoId}
            >
              <LogIn data-icon="inline-start" />
              Enter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="signin">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3">
              <div className={field}>
                <label className={label} htmlFor="li-email">Email</label>
                <Input id="li-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className={field}>
                <label className={label} htmlFor="li-pass">Password</label>
                <Input id="li-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Demo accounts use the password “demo123”.</p>
              <Button
                className="w-full"
                disabled={busy || !email || !password}
                onClick={() => submit({ email, password }, "/api/auth/login")}
              >
                Sign in
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3">
              <div className={field}>
                <label className={label} htmlFor="su-name">Name</label>
                <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={field}>
                <label className={label} htmlFor="su-email">Email</label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className={field}>
                <label className={label} htmlFor="su-pass">Password (6+ characters)</label>
                <Input id="su-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                New accounts get the Staff role: view and upload only.
              </p>
              <Button
                className="w-full"
                disabled={busy || !name || !email || password.length < 6}
                onClick={() => submit({ name, email, password }, "/api/auth/signup")}
              >
                <UserPlus data-icon="inline-start" />
                Create account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
