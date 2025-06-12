import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn(
        "min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow border border-gray-200 dark:border-gray-700 text-sm",
        className
      )}
      {...props}
    />
  );
} 