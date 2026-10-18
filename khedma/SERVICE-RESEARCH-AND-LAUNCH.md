# Service expansion and launch plan — 3 October 2026

## Evidence and its limits

Public web searches targeted Moroccan Facebook group posts using French and Darija/Arabic queries for air-conditioner technicians, metalworkers and appliance repair. They did not yield readable, relevant Moroccan customer posts: several Facebook results showed login screens and further targeted group queries returned no results. This is not evidence that demand is absent, and it does not establish which services are most requested in groups. No private groups were accessed and no personal post information was collected.

As a fallback, primary Moroccan service-provider catalogs were reviewed:

- [Hany](https://hany.ma/services): locksmiths, appliance repair, carpentry and air-conditioner repair among its listed services.
- [Bricodar](https://www.bricodar.ma/): air conditioning, appliances, aluminium, metal joinery and tiling.

These establish that the trades are offered in the Moroccan home-service market. They do not establish demand volume, conversion rates, quality or a popularity ranking. The expansion is a product recommendation informed by those catalogs and the user's examples.

## Added now

| Category | Typical request |
| --- | --- |
| Metalwork and welding | Metal door, iron gate, railing or welded fitting repair |
| Air conditioning | Installation, cleaning, diagnosis and repair |
| Appliance repair | Washing machine, refrigerator, dishwasher, electric oven |
| Aluminium and glass | Sliding window, aluminium frame, shutter or glazing repair |
| Carpentry and furniture | Cupboard, wooden furniture repair, furniture assembly |
| Locksmith | Lock replacement, lock repair, door opening |
| Tiling and zellige | Broken tiles, zellige, grout and small tiling work |

All seven are available in English, French and Arabic, with aliases such as clim, climat, كليما, حداد, machine à laver and زلايجي. The original eight categories and existing database links are preserved. The local category table has been seeded; another checkout needs `php artisan db:seed --class=ServiceCategorySeeder`. No worker is automatically assigned a new trade and no sample supply is inserted.

Defer upholstery, pest control, computer repair and larger renovation projects until customer requests and worker supply justify them. Water-heater requests can initially be handled within plumbing, with the actual scope and qualified worker agreed before booking. Do not treat gas work or structural work as a generic handyman task.

## Decisions to make before opening to customers

- Start with one city or a small neighboring-city area and recruit actual workers per trade. A large category menu without workers is not useful coverage.
- Record the client's problem, appliance model/material and location. Add photos and a way for the worker/client to clarify details before committing to a quote.
- Show what the proposal includes: diagnosis/visit fee, labor, parts, travel, disposal and warranty. Agree any extra work before charging. Current proposals store one total in MAD; separate price components and negotiation messages are still needed.
- Have workers state the work they can perform and verify any claimed qualifications. Decide how to handle property damage, no-shows, complaints and refunds. Do not advertise verification, insurance or emergency response until the operations actually support those claims.
- For locksmith requests, establish how the worker checks the requester is authorized to access the property. For welding, electrical and refrigerant work, recruit suitable specialists and define safe job boundaries.
- Publish truthful support, privacy, booking/cancellation and payment information. Decide the business model and whether customers pay the worker directly or through the platform. Current online payments are not connected.
- Test with real clients/workers and measure requests by category/city, acceptance rate, completed jobs and complaints before expanding. Do not copy group participants' personal details into your platform.

## Finish criteria and planning estimate

The project has accounts, public worker search, booking proposals/client confirmation, completion/reviews, profile settings and data export. It is not yet a production-ready marketplace.

A small pilot should pass these gates:

1. Reliable forgotten-password recovery with a configured delivery service; complete the email/phone identity handling policy.
2. Working request/status notifications and client–worker clarification/communication.
3. Google/Apple credentials configured and live-tested if social sign-in is included in the pilot.
4. Production deployment with HTTPS, backup/restore verification and basic error monitoring.
5. Support and booking/payment/cancellation policies, real workers recruited, and a complete client–worker walkthrough on mobile and in all three languages.

A planning estimate is **2–4 weeks of focused development and setup for a limited pilot**, assuming quick decisions, credentials, hosting and delivery services are available, a small initial city scope, and payments remain directly between client and worker. From 3 October 2026 that corresponds to an illustrative 17–31 October window, not a scheduled or promised launch. A broader launch with in-app payments, stronger verification, messaging and mature support needs additional work; estimate it after those requirements and providers are agreed. There is no automatic work schedule attached to this document.
