import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { BottomNav, SideNav } from "@/components/nav/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .single();

  if (!usuario || !usuario.activo) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar nombre={usuario.nombre} rol={usuario.rol} />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
