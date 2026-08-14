import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function JugadorAvatar({
  src,
  nombre,
  apellidos,
  className,
}: {
  src?: string | null;
  nombre: string;
  apellidos: string;
  className?: string;
}) {
  const initials = `${nombre[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();

  return (
    <Avatar className={cn("size-10", className)}>
      {src && <AvatarImage src={src} alt={`${nombre} ${apellidos}`} />}
      <AvatarFallback className="bg-accent font-heading text-accent-foreground">
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
