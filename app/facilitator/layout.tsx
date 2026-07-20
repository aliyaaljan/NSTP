// app/facilitator/layout.tsx
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation";
import { getAppUserRole } from "@/lib/auth-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceClient } from "@/lib/supabase/service-client";
import { userOwnsActiveTermSection } from "@/lib/admin/facilitator-pool";
import { ActiveViewProvider } from "@/components/shared/ActiveViewContext";
import { Goblin_One, Cormorant, Montserrat } from "next/font/google";

const goblinOne = Goblin_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-goblin",
  display: "swap",
});

const cormorant = Cormorant({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-content",
  display: "swap",
});

export default async function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getAppUserRole();
  let isAdminActingAsFacilitator = false;
  if (role === "admin") {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const ownsClass = user
      ? await userOwnsActiveTermSection(createSupabaseServiceClient(), user.id)
      : false;
    if (!ownsClass) redirect("/admin/dashboard");
    isAdminActingAsFacilitator = true;
  } else if (role !== "adviser") {
    redirect("/");
  }

  return (
    <ActiveViewProvider
      value={{
        view: "facilitator",
        isAdmin: isAdminActingAsFacilitator,
        canSwitch: isAdminActingAsFacilitator,
      }}
    >
      <div
        className={`${goblinOne.variable} ${cormorant.variable} ${montserrat.variable}`}
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          // Resolve font aliases here, where the Next.js font variables are in scope
          ["--font" as string]: "var(--font-content, 'Helvetica Neue', Arial, sans-serif)",
          ["--font-title" as string]: "var(--font-goblin, Georgia, serif)",
          ["--font-sub" as string]: "var(--font-cormorant, Georgia, serif)",
        }}
      >
        <style>{`
          :root {
            --green:       #1B4332;
            --green-dark:  #14532D;
            --green-light: #86EFAC;
            --maroon:      #7B1D1D;
            --amber:       #D97706;
            --bg:          #F0F0F0;
            --white:       #FFFFFF;
            --border:      #E5E7EB;
            --text:        #111827;
            --muted:       #6B7280;
            --light:       #9CA3AF;
            --radius:      14px;
            --shadow:      0 2px 6px rgba(0,0,0,0.07);
          }
        `}</style>
        {/* *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } */}
        {children}
      </div>
    </ActiveViewProvider>
  );
}