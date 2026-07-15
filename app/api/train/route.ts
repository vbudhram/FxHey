import { getDashboardData, type EnvironmentName } from "../../lib/fxa-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTrain = url.searchParams.get("train");
  const train = rawTrain ? Number(rawTrain) : undefined;
  const rawEnvironment = url.searchParams.get("environment") ?? "production";

  if (train !== undefined && (!Number.isInteger(train) || train < 1 || train > 9999)) {
    return Response.json({ error: "A valid train number is required." }, { status: 400 });
  }

  if (rawEnvironment !== "stage" && rawEnvironment !== "production") {
    return Response.json({ error: "A valid environment is required." }, { status: 400 });
  }

  try {
    const data = await getDashboardData(train, rawEnvironment as EnvironmentName);
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=900",
      },
    });
  } catch {
    return Response.json({ error: "Train data is temporarily unavailable." }, { status: 502 });
  }
}
