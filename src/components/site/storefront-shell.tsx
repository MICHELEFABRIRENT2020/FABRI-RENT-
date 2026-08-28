/**
 * Applies the dark `.storefront` theme (see globals.css) to a public
 * customer-facing page, the same way src/app/page.tsx and
 * src/app/flotta/page.tsx already do inline. Pulled into a shared
 * component so every step of the booking funnel (home -> checkout ->
 * confirmation) stays visually consistent instead of dropping back to
 * the light default theme partway through.
 */
export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return <div className="storefront flex flex-1 flex-col bg-background text-foreground">{children}</div>;
}
