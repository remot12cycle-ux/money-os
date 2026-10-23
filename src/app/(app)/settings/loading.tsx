import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton stats={0} chart={false} rows={6} tabs />;
}
