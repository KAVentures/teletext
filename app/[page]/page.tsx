import { notFound } from "next/navigation";
import { getEdition } from "@/lib/edition";
import TeletextApp from "@/components/TeletextApp";

export const revalidate = 60;

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!/^\d{3}$/.test(page)) notFound();

  const edition = await getEdition();
  return <TeletextApp initialPage={Number(page)} edition={edition} />;
}
