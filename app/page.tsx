import { FxHeyDashboard } from "./FxHeyDashboard";
import { getDashboardData, type EnvironmentName } from "./lib/fxa-data";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ train?: string; environment?: string }>;
}) {
  const params = await searchParams;
  const requestedTrain = params?.train ? Number(params.train) : undefined;
  const requestedEnvironment: EnvironmentName =
    params?.environment === "stage" ? "stage" : "production";
  const initialData = await getDashboardData(
    Number.isInteger(requestedTrain) ? requestedTrain : undefined,
    requestedEnvironment,
  );

  return <FxHeyDashboard initialData={initialData} />;
}
