const MES_ABREV = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

export function FechaTile({ fecha }: { fecha: string }) {
  const date = new Date(`${fecha}T00:00:00`);

  return (
    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-md border-2 border-gold bg-accent leading-none">
      <span className="text-[9px] font-semibold tracking-wide text-accent-foreground">
        {MES_ABREV[date.getMonth()]}
      </span>
      <span className="font-heading text-lg text-accent-foreground tabular-nums">
        {date.getDate()}
      </span>
    </div>
  );
}
