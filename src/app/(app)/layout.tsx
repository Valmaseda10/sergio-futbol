import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { BottomNav, SideNav } from "@/components/nav/bottom-nav";
import { SyncBoot } from "@/components/sync/sync-status";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El middleware ya ha validado la sesión en esta misma petición: se
  // reutiliza el id de usuario que nos pasa por header en vez de volver a
  // llamar a getUser() (ese segundo viaje de red se notaba en cada
  // navegación, sobre todo en móvil).
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, rol, activo")
    .eq("id", userId)
    .single();

  if (!usuario || !usuario.activo) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SyncBoot />
      <TopBar nombre={usuario.nombre} rol={usuario.rol} />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 p-4 pb-28 md:pb-4">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
