import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllNavItems } from "@/lib/navigation";

export default function HomePage() {
  const items = getAllNavItems();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Beranda</h1>
        <p className="text-muted-foreground">
          Second brain Anda — insight AI hari ini akan muncul di sini.
        </p>
      </header>

      {/* Kartu insight AI — placeholder untuk Fase 5 (Insights) */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Insight AI hari ini
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Belum ada data. Mulai dengan menambahkan catatan di{" "}
          <Link href="/knowledge" className="text-primary hover:underline">
            Knowledge
          </Link>{" "}
          atau tugas di{" "}
          <Link href="/todo" className="text-primary hover:underline">
            Todo
          </Link>
          , lalu AI akan memberi insight personal.
        </CardContent>
      </Card>

      {/* Grid fitur */}
      <section>
        <h2 className="mb-4 text-lg font-medium">Semua fitur</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                asChild
                variant="outline"
                className="h-auto justify-start gap-3 p-4"
              >
                <Link href={item.href}>
                  <Icon className="size-5 text-primary" />
                  <span className="flex flex-col items-start">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
