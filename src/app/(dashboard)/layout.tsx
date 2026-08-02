import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { SwipeNav } from "@/components/layout/swipe-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CommandPalette>
      {/* Gesture swipe — buka navigasi mobile (tanpa konflik gesture back) */}
      <SwipeNav />
      {/* App-shell: h-screen penuh, hanya area konten yang scroll */}
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header />
          <main className="flex-1 px-3 py-4 md:px-10 md:py-6">{children}</main>
        </div>
      </div>
    </CommandPalette>
  );
}
