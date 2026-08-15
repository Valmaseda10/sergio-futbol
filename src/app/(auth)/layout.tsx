import { Crest } from "@/components/branding/crest";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-[#1c1512] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Crest size={56} />
          <div>
            <p className="text-xs font-medium tracking-wide text-[#c9bdb6]">
              Panel del entrenador
            </p>
            <h1 className="font-heading text-3xl uppercase tracking-wide text-[#f3ece7]">
              Infantil B 26/27
            </h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
