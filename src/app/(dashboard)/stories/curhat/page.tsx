"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StoryChat } from "@/components/stories/story-chat";

function StoryChatPageInner() {
  const params = useSearchParams();
  const age = Number(params.get("age"));
  return <StoryChat age={Number.isFinite(age) && age > 0 ? Math.round(age) : 20} />;
}

export default function StoryChatPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Memuat…</div>}>
      <StoryChatPageInner />
    </Suspense>
  );
}
