import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autoComplete, ...props }, ref) => {
    // Set sensible defaults for autocomplete if not provided
    let finalAutoComplete = autoComplete;

    if (finalAutoComplete === undefined) {
      if (type === "email") {
        finalAutoComplete = "email";
      } else if (type === "password") {
        finalAutoComplete = "current-password";
      }
    }

    return (
      <input
        type={type}
        autoComplete={finalAutoComplete}
        className={cn(
          "flex h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
