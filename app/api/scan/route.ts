import { NextResponse } from "next/server";

const API = "https://api.massive.com";

function score(o: any) {
  const close = Number(o.c || 0);
  const open = Number(o.o || close);
  const high = Number(o.h || close);
  const low = Number(o.l || close);
  const volume = Number(o.v || 0);

  const change = open ? ((close - open) / open) * 100 : 0;
  const range = close ? ((high - low) / close) * 100 : 0;

  const momentum = Math.max(
    0,
    Math.min(100, 50 + change * 5)
  );

  const volumeScore = Math.max(
    0,
    Math.min(100, 50 + Math.log10(Math.max(volume, 1)) * 6)
  );

  const volatility = Math.max(
    0,
    Math.min(100, range * 10)
  );

  const finalScore = Math.round(
    0.35 * momentum +
    0.25 * volumeScore +
    0.20 * volatility +
    0.20 * Math.max(
      0,
      Math.min(100, 50 + change * 3)
    )
  );

  return {
    close,
    change,
    volume,
    momentum: Math.round(momentum),
    volumeScore: Math.round(volumeScore),
    volatility: Math.round(volatility),
    score: finalScore,
  };
}

export async function GET(req: Request) {
  const apiKey = process.env.MASSIVE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "MASSIVE_API_KEY is missing on the server.",
      },
      { status: 500 }
    );
  }

  const url = new URL(req.url);

  const market =
    url.searchParams.get("market") === "stocks"
      ? "stocks"
      : "crypto";

  // Use the previous UTC day.
  const date = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);

  const endpoint =
    market === "stocks"
      ? `/v2/aggs/grouped/locale/us/market/stocks/${date}`
      : `/v2/aggs/grouped/locale/global/market/crypto/${date}`;

  try {
    const response = await fetch(
      `${API}${endpoint}?adjusted=true&apiKey=${encodeURIComponent(
        apiKey
      )}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Massive returned ${response.status}`,
        },
        { status: response.status }
      );
    }

    const items = (data.results || [])
      .map((item: any) => ({
        ticker: item.T || "UNKNOWN",
        ...score(item),
      }))
      .filter(
        (item: any) =>
          item.close > 0 &&
          item.volume > 0
      )
      .sort(
        (a: any, b: any) =>
          b.score - a.score
      )
      .slice(0, 10);

    return NextResponse.json({
      date,
      market,
      items,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Could not reach Massive.",
      },
      { status: 502 }
    );
  }
}
