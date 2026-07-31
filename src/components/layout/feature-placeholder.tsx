import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FeaturePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Construction className="size-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="font-medium">Fitur dalam pembangunan</p>
            <p className="text-sm text-muted-foreground">
              PRD & task sudah siap di <code className="text-xs">docs/lifeos</code> dan{" "}
              <code className="text-xs">planning/</code> — eksekusi menyusul.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
