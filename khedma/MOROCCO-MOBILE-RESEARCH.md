# Moroccan mobile experience and short domain research

Checked 5 October 2026. This is a focused sample of Moroccan consumer services and directly comparable marketplaces, not a ranking or an audit of every popular Moroccan website. Sources are official product/help pages where possible. Individual customer reviews below identify failure scenarios; they do not measure how common those problems are.

## What the Moroccan data supports

ANRT's 2024–2025 ICT survey reports that **94.2% of internet users aged five and above prefer a smartphone for internet access** (printed page 31). Among people who bought online in 2024, **84.1% reported cash on delivery and 43.3% card payments** (page 41). Payment methods are multiple responses, so these figures are not mutually exclusive transaction shares. Phone usability and clear payment expectations deserve priority. [Original ANRT survey](https://anrt.ma/sites/default/files/2025-10/Enqu%C3%AAte%20TIC%202024-2025.pdf), [official survey catalogue](https://anrt.ma/observatoires/enquete-annuelle-marche-des-tic).

The original PDF was downloaded and read locally because the browser text tool could not retrieve it. Temporary source evidence: `/tmp/khedma-anrt-survey-2024-2025.pdf` and its extracted text alongside it.

## Relevant services and the lessons for Khedma

| Service reviewed | Verified product/support behavior | Practical lesson for Khedma |
| --- | --- | --- |
| **Avito Morocco** | Its official Android listing offers location/category/keyword search, direct contact, and saved favorites. A 21 August 2026 review asks to inspect the other party's profile from chat and reports losing the selected neighborhood. | Keep city and service through search, signup and booking. Make the chosen worker's public profile easy to revisit from a job. Do not turn unavailable profile details into invented trust badges. [Official listing and reviews](https://play.google.com/store/apps/details?hl=fr&id=se.scmv.morocco). |
| **JumiaPay Morocco** | Its FAQ explicitly addresses waiting during checkout, card activation for online purchases, missing bank confirmation codes, account access, and confirmation. It instructs customers not to refresh while an order is processing and promises an error if processing fails. | Show an operation-specific wait state; prevent repeated submission. When a request fails, retain entered information and explain how to continue. A bank or provider error needs different wording from an offline connection. [Official FAQ](https://pay.jumia.ma/cms/personal-faq.html). |
| **Glovo Morocco** | Location determines the available businesses; delivery estimates and charges are exposed before ordering. General help distinguishes waiting for assignment from an anticipated delay and offers order-linked help for problems. Available payment methods depend on country. | Distinguish “sending your request” from “waiting for the worker's answer.” Show current job state and the next useful action. Say a remote worker must agree to travel rather than implying coverage. Give problem reporting a clear label. [Morocco service page](https://glovoapp.com/fr/ma/glovo-delivery), [official help](https://glovoapp.com/docs/fr/faq/). |
| **inDrive** | The official user guide separates entering the route, proposing a fare, receiving responses, and choosing a driver using price, rating and vehicle information. Comments allow extra location instructions. | Keep negotiation separate from accepted agreement. Put the accepted price and visit time near the main action, and require explicit acceptance of changes. For moving jobs, keep pickup, destination, items and vehicle needs clear. [Official user guide](https://blog.indrive.com/en-in/article/passengers-101-how-to-use-our-app). |
| **Bricole Morocco** | The local service marketplace shows public professional profiles with work photos, experience and cities, and describes browsing before account creation and negotiating directly. Its page markets zero commission; those are the operator's claims, not independently audited adoption figures. | Let people inspect workers before asking them to sign up. Keep one obvious request action. Explain Khedma's fee and benefits before commitment, especially when competing services promote free contact. [Official Morocco site](https://bricoleapp.com/fr/ma/). |
| **BricolApp** | Its site uses a three-step request/proposal/reservation explanation, lists five Moroccan cities and describes showing accepted payment options before booking. It also advertises no worker commission. | Use a short phone guide with one action per step. Publish actual coverage and payment availability. Separate money paid to the worker from money paid to Khedma. [Official site](https://bricolapp.ma/fr/accueil/). |
| **My Wafa** | Official mobile information highlights one-tap assistance, location sharing for breakdowns, and a support channel for application difficulties. It offers a quote by email and completion through an agent for users avoiding online payment. | Keep help reachable and location permission optional. Offer a working fallback when a device permission or an external service is unavailable. This is a product example, not an insurance workflow to copy into bookings. [Official product page](https://www.wafaassurance.ma/fr/particuliers/application-mobile-assurance). |

## Customer-reported problems worth testing

Moroccan inDrive users have described being asked for more money after a price was accepted and being moved into off-platform communication. These are unverified individual accounts, not findings about every driver. The relevant protection in Khedma is a visible accepted agreement and an accessible report path. [Morocco discussion](https://www.reddit.com/r/Morocco/comments/1sxytuc/indrive_drivers_accept_the_request_and_then/), [customer reviews with Morocco-specific accounts](https://fr.trustpilot.com/review/indrive.com).

A Moroccan Glovo customer described an address mismatch and difficulty resolving it with support. This is one anecdote. For Khedma, preserve the address supplied for the job, confirm moving details before submission, and keep them visible to the entitled participants after contact unlock. [Customer discussion](https://www.reddit.com/r/Morocco/comments/1gej74e/).

The Avito review above is another individual account; test retaining location choices and returning from a worker profile to the search context.

## Priorities for the phone implementation

These recommendations are an inference from the sources and Khedma source review, rather than an assertion that every feature below is missing.

1. **Feedback while waiting:** a centered, readable status for user-triggered network operations, with the operation name and a longer-wait explanation. Success, failure and waiting for another human must be different states. Avoid random percentage bars and promises about connection quality. Routine background polling should not interrupt the screen.
2. **Forgiving phone entry:** accept complete Moroccan numbers starting 05, 06 or 07, spaces and supported Arabic digits, plus `+212`/`00212` equivalents; show ten required national digits. Normalize consistently in signup, login and account editing. Do not claim the prefix proves SMS/WhatsApp availability or ownership.
3. **Small steps and preserved work:** one dominant phone action, optional details collapsed, fields kept after validation or network failure, and the selected city/service retained through authentication. A retry should not erase or duplicate a request.
4. **Helpful search:** keep text editable; show selectable suggestions without replacing it silently. Empty results should offer available services or other cities, with travel clearly subject to agreement.
5. **Clear agreement:** accepted price, visit time and payment obligations readable before confirmation. Explain who receives each amount and what stays locked while either fee is unpaid. Continue showing the accepted price during work.
6. **Reachable help and controls:** maintain phone-friendly touch targets and input font sizes, language controls, visible login/signup, and report/cancel confirmation paths. Check the keyboard, menu, theme and Arabic layout without relying on desktop animations.
7. **Honest recovery:** distinguish input errors, account/session errors, offline state, request timeout, server trouble, unavailable worker, and unconfigured payment provider. Keep explanatory text short and useful.

The ANRT numbering notice describes ten national digits, the international country code 212, and nine significant digits. Its allocation table includes fixed numbers and some Wana mobile allocations within 05; 05 should not be rejected wholesale or treated as a universal SMS classification. [ANRT notification published by ITU](https://www.ituob.org/issues/1170-en/).

## Short naming options and registry evidence

**Best match to the brief: Yedli — `yedli.ma` and `yedli.com`.** Five letters, suggested pronunciation “yed-lee”; the name can evoke a helping hand through “yed.” That is a naming idea, not a claim that the invented full name is a standard Darija word.

Seven five-letter alternatives were screened. Availability below means the registry had no registered object at the check time. It does not reserve the domain, guarantee a registrar's checkout, or clear trademarks.

| Candidate | Suggested pronunciation | .ma registry result | .com registry result | UTC check on 5 October 2026 |
| --- | --- | --- | --- | --- |
| **Yedli** | yed-lee | Unregistered | **Unregistered, HTTP 404** | 18:05:53 |
| **Yedlo** | yed-lo | Unregistered | Registered, HTTP 200 | 18:09:17 |
| **Dabni** | dab-nee | Unregistered | Registered, HTTP 200 | 18:10:18 |
| **Sahno** | sah-no | Unregistered | Registered, HTTP 200 | 18:10:18 |
| **Rafki** | raf-kee | Unregistered | Registered, HTTP 200 | 18:05:53 |
| **Yedzi** | yed-zee | Unregistered | Registered, HTTP 200 | 18:09:17 |
| **Rovni** | rov-nee | Unregistered | Registered, HTTP 200 | 18:10:18 |

For `.ma`, each exact name was queried over WHOIS at `whois.registre.ma:43`. The response contained the queried domain name and **“The queried object does not exist: No Object Found”**. [IANA's official .ma delegation](https://www.iana.org/domains/root/db/ma.html) identifies this WHOIS server and ANRT as the registry manager. [Registry WHOIS information](https://www.registre.ma/ressources/servicewhois).

For `.com`, each exact name was queried through `https://rdap.verisign.com/com/v1/domain/{name}.com`. [Yedli registry query](https://rdap.verisign.com/com/v1/domain/yedli.com) returned HTTP 404; the registered alternatives returned HTTP 200 with matching `ldhName` records. No DNS-only availability test was used.

Full registry responses and timestamps are preserved locally in `/tmp/khedma-short-domain-availability.json`, `/tmp/khedma-short-domain-availability-round2.json` and `/tmp/khedma-short-domain-availability-round3.json`.

Several attractive short options were deliberately removed after an obvious existing-brand screen: Dabli is an active [iPhone app](https://apps.apple.com/nl/app/dabli/id6808758174), Fidlo is an existing [loyalty service](https://fidlo.fr/cgu), Hanvo is a [work-glove brand](https://hanvosafety.com/about/), Rafyo is a [school software service](https://rafyo.com/about/), and Rafni names existing [commerce businesses](https://rafnillc.com/). A web screen is not a trademark search. No purchase, reservation, or automatic renaming of Khedma was performed.

Yedli.ma and Yedli.com were reconfirmed unregistered at 18:36:42 UTC on 5 October 2026. Final direct registry evidence: `/tmp/khedma-yedli-final-registry-check.json`.
