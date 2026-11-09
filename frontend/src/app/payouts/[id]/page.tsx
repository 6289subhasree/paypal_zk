"use client";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PayoutFlow } from "@/components/PayoutFlow";
import { Shell } from "@/components/Shell";

function Flow() {
  const { id } = useParams<{ id: string }>();
  return <PayoutFlow payoutId={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Shell>
        <Flow />
      </Shell>
    </Suspense>
  );
}
