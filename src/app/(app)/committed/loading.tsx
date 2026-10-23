import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton stats={2} chart={false} rows={8} />;
}
