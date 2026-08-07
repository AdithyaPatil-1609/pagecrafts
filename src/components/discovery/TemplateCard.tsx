import type { Template } from "@/lib/contracts";
import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Price shown on the tile itself, before any choice (UI Spec §7.5, Doc 22 P1-P3).
function priceBadge(template: Template) {
  if (template.tier === "free") {
    return <Badge variant="secondary">Free</Badge>;
  }
  const variant = template.tier === "signature" ? "default" : "accent";
  return <Badge variant={variant}>Rs {template.priceInr}</Badge>;
}

export function TemplateCard({ template }: { template: Template }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Static thumbnail placeholder — never a live iframe (D-3, AC-F3-2). Pre-rendered
          images replace this in week 4 (D16-D18). */}
      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-secondary to-accent">
        <span className="text-sm font-medium text-muted-foreground">{template.name}</span>
      </div>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-4">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[template.category]}
          </span>
        </div>
        {priceBadge(template)}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {template.description}
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex-wrap gap-1 p-4 pt-0">
        {template.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}
