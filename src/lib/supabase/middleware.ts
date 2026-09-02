import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";

const PUBLIC_PATHS = [
  "/login",
  "/solicitar-acceso",
  "/auth",
  "/pendiente-aprobacion",
  "/api/solicitudes/registrar",
  // El feed de calendario lo consume la app Calendario del iPhone, que no
  // manda cookies de sesión; se autentica con el token de la propia URL.
  "/api/calendario",
  // Archivos de la PWA: el navegador los pide en segundo plano (para
  // comprobar si se puede instalar, o desde el service worker) sin
  // sesión iniciada necesariamente; el matcher de abajo no los excluye
  // por extensión (.json/.js no están en la lista de estáticos), así
  // que sin esto se redirigían a /login y el manifest/SW dejaban de
  // funcionar para quien todavía no ha iniciado sesión.
  "/manifest.json",
  "/sw.js",
  "/offline.html",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function updateSession(request: NextRequest) {
  // Se reenvía como header para que las Server Components de (app) no tengan
  // que volver a llamar a getUser() (evita un segundo viaje de red idéntico
  // en cada navegación).
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!user && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  if (!publicPath) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!perfil) {
      const url = request.nextUrl.clone();
      url.pathname = "/pendiente-aprobacion";
      return NextResponse.redirect(url);
    }
  }

  requestHeaders.set("x-user-id", user.id);
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });
  return finalResponse;
}
