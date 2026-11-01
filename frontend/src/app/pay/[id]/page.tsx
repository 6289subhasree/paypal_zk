"use client";
import { useParams } from "next/navigation";
import { PaymentFlow } from "@/components/PaymentFlow";
import { Shell } from "@/components/Shell";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Shell>
      <PaymentFlow requestId={id} />
    </Shell>
  );
}
