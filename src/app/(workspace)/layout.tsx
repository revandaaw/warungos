import { requireTenantContext } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireTenantContext();
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950/80">
      {/* Desktop Sidebar */}
      <Sidebar
        tenantName={context.tenantName}
        userName={session?.name || "User"}
        userRole={context.role}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 pb-16 lg:pb-0">
        <Header
          tenantName={context.tenantName}
          userName={session?.name || "User"}
          userRole={context.role}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
