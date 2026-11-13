# Hatsi360 image library manifest

Every image the platform serves, with its dimensions, byte weight, subject,
alternative text, licence and attribution.

All assets in this library are **Hatsi360 original assets**: editorial
illustrations generated for this platform and owned by Hatsi360. No image in
the library is scraped, borrowed from a third-party site, or used under an
uncleared licence. The originals are retained under `assets/image-sources/`
so the library can be rebuilt at any time by running
`python3 scripts/build_image_library.py`.

## How the library is organised

| Folder | Purpose |
| --- | --- |
| `hero/` | Full-bleed photographic hero imagery for the homepage and section openers. |
| `commodities/` | One image per catalogue commodity, matched by commodity slug. |
| `markets/` | One representative image per registered market. |
| `agriculture/` | Crops, fields and harvest activity. |
| `infrastructure/` | Storage, grading, bagging, transport and export handling. |
| `professionals/` | Traders, agents, inspectors and analysts. |
| `insights/` | Editorial feature images, one per published article. |
| `reports/` | Report and coverage cover imagery. |
| `ui/` | Neutral placeholder panels. |

## Market images and truthfulness

Hatsi360 does not hold licensed photographs of every market it reports on.
Where a market-specific photograph is unavailable, the market image is a
**representative** image of that kind of trading environment and is labelled
as such in the interface. The registry marks these assets with
`representation: "representative"`, and the interface renders a visible
"Representative image" caption. No image is ever presented as a verified
photograph of a named market.

## Licence and attribution

| Asset | Path | Size | Bytes | Subject | Alternative text | Licence | Attribution |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agriculture.harvest-hands` | `/images/hatsi360/agriculture/harvest-hands.jpg` | 1600×900 | 288 KB | Farmers hand-harvesting grain | Two farmers harvesting grain by hand into a woven basket in the field. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `agriculture.legume-field` | `/images/hatsi360/agriculture/legume-field.jpg` | 1600×900 | 297 KB | A groundnut field in flower | A field of groundnut plants in flower with the soil visible between the rows. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `agriculture.maize-field` | `/images/hatsi360/agriculture/maize-field.jpg` | 1600×900 | 305 KB | A field of maize at mid-season | Rows of tall maize plants running to the horizon under a wide sky. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `agriculture.rice-field` | `/images/hatsi360/agriculture/rice-field.jpg` | 1600×900 | 283 KB | A flooded rice paddy with seedlings in rows | A flooded rice paddy with young green seedlings planted in straight rows. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.bambara-nuts` | `/images/hatsi360/commodities/bambara-nuts.jpg` | 1400×933 | 189 KB | Bambara groundnut seeds | Bambara groundnut seeds in a rough clay bowl, the mottled cream and tan seeds irregularly shaped. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.brown-beans-oloyin` | `/images/hatsi360/commodities/brown-beans-oloyin.jpg` | 1400×933 | 215 KB | Brown cowpea beans | Brown cowpea beans in a woven scoop, the mottled tan and chestnut seeds irregular in shape. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.dried-chilli-pepper` | `/images/hatsi360/commodities/dried-chilli-pepper.jpg` | 1400×933 | 232 KB | Dried chilli peppers | Dried red chilli peppers on a dark surface, the wrinkled pods deep brick red. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.dried-ginger` | `/images/hatsi360/commodities/dried-ginger.jpg` | 1400×933 | 182 KB | Dried ginger | Dried ginger rhizome split into flat pieces on a dark surface, the cut faces pale ochre. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.groundnut` | `/images/hatsi360/commodities/groundnut.jpg` | 1400×933 | 182 KB | Groundnuts in shell and shelled kernels | Groundnuts in their papery shells on a dark surface beside a small heap of shelled kernels. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.gum-arabic` | `/images/hatsi360/commodities/gum-arabic.jpg` | 1400×933 | 139 KB | Gum Arabic resin | Pale amber lumps of gum Arabic resin in a wooden dish, translucent where the light strikes them. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.imported-rice` | `/images/hatsi360/commodities/imported-rice.jpg` | 1400×933 | 137 KB | Milled long grain rice | Long grain rice in a shallow clay bowl, the grains dry and translucent. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.local-rice` | `/images/hatsi360/commodities/local-rice.jpg` | 1400×933 | 225 KB | Locally processed rice | Locally processed Nigerian rice served in a smoked clay bowl beside a wooden mortar. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.maize-white` | `/images/hatsi360/commodities/maize-white.jpg` | 1400×933 | 129 KB | White maize kernels | Dried white maize kernels in a shallow ceramic dish, pale and translucent. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.maize-yellow` | `/images/hatsi360/commodities/maize-yellow.jpg` | 1400×933 | 199 KB | Yellow maize kernels | Golden dried maize kernels spilling from a woven scoop onto a dark slate surface. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.millet` | `/images/hatsi360/commodities/millet.jpg` | 1400×933 | 159 KB | Millet grain | Pale golden millet grain in a woven raffia bowl, the tiny round seeds catching the light. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.paddy-rice` | `/images/hatsi360/commodities/paddy-rice.jpg` | 1400×933 | 190 KB | Paddy rice in its husk | Unhusked paddy rice spilling from a woven basket, the golden husk and awns still on the grain. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.sesame-seed` | `/images/hatsi360/commodities/sesame-seed.jpg` | 1400×933 | 156 KB | Sesame seed | Pale cream sesame seeds spilling from a wooden scoop onto a dark slate surface. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.sorghum-red` | `/images/hatsi360/commodities/sorghum-red.jpg` | 1400×933 | 145 KB | Red sorghum grain | Deep red sorghum grain in a clay bowl, the glossy rounded kernels mahogany brown. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.sorghum-white` | `/images/hatsi360/commodities/sorghum-white.jpg` | 1400×933 | 148 KB | White sorghum grain | Dried white sorghum grain in a clay bowl, the smooth rounded kernels pale ivory. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.soya-beans` | `/images/hatsi360/commodities/soya-beans.jpg` | 1400×933 | 182 KB | Soya beans | Dried soya beans in an open linen sack, the round yellow beans showing their hilum. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.sweet-potato` | `/images/hatsi360/commodities/sweet-potato.jpg` | 1400×933 | 196 KB | Fresh sweet potato tubers | Freshly harvested sweet potatoes with soil still on the skin, piled on a woven mat. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.wheat` | `/images/hatsi360/commodities/wheat.jpg` | 1400×933 | 232 KB | Wheat grain | Wheat grains spilling from a torn sack onto a dark surface, the amber kernels sharply detailed. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `commodity.white-beans` | `/images/hatsi360/commodities/white-beans.jpg` | 1400×933 | 178 KB | White cowpea beans | White cowpea beans piled in a clay bowl, the small kidney shaped seeds creamy white. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `hero.aggregation-yard` | `/images/hatsi360/hero/aggregation-yard.jpg` | 2000×1125 | 312 KB | Grain aggregation yard with a tractor unloading into heaps | An aggregation yard where a tractor unloads grain into tall heaps under open-sided sheds. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `hero.harvest-field` | `/images/hatsi360/hero/harvest-field.jpg` | 2000×1125 | 307 KB | Maize field at harvest with a farmer carrying a basket of cobs | A farmer walking between rows of a maize field at harvest, carrying a woven basket of cobs. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `hero.market-warehouse` | `/images/hatsi360/hero/market-warehouse.jpg` | 2000×1125 | 317 KB | Covered grains market with stacked sacks of grain | Stacks of jute sacks filled with maize and millet on pallets inside a covered West African grains market. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `infrastructure.bagging-line` | `/images/hatsi360/infrastructure/bagging-line.jpg` | 1600×900 | 257 KB | A packhouse bagging line filling and stitching sacks | An operator filling and stitching new sacks on a bagging line in a packhouse. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `infrastructure.export-dock` | `/images/hatsi360/infrastructure/export-dock.jpg` | 1600×900 | 278 KB | Palletised export cartons on a loading dock | Palletised export cartons on a loading dock beside a shipping container. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `infrastructure.grading-line` | `/images/hatsi360/infrastructure/grading-line.jpg` | 1600×900 | 294 KB | A grading table where produce is sorted before packing | A grading table where produce is sorted into grades by hand before packing. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `infrastructure.warehouse-storage` | `/images/hatsi360/infrastructure/warehouse-storage.jpg` | 1600×900 | 293 KB | Organised warehouse storage of bagged grain | An organised warehouse store with grain sacks stacked on labelled pallets. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `insights.cassava-prices` | `/images/hatsi360/insights/cassava-prices.jpg` | 1600×900 | 291 KB | Cassava roots lifted from the ground | Cassava roots freshly lifted from the ground and stacked in a pile. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `insights.fuel-transport` | `/images/hatsi360/insights/fuel-transport.jpg` | 1600×900 | 246 KB | A truck carrying grain sacks along a rural road | A loaded truck carrying sacks of grain along a rural road at dusk. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `insights.sustainable-farming` | `/images/hatsi360/insights/sustainable-farming.jpg` | 1600×900 | 272 KB | A model farm with irrigated vegetable beds | A farmer standing among green vegetable beds beside a water irrigation line on a model farm. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `insights.yam-cultivation` | `/images/hatsi360/insights/yam-cultivation.jpg` | 1600×900 | 274 KB | Yam setts planted in ridges in a prepared field | Yam setts being placed into ridges in a newly prepared yam field. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.anchau` | `/images/hatsi360/markets/anchau-weighing-scale.jpg` | 1800×1013 | 292 KB | A sack of grain being weighed on a platform scale | A trader weighing a sack of grain on a mechanical platform scale during a market trade. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.dawanau` | `/images/hatsi360/markets/dawanau-grains-warehouse.jpg` | 1800×1013 | 317 KB | Covered grains warehouse with stacked sacks | Rows of jute sacks filled with grain stacked on pallets inside a large covered grains warehouse. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.funtua` | `/images/hatsi360/markets/funtua-trading-shed.jpg` | 1800×1013 | 301 KB | Open trading shed with stacked grain sacks | Jute sacks of grain stacked in an open trading shed while buyers and sellers talk. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.gujungu` | `/images/hatsi360/markets/gujungu-open-grain-heaps.jpg` | 1800×1013 | 293 KB | Open-air grain heaps traded on mats | Grain traders sitting beside heaps of grain spread out on mats in the open air. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.gusau` | `/images/hatsi360/markets/gusau-quality-inspection.jpg` | 1800×1013 | 302 KB | A trader inspecting grain quality by hand | A trader inspecting the quality of a handful of grain before agreeing a price. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.lafia` | `/images/hatsi360/markets/lafia-modern-hall.jpg` | 1800×1013 | 311 KB | Modern covered market hall with numbered stalls | Traders at numbered stalls inside a modern covered market hall. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.maiduguri` | `/images/hatsi360/markets/maiduguri-produce-canopy.jpg` | 1800×1013 | 301 KB | Weekly produce market trading under a canopy | Produce traders trading under a large canopy at a weekly produce market. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.mile-12` | `/images/hatsi360/markets/mile-12-open-air-wholesale.jpg` | 1800×1013 | 301 KB | Open-air wholesale market trading floor | A busy open-air wholesale market where produce is laid out on tarpaulins under the trees. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.sokoto` | `/images/hatsi360/markets/sokoto-produce-rows.jpg` | 1800×1013 | 309 KB | Rows of produce stalls in a central market | Long rows of produce stalls running down a wide trading lane in a central market. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.wunti` | `/images/hatsi360/markets/wunti-loading.jpg` | 1800×1013 | 291 KB | Sacks of grain being loaded onto a truck at a market | A market loader moving grain sacks from a handcart onto a truck at the edge of a market. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `market.zaki-biam` | `/images/hatsi360/markets/zaki-biam-yam-market.jpg` | 1800×1013 | 295 KB | Yam tubers stacked in rows at a yam trading ground | Yam tubers stacked in long rows on the ground at a yam trading ground. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `professionals.agent-recording` | `/images/hatsi360/professionals/agent-recording.jpg` | 1600×900 | 229 KB | A field agent recording a market price on a tablet | A field agent recording a market price on a rugged tablet beside a stall. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `professionals.analyst-reviewing` | `/images/hatsi360/professionals/analyst-reviewing.jpg` | 1600×900 | 212 KB | A market analyst reviewing price charts | A market analyst reviewing price charts on a monitor at a desk. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `professionals.inspector-grading` | `/images/hatsi360/professionals/inspector-grading.jpg` | 1600×900 | 163 KB | An inspector sampling grain for a quality check | An inspector in a high visibility vest taking a grain sample for a quality check. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `professionals.trader-phone` | `/images/hatsi360/professionals/trader-phone.jpg` | 1600×900 | 237 KB | A trader checking a price on a mobile phone | A market trader checking a price on a mobile phone beside a heap of grain. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `reports.coverage-report` | `/images/hatsi360/reports/coverage-report.jpg` | 1600×900 | 196 KB | A field agent's notebook and camera at a rural market | A field agent's notebook and camera resting on the bonnet of a vehicle at a rural market. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `reports.market-report` | `/images/hatsi360/reports/market-report.jpg` | 1600×900 | 245 KB | A printed market report beside a laptop showing price charts | A printed market report resting on a desk beside a laptop showing price charts. | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |
| `ui.placeholder` | `/images/hatsi360/ui/placeholder.jpg` | 1200×800 | 99 KB | Neutral woven grain texture used as a placeholder panel | (decorative — empty alt attribute) | Hatsi360 original asset — generated editorial illustration, produced for this platform and owned by Hatsi360. | Hatsi360 |

## Source originals

| Source file | Assets produced |
| --- | --- |
| `assets/image-sources/agriculture-harvest.jpg` | `agriculture.harvest-hands` |
| `assets/image-sources/agriculture-legume-field.jpg` | `agriculture.legume-field` |
| `assets/image-sources/agriculture-maize-field.jpg` | `agriculture.maize-field` |
| `assets/image-sources/agriculture-rice-field.jpg` | `agriculture.rice-field` |
| `assets/image-sources/commodity-bambara.jpg` | `commodity.bambara-nuts` |
| `assets/image-sources/commodity-brown-beans.jpg` | `commodity.brown-beans-oloyin` |
| `assets/image-sources/commodity-chilli.jpg` | `commodity.dried-chilli-pepper` |
| `assets/image-sources/commodity-ginger.jpg` | `commodity.dried-ginger` |
| `assets/image-sources/commodity-groundnut.jpg` | `commodity.groundnut` |
| `assets/image-sources/commodity-gum-arabic.jpg` | `commodity.gum-arabic` |
| `assets/image-sources/commodity-local-rice.jpg` | `commodity.local-rice` |
| `assets/image-sources/commodity-maize-white.jpg` | `commodity.maize-white` |
| `assets/image-sources/commodity-maize.jpg` | `commodity.maize-yellow` |
| `assets/image-sources/commodity-millet.jpg` | `commodity.millet` |
| `assets/image-sources/commodity-paddy-rice.jpg` | `commodity.paddy-rice` |
| `assets/image-sources/commodity-rice.jpg` | `commodity.imported-rice` |
| `assets/image-sources/commodity-sesame.jpg` | `commodity.sesame-seed` |
| `assets/image-sources/commodity-sorghum-white.jpg` | `commodity.sorghum-white` |
| `assets/image-sources/commodity-sorghum.jpg` | `commodity.sorghum-red` |
| `assets/image-sources/commodity-soya.jpg` | `commodity.soya-beans` |
| `assets/image-sources/commodity-sweet-potato.jpg` | `commodity.sweet-potato` |
| `assets/image-sources/commodity-wheat.jpg` | `commodity.wheat` |
| `assets/image-sources/commodity-white-beans.jpg` | `commodity.white-beans` |
| `assets/image-sources/hero-aggregation.jpg` | `hero.aggregation-yard` |
| `assets/image-sources/hero-harvest.jpg` | `hero.harvest-field` |
| `assets/image-sources/hero-market.jpg` | `hero.market-warehouse` |
| `assets/image-sources/infrastructure-bagging.jpg` | `infrastructure.bagging-line` |
| `assets/image-sources/infrastructure-export.jpg` | `infrastructure.export-dock` |
| `assets/image-sources/infrastructure-grading.jpg` | `infrastructure.grading-line` |
| `assets/image-sources/infrastructure-warehouse.jpg` | `infrastructure.warehouse-storage` |
| `assets/image-sources/insights-cassava.jpg` | `insights.cassava-prices` |
| `assets/image-sources/insights-fuel.jpg` | `insights.fuel-transport` |
| `assets/image-sources/insights-sustainable.jpg` | `insights.sustainable-farming` |
| `assets/image-sources/insights-yam.jpg` | `insights.yam-cultivation` |
| `assets/image-sources/market-grains-warehouse.jpg` | `market.dawanau` |
| `assets/image-sources/market-loading.jpg` | `market.wunti` |
| `assets/image-sources/market-modern-hall.jpg` | `market.lafia` |
| `assets/image-sources/market-open-air.jpg` | `market.mile-12` |
| `assets/image-sources/market-open-grain-heaps.jpg` | `market.gujungu` |
| `assets/image-sources/market-produce-canopy.jpg` | `market.maiduguri` |
| `assets/image-sources/market-produce-rows.jpg` | `market.sokoto` |
| `assets/image-sources/market-quality-inspection.jpg` | `market.gusau` |
| `assets/image-sources/market-trading-shed.jpg` | `market.funtua` |
| `assets/image-sources/market-weighing.jpg` | `market.anchau` |
| `assets/image-sources/market-yam.jpg` | `market.zaki-biam` |
| `assets/image-sources/professionals-agent.jpg` | `professionals.agent-recording` |
| `assets/image-sources/professionals-analyst.jpg` | `professionals.analyst-reviewing` |
| `assets/image-sources/professionals-inspector.jpg` | `professionals.inspector-grading` |
| `assets/image-sources/professionals-trader.jpg` | `professionals.trader-phone` |
| `assets/image-sources/reports-coverage.jpg` | `reports.coverage-report` |
| `assets/image-sources/reports-market.jpg` | `reports.market-report` |
| `assets/image-sources/ui-placeholder.jpg` | `ui.placeholder` |
