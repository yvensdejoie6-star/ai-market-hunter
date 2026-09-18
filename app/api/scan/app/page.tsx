'use client';

import { useState } from 'react';

type Item = {
  ticker: string;
  name?: string;
  close: number;
  change: number;
  volume: number;
  score: number;
  momentum: number;
  volumeScore: number;
  volatility: number;
};

type SportLeg = {
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

type SportsPick = {
  combinedOdds: number;
  confidence: number;
  generatedAt: string;
  note: string;
  legs: SportLeg[];
};

export default function Home() {
  const [market, setMarket] = useState<'stocks' | 'crypto'>('crypto');
  const [items, setItems] = useState<Item[]>([]);
  const [sports, setSports] = useState<SportsPick | null>(null);

  const [status, setStatus] = useState('Ready. Paper mode only.');
  const [sportsStatus, setSportsStatus] = useState('Ready.');

  const [busy, setBusy] = useState(false);
  const [sportsBusy, setSportsBusy] = useState(false);

  async function scan() {
    setBusy(true);
    setStatus('Scanning real market data…');

    try {
      const response = await fetch(
        '/api/scan?market=' + market,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setItems(data.items || []);

      setStatus(
        `${data.items?.length || 0} candidates • ${data.date}`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Scan failed'
      );

      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  async function sportsPick() {
    setSportsBusy(true);
    setSportsStatus('Analyzing upcoming odds…');

    try {
      const response = await fetch('/api/sports', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Sports scan failed'
        );
      }

      setSports(data.pick || null);

      setSportsStatus(
        data.pick
          ? `Generated ${new Date(
              data.pick.generatedAt
            ).toLocaleTimeString()}`
          : 'NO PICK — no qualifying selection in the 2.00–5.00 range.'
      );
    } catch (error) {
      setSports(null);

      setSportsStatus(
        error instanceof Error
          ? error.message
          : 'Sports scan failed'
      );
    } finally {
      setSportsBusy(false);
    }
  }

  return (
    <main className="wrap">

      <div className="head">
        <div>
          <div className="title">
            AI Market Hunter
          </div>

          <div className="sub">
            V2 • Markets + Sports Research
          </div>
        </div>

        <div className="pill">
          PAPER MODE
        </div>
      </div>

      <div className="card">
        <div className="grid">

          <div className="stat">
            <div className="label">
              CAPITAL
            </div>

            <div className="num">
              $100
            </div>
          </div>

          <div className="stat">
            <div className="label">
              RISK / TRADE
            </div>

            <div className="num">
              $2 max
            </div>
          </div>

        </div>

        <div className="notice">
          2% position-risk model.
          No real orders are sent.
        </div>
      </div>

      <section className="card sports">

        <div className="sectionTitle">
          ⚽ Sports Hunter
        </div>

        <div className="sub">
          Daily research pick • total odds 2.00–5.00
        </div>

        <button
          className="scan"
          onClick={sportsPick}
          disabled={sportsBusy}
        >
          {sportsBusy
            ? 'Analyzing…'
            : "🎯 FIND TODAY'S PICK"}
        </button>

        <div className="notice">
          {sportsStatus}
        </div>

        {sports && (
          <div className="pick">

            <div className="pickHead">

              <div>
                <div className="label">
                  TOTAL ODDS
                </div>

                <div className="big">
                  @ {sports.combinedOdds.toFixed(2)}
                </div>
              </div>

              <div className="confidence">
                <div className="label">
                  MODEL CONFIDENCE
                </div>

                <b>
                  {sports.confidence}%
                </b>
              </div>

            </div>

            {sports.legs.map((leg, index) => (
              <div
                className="leg"
                key={
                  leg.eventId +
                  ':' +
                  leg.name
                }
              >

                <div>
                  <b>
                    {index + 1}. {leg.name}
                  </b>

                  <div className="muted">
                    {leg.home} vs {leg.away}
                  </div>

                  <div className="muted">
                    {leg.sport} •{' '}
                    {new Date(
                      leg.commence_time
                    ).toLocaleString()}
                  </div>

                  <div className="muted">
                    Consensus probability:{' '}
                    {(leg.prob * 100).toFixed(0)}%
                    {' • '}
                    {leg.books} books
                  </div>
                </div>

                <div className="odd">
                  {leg.odd.toFixed(2)}
                </div>

              </div>
            ))}

            <div
              className="small"
              style={{ marginTop: 9 }}
            >
              {sports.note}
            </div>

          </div>
        )}

      </section>

      <div className="tabs">

        <button
          className={
            market === 'crypto'
              ? 'on'
              : ''
          }
          onClick={() => {
            setMarket('crypto');
            setItems([]);
          }}
        >
          🪙 Crypto
        </button>

        <button
          className={
            market === 'stocks'
              ? 'on'
              : ''
          }
          onClick={() => {
            setMarket('stocks');
            setItems([]);
          }}
        >
          🇺🇸 Stocks
        </button>

      </div>

      <button
        className="scan"
        onClick={scan}
        disabled={busy}
      >
        {busy
          ? 'Scanning…'
          : '🔎 SCAN MARKET NOW'}
      </button>

      <div className="notice">
        {status}
      </div>

      {items.map((item, index) => (

        <div
          className="card"
          key={item.ticker}
        >

          <div className="row">

            <div>

              <b>
                {index + 1}. {item.ticker}
              </b>

              <div className="muted">
                {item.name || ''} • close $
                {item.close.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 8,
                  }
                )}
                {' • day '}
                {item.change.toFixed(2)}%
              </div>

            </div>

            <div className="score">
              {item.score}
            </div>

          </div>

          <div className="bar">
            <i
              style={{
                width:
                  item.score + '%',
              }}
            />
          </div>

          <div className="grid">

            <div className="stat">
              <div className="label">
                MOMENTUM
              </div>

              <div className="num">
                {item.momentum}
              </div>
            </div>

            <div className="stat">
              <div className="label">
                VOLUME
              </div>

              <div className="num">
                {item.volumeScore}
              </div>
            </div>

            <div className="stat">
              <div className="label">
                VOLATILITY
              </div>

              <div className="num">
                {item.volatility}
              </div>
            </div>

            <div className="stat">
              <div className="label">
                SETUP
              </div>

              <div className="num">
                {item.score >= 75
                  ? 'WATCH'
                  : 'WAIT'}
              </div>
            </div>

          </div>

          <div
            className="small"
            style={{ marginTop: 9 }}
          >
            Research signal only;
            no guaranteed result.
          </div>

        </div>

      ))}

      <div className="card">

        <b>
          V2 data model
        </b>

        <div
          className="small"
          style={{ marginTop: 7 }}
        >
          Market data comes from Massive
          and sports odds come from The Odds API.
          API keys remain server-side and are never
          sent to the browser.
        </div>

      </div>

    </main>
  );
}
