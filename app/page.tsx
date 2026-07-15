import { FxHeyDashboard } from "./FxHeyDashboard";
import { getDashboardData } from "./lib/fxa-data";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ train?: string }>;
}) {
  const params = await searchParams;
  const requestedTrain = params?.train ? Number(params.train) : undefined;
  const initialData = await getDashboardData(
    Number.isInteger(requestedTrain) ? requestedTrain : undefined,
  );

  return <FxHeyDashboard initialData={initialData} />;
}
