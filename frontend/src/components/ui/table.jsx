import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Table = forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border/60 transition-colors hover:bg-white/30 dark:hover:bg-white/5",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle font-semibold text-muted-foreground text-xs uppercase tracking-wider",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-4 align-middle", className)} {...props} />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
