import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableShell({
  children,
  caption,
  className,
}: {
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border bg-card", className)}>
      <table className="w-full border-collapse text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  numeric,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border bg-muted/60 px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
        numeric && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric,
  onClick,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} onClick={onClick} className={cn("border-b border-border px-3 py-2 align-middle", numeric && "text-right", className)}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLTableRowElement>;
}) {
  return (
    <tr onClick={onClick} className={cn("transition-colors hover:bg-accent/60 focus-within:bg-accent/60", className)}>
      {children}
    </tr>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      {children}
    </div>
  );
}

export function SelectFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-sm border border-input bg-background px-2 text-[12px] text-foreground"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
