/**
 * Candle data API endpoint.
 *
 * Returns OHLC candle data for a commodity given commodityId and timeframe.
 * Used by the interactive commodity detail modal on the homepage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCommoditySeries } from '@/lib/trade/queries';
import type { Timeframe } from '@/lib/trade/candles';

const VALID_TIMEFRAMES: Timeframe[] = ['daily', 'weekly', 'monthly', 'quarterly'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commodityId = parseInt(searchParams.get('commodityId') ?? '', 10);
  const timeframe = (searchParams.get('timeframe') ?? 'daily') as Timeframe;
  const marketIdParam = searchParams.get('marketId');
  const marketId = marketIdParam ? parseInt(marketIdParam, 10) : null;

  if (Number.isNaN(commodityId) || commodityId <= 0) {
    return NextResponse.json({ error: 'Invalid commodityId' }, { status: 400 });
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json(
      { error: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const result = await getCommoditySeries({
      commodityId,
      marketId: marketId ?? null,
      timeframe,
    });

    if (!result.candles) {
      return NextResponse.json({
        commodityId,
        timeframe,
        candles: [],
        unavailableReason: result.unavailableReason,
        observationCount: result.observationCount,
      });
    }

    return NextResponse.json({
      commodityId,
      timeframe,
      candles: result.candles.candles.map(c => ({
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        observationCount: c.observationCount,
        marketCount: c.marketCount,
        sourceCount: c.sourceCount,
        isDegenerate: c.isDegenerate,
        isCalculated: c.isCalculated,
      })),
      seriesKey: result.candles.seriesKey,
      totalObservations: result.candles.totalObservations,
      marketCoverage: result.candles.marketCoverage,
      sourceCoverage: result.candles.sourceCoverage,
      hasDegenerateCandles: result.candles.hasDegenerateCandles,
      unavailableReason: null,
      observationCount: result.observationCount,
      excludedCount: result.excludedCount,
      freshness: result.freshness,
    });
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json({ error: 'Failed to fetch candle data' }, { status: 500 });
  }
}
