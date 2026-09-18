import { NextResponse } from "next/server";

type Event = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: any[];
};

type Candidate = {
  eventId: string;
  sport: string;
  commence_time: string;
  home: string;
  away: string;
  name: string;
  odd: number;
  prob: number;
  books: number;
};

function getCandidates(event: Event): Candidate[] {
  const outcomes = new Map<
    string,
    { prices: number[]; implied: number[] }
  >();

  for (const bookmaker of event.bookmakers || []) {
    const market = (bookmaker.markets || []).find(
      (m: any) => m.key === "h2h"
    );

    for (const outcome of market?.outcomes || []) {
      if (!outcome?.name || !Number.isFinite(Number(outcome.price))) {
        continue;
      }

      const price = Number(outcome.price);
      const current = outcomes.get(outcome.name) || {
        prices: [],
        implied: [],
      };

      current.prices.push(price);
      current.implied.push(1 / price);

      outcomes.set(outcome.name, current);
    }
  }

  const raw = [...outcomes.entries()].map(([name, data]) => ({
    name,
    avgPrice:
      data.prices.reduce((sum, price) => sum + price, 0) /
      data.prices.length,
    avgImplied:
      data.implied.reduce((sum, probability) => sum + probability, 0) /
      data.implied.length,
    books: data.prices.length,
  }));

  const totalImplied =
    raw.reduce((sum, item) => sum + item.avgImplied, 0) || 1;

  return raw
    .map((item) => ({
      eventId: event.id,
      sport: event.sport_title || event.sport_key,
      commence_time: event.commence_time,
      home: event.home_team,
      away: event.away_team,
      name: item.name,
      odd: item.avgPrice,
      prob: item.avgImplied / totalImplied,
      books: item.books,
    }))
    .filter(
      (item) =>
        item.odd >= 1.35 &&
        item.odd <= 3.5 &&
        item.prob >= 0.5 &&
        item.books >= 2
    );
}

export async function GET() {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ODDS_API_KEY is missing on the server.",
      },
      { status: 500 }
    );
  }

  try {
    const url =
      "https://api.the-odds-api.com/v4/sports/upcoming/odds/" +
      "?regions=us" +
      "&markets=h2h" +
      "&oddsFormat=decimal" +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `The Odds API returned ${response.status}`,
        },
        { status: response.status }
      );
    }

    const candidates = (Array.isArray(data) ? data : [])
      .flatMap((event: Event) => getCandidates(event))
      .filter(
        (candidate) =>
          new Date(candidate.commence_time).getTime() > Date.now()
      )
      .sort((a, b) => b.prob - a.prob);

    let selected: Candidate[] | null = null;

    // First try to find a single selection
    // with total odds between 2.00 and 5.00.
    for (const candidate of candidates.slice(0, 30)) {
      if (candidate.odd >= 2 && candidate.odd <= 5) {
        selected = [candidate];
        break;
      }
    }

    // If no single selection qualifies,
    // try a 2-leg combination.
    if (!selected) {
      outer: for (
        let i = 0;
        i < Math.min(candidates.length, 20);
        i++
      ) {
        for (
          let j = i + 1;
          j < Math.min(candidates.length, 30);
          j++
        ) {
          const first = candidates[i];
          const second = candidates[j];

          if (first.eventId === second.eventId) {
            continue;
          }

          const combinedOdds = first.odd * second.odd;

          if (combinedOdds >= 2 && combinedOdds <= 5) {
            selected = [first, second];
            break outer;
          }
        }
      }
    }

    // No qualifying selection.
    if (!selected) {
      return NextResponse.json({
        pick: null,
        generatedAt: new Date().toISOString(),
      });
    }

    const combinedOdds = selected.reduce(
      (product, item) => product * item.odd,
      1
    );

    const confidence = Math.round(
      (selected.reduce((sum, item) => sum + item.prob, 0) /
        selected.length) *
        100
    );

    return NextResponse.json({
      pick: {
        combinedOdds,
        confidence,
        generatedAt: new Date().toISOString(),
        note:
          "Research signal based on bookmaker odds consensus. " +
          "Odds can move and prices can differ between bookmakers.",
        legs: selected,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Could not reach The Odds API.",
      },
      { status: 502 }
    );
  }
}
