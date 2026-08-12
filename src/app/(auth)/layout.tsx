export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Cultural y Deportiva Leonesa
          </p>
          <h1 className="text-xl font-semibold">Infantil B</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
