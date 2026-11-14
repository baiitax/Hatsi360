import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { IntelligencePage } from '@/components/intelligence/IntelligencePage';

interface Props {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient();

  const { data: commodity } = await supabase
    .from('commodities')
    .select('name, slug')
    .eq('slug', params.slug)
    .single();

  if (!commodity) {
    return {
      title: 'Commodity Not Found',
    };
  }

  return {
    title: `${commodity.name} Intelligence | Hatsi360`,
    description: `Production, supply, demand, and trade analysis for ${commodity.name} in Nigeria. Data sourced from FAOSTAT with full provenance tracking.`,
  };
}

export default async function CommodityIntelligencePage({ params }: Props) {
  const supabase = await createClient();

  // Verify commodity exists
  const { data: commodity, error } = await supabase
    .from('commodities')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single();

  if (error || !commodity) {
    notFound();
  }

  return (
    <div className="container-page py-8">
      <IntelligencePage slug={params.slug} />
    </div>
  );
}
