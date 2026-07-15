import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  icon: LucideIcon;
  description: string;
}

export function PlaceholderPage({ icon: Icon, description }: PlaceholderPageProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
        <p className="max-w-md text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
