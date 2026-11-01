"use client";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PaymentFlow } from "@/components/PaymentFlow";
import { Shell } from "@/components/Shell";

function Flow() {
  const { id } = useParams<{ id: string }>();
  return <PaymentFlow requestId={id} />;
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
