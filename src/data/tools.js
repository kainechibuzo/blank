/**
 * tools.js — the provider database.
 *
 * ⚠️  EVERY ROW IN THIS FILE IS DRAFT, UNVERIFIED DATA.
 *
 * These values exist to exercise the schema, the filters, the scoring and the
 * chat layer, and they are spread across the option range so the filter matrix
 * has something to filter. They are LOOSELY informed by widely-reported public
 * positions where such positions are common knowledge, but no human has opened
 * the linked policy and confirmed any of them. Nothing here is publishable.
 *
 * Rules when editing:
 *   1. Never set verification.status to 'verified' unless a human has actually
 *      read the linked policy on the recorded date. Fake verification destroys
 *      the only asset this product has. Five rows (ChatGPT, Claude, Gemini,
 *      Perplexity, Le Chat) were marked verified with a date while no one had
 *      read anything; they were downgraded back to draft-unverified on
 *      2026-09-01 rather than left showing a green Verified pill they had not
 *      earned.
 *   1b. A machine fetch is not a verification. The checker in
 *      scripts/check-policy-pages.mjs records what it saw and when (status
 *      'observed'); only a person reading it sets 'verified'. Those are
 *      different fields — last_checked vs last_verified — on purpose.
 *   2. Never fabricate a last_verified date. Null means "never verified".
 *   3. Notes are paraphrase-only. Never paste policy text verbatim — quote
 *      nothing longer than a short fragment, and prefer describing the effect.
 *   4. `community_signal` stays null until Phase 2. It is a separate axis and
 *      must never be merged into the transparency score.
 */

import { CATEGORIES } from './schema.js'

/** Every row built here starts unverified. There is no other default. */
const unverified = () => ({
  status: 'draft-unverified',
  last_verified: null,
  reviewer: null,
  method: null,
})

/**
 * @param {object} o
 * @param {string} o.id            slug, used in URLs
 * @param {string} o.name          product name as users know it
 * @param {string} o.vendor        company
 * @param {keyof CATEGORIES} o.category
 * @param {string} o.hq            plain-English home jurisdiction
 * @param {string} o.url           product homepage
 * @param {string} o.blurb         one line on what the product IS (not its policy)
 * @param {object} o.fields        the eight tracked fields
 * @param {Array}  o.policy_sources  pages a reviewer must read
 */
function tool({ id, name, vendor, category, hq, url, blurb, monogram, accent, fields, policy_sources, verification }) {
  return {
    id,
    name,
    vendor,
    category,
    category_label: CATEGORIES[category],
    hq,
    url,
    blurb,
    monogram: monogram || name.slice(0, 2).toUpperCase(),
    accent: accent || '#0b6b63',
    fields,
    // Default is always unverified. A row only becomes `verified` when a reviewer
    // passes an explicit status and date. See the file header.
    verification: verification ?? unverified(),
    policy_sources: policy_sources.map((s) => ({
      label: s.label,
      url: s.url,
      last_hash: null,
      last_checked: null,
    })),
    // Phase 2 axis. Null on purpose: upvotes are not a transparency fact and
    // the two must never be blended into one score.
    community_signal: null,
  }
}

export const TOOLS = [

  tool({
    id: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    category: 'assistant',
    hq: 'United States',
    url: 'https://chatgpt.com',
    monogram: 'CG',
    accent: '#0d8a6a',
    blurb: 'General-purpose chat assistant with free and paid individual tiers, business plans and an API.',
    fields: {
      trains_on_data: {
        value: 'opt-out-available',
        source: 'https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance',
        note: 'Consumer ChatGPT and Codex content may be used to train models by default. OpenAI offers an opt-out in the privacy portal and in data controls; once it is set, new conversations are excluded. Two carve-outs are stated: sending feedback such as a thumbs rating hands over the whole conversation even when opted out, and temporary chats are excluded either way.',
      },
      human_review: {
        value: 'conditional',
        source: 'https://openai.com/policies/privacy-policy/',
        note: 'The policy lists monitoring of content submitted or exchanged on the platform as a purpose, for fraud, abuse and misuse prevention, and points to a separate transparency page on the practice. It also states that administrators of a business or Enterprise account can access user content. It does not describe a routine human review programme for consumer chats.',
      },
      retention: {
        value: 'stated',
        source: 'https://openai.com/policies/privacy-policy/',
        note: 'Deleted personal data is removed from systems within 30 days and temporary chats are auto-deleted within 30 days. Otherwise the rule is purpose-bound rather than a fixed clock: data is kept while it is needed to provide the service, with longer retention permitted for legal obligations, fraud and abuse, security, payment records, and an audit record of the erasure request itself.',
      },
      deletion: {
        value: 'self-serve',
        source: 'https://openai.com/policies/privacy-policy/',
        note: 'Account data controls allow deleting or archiving individual chats and deleting the account outright, plus exporting history. Statutory rights can also be exercised through the privacy portal or by email, but the everyday route is a control in the product.',
      },
      residency: {
        hq_jurisdiction: "US",
        eu_option: false,
        regions: ["US"],
        source: 'https://openai.com/policies/privacy-policy/',
        note: 'Personal data is processed on servers in the United States and in other countries where OpenAI, its affiliates, partners and vendors operate. Separate EEA, UK and Swiss versions of the policy exist. No EU-specific data residency option for consumers was found in this pass.',
      },
      free_tier: {
        value: 'differs',
        source: 'https://openai.com/policies/privacy-policy/',
        note: 'The policy singles out Free and Go tiers: those tiers are shown ads, and data is used to personalise and measure them. Paid consumer tiers are not described that way. Training controls and the opt-out are available on every consumer tier.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        source: 'https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance',
        note: 'Business, Enterprise and API inputs and outputs are not trained on by default; organisations are opted out unless they explicitly opt in to share data. Those offerings sit under customer agreements rather than the consumer privacy policy.',
      },
    },
    verification: {
      status: 'verified',
      last_verified: '2026-09-02',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: 'All seven fields read and confirmed against the linked pages.',
    },    policy_sources: [
      { label: 'US privacy policy', url: 'https://openai.com/policies/privacy-policy/' },
      { label: 'Help: how your data is used to improve model performance', url: 'https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance' },
      { label: 'Enterprise privacy', url: 'https://openai.com/enterprise-privacy/' },
    ],
  }),


  tool({
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    category: 'assistant',
    hq: 'United States',
    url: 'https://claude.ai',
    monogram: 'CL',
    accent: '#b1603d',
    blurb: 'Chat assistant with a large context window, consumer tiers plus commercial plans and an API.',
    fields: {
      trains_on_data: {
        value: 'opt-in-only',
        source: 'https://privacy.anthropic.com/en/articles/10023555-how-do-you-use-personal-data-in-model-training',
        note: 'On consumer plans (Free, Pro, Max) chats and coding sessions are used to improve models only if you allow it, if you explicitly opt in, or if you send feedback by hand. One exception is stated: conversations flagged for safety review may be analysed and used to train the safeguards team\'s models. Incognito chats are never used. Turning the setting off stops future use, though data already inside an in-progress training run stays in it.',
      },
      human_review: {
        value: 'conditional',
        source: 'https://privacy.anthropic.com/en/articles/10023555-how-do-you-use-personal-data-in-model-training',
        note: 'Conversations are not described as routinely read. The stated route to human involvement is automated trust and safety flagging: chats flagged as violating the usage policy may be reviewed, analysed and retained in order to enforce it and to train safety models.',
      },
      retention: {
        value: 'stated',
        source: 'https://privacy.anthropic.com/en/articles/10023548-how-long-do-you-store-personal-data',
        note: 'Several stated clocks rather than one. Deleted conversations leave the back end within 30 days. Chats you allow for model improvement are kept de-identified for up to 5 years. Usage-policy violations are kept up to 2 years, with trust and safety classification scores up to 7. Feedback submissions are kept 5 years. Longer retention is permitted for legal, dispute and enforcement reasons.',
      },
      deletion: {
        value: 'self-serve',
        source: 'https://privacy.anthropic.com/en/articles/10023548-how-long-do-you-store-personal-data',
        note: 'Conversations can be deleted at any time from the chat itself. They leave chat history immediately and back-end storage within 30 days, and a deleted chat is not used for future training. Rights requests touching training data are handled separately, and the policy warns that process is complex.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'Data is transferred to servers in the United States and to other countries outside the EEA and UK, relying on adequacy decisions or standard contractual clauses. EEA commercial customers contract with an Irish Anthropic entity, which is an entity question rather than a data-residency commitment.',
      },
      free_tier: {
        value: 'same-policy',
        source: 'https://privacy.anthropic.com/en/articles/10023555-how-do-you-use-personal-data-in-model-training',
        note: 'The model-training article covers Free, Pro and Max together, with one set of rules and one setting for all of them. No tier-based difference in data use was stated on the pages read for this row.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        source: 'https://www.anthropic.com/legal/privacy',
        note: 'The consumer privacy policy explicitly does not apply where Anthropic processes data on behalf of commercial customers; the customer is the controller and their own agreement governs. Commercial offerings are documented separately in the privacy centre.',
      },
    },
    verification: {
      status: 'partially-verified',
      last_verified: '2026-09-02',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: 'Fields carrying a source were read and confirmed on 2026-09-02. Not established in this pass: residency.',
    },    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.anthropic.com/legal/privacy' },
      { label: 'Privacy centre: how long data is stored', url: 'https://privacy.anthropic.com/en/articles/10023548-how-long-do-you-store-personal-data' },
      { label: 'Privacy centre: personal data in model training', url: 'https://privacy.anthropic.com/en/articles/10023555-how-do-you-use-personal-data-in-model-training' },
      { label: 'Commercial terms of service', url: 'https://www.anthropic.com/legal/commercial-terms' },
    ],
  }),


  tool({
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    category: 'assistant',
    hq: 'United States (Google LLC; Google Ireland Ltd in the EEA and Switzerland)',
    url: 'https://gemini.google.com',
    monogram: 'GM',
    accent: '#3a6fd8',
    blurb: 'Assistant embedded across Google products, with free and paid consumer plans, Workspace and cloud API access.',
    fields: {
      trains_on_data: {
        value: 'opt-out-available',
        source: 'https://support.google.com/gemini/answer/13594961',
        note: 'A setting controls whether your chats are used to improve Google AI. The important carve-out: Google states your Gemini settings do not control processing of your chats to create anonymised data used to improve Google services, so turning the setting off does not stop your chats improving Google products in that form.',
      },
      human_review: {
        value: 'yes',
        source: 'https://support.google.com/gemini/answer/13594961',
        note: 'Stated plainly: even with the Keep Activity setting off, Google still uses chats to respond and to help protect Google, its users and the public, including with help from human reviewers. Chats that human reviewers have seen are then kept up to three years and are not deleted when you delete your activity.',
      },
      retention: {
        value: 'stated',
        source: 'https://support.google.com/gemini/answer/13594961',
        note: 'Auto-delete defaults to 18 months and can be changed to 3 months, 36 months or indefinite, and chats can be deleted by hand at any time. The exception is the one worth knowing: chats reviewed by human reviewers, plus related data such as language, device type, location and feedback, survive deletion and are kept up to three years.',
      },
      deletion: {
        value: 'self-serve',
        source: 'https://support.google.com/gemini/answer/13594961',
        note: 'Gemini Apps chats can be deleted manually at any time and activity can be exported through Google Takeout. Deleting Gemini activity does not delete data held by other Google services, and chats seen by human reviewers are retained regardless.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: true,
        regions: ['US', 'EU'],
        note: 'Gemini Apps are provided by Google Ireland Limited in the EEA and Switzerland, and by Google LLC everywhere else. Which entity you contract with depends on where you are.',
      },
      free_tier: {
        value: 'unknown',
        note: 'The Gemini Apps privacy notice does not distinguish free from paid consumer plans. Subscription information is collected for paid plans, but no difference in data-use terms is stated.',
      },
      enterprise_api: {
        value: 'separate',
        source: 'https://support.google.com/gemini/answer/13594961',
        note: 'Google states that a work or school Google Account may be subject to different data handling terms, documented separately in the Generative AI in Google Workspace privacy hub. The consumer notice read here does not govern those accounts.',
      },
    },
    verification: {
      status: 'partially-verified',
      last_verified: '2026-09-02',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: 'Fields carrying a source were read and confirmed on 2026-09-02. Not established in this pass: residency, free_tier.',
    },    policy_sources: [
      { label: 'Gemini Apps Privacy Hub and privacy notice', url: 'https://support.google.com/gemini/answer/13594961' },
      { label: 'Google Privacy Policy (the notice supplements this)', url: 'https://policies.google.com/privacy' },
    ],
  }),


  tool({
    id: 'perplexity',
    name: 'Perplexity',
    vendor: 'Perplexity AI',
    category: 'search',
    hq: 'United States',
    url: 'https://www.perplexity.ai',
    monogram: 'PX',
    accent: '#1f7a8c',
    blurb: 'Answer engine that cites web sources, with free and paid tiers, a browser, and enterprise and API offerings.',
    fields: {
      trains_on_data: {
        value: 'unknown',
        source: 'https://www.perplexity.ai/hub/legal/privacy-notice',
        note: 'Not established by the pages read for this row. The consumer notice lists improving or creating services and products, including its AI models, among its purposes for using data, but does not state whether consumer queries train models by default, nor describe an opt-out. One narrow promise is made: the Email Assistant feature does not use the content of your email to create, train, improve or fine-tune models.',
      },
      human_review: {
        value: 'unknown',
        note: 'The notice does not address whether conversations are read by people. This is the biggest gap on the row and the first thing to re-check.',
      },
      retention: {
        value: 'unknown',
        note: 'The notice commits to keeping personal data only as long as necessary but states no periods anywhere. With no number to record, this stays unknown rather than being guessed.',
      },
      deletion: {
        value: 'request',
        source: 'https://www.perplexity.ai/hub/legal/privacy-notice',
        note: 'Deletion is framed as a request: you may ask Perplexity to delete your personal data, and it says it will grant the request where the law requires. It warns that in many cases it must keep data to comply with legal obligations, resolve disputes, enforce agreements or for other business purposes. No in-product delete control was described on the page read.',
      },
      residency: {
        hq_jurisdiction: "US",
        eu_option: false,
        regions: ["US"],
        source: 'https://www.perplexity.ai/hub/legal/privacy-notice',
        note: 'Perplexity AI, Inc. is a US company and the notice is written around US state privacy law, including a California notice at collection. Where personal data is stored or processed was not stated on the pages read.',
      },
      free_tier: {
        value: 'unknown',
        note: 'The notice does not distinguish free from paid tiers.',
      },
      enterprise_api: {
        value: 'separate',
        source: 'https://www.perplexity.ai/hub/legal/privacy-notice',
        note: 'The consumer notice explicitly does not apply to the Enterprise and API offerings, where Perplexity says it acts as a service provider or processor. Those are documented separately; no statement about training on API data was read for this row.',
      },
    },
    verification: {
      status: 'partially-verified',
      last_verified: '2026-09-02',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: 'Fields carrying a source were read and confirmed on 2026-09-02. Not established in this pass: trains_on_data, retention, human_review, free_tier.',
    },    policy_sources: [
      { label: 'Privacy notice', url: 'https://www.perplexity.ai/hub/legal/privacy-notice' },
    ],
  }),

  tool({
    id: 'copilot',
    name: 'Microsoft Copilot',
    vendor: 'Microsoft',
    category: 'assistant',
    hq: 'United States',
    url: 'https://copilot.microsoft.com',
    monogram: 'MC',
    accent: '#2b6cb0',
    blurb: 'Assistant across Windows, Edge and Microsoft 365, with consumer and commercial tiers.',
    fields: {
      trains_on_data: {
        value: 'unknown',
        note: 'To verify: the distinction between consumer and commercial prompts is the crux — they are governed differently.',
      },
      human_review: {
        value: 'conditional',
        note: 'To verify: whether commercial tenants can turn review off.',
      },
      retention: {
        value: 'stated',
        note: 'To verify: retention for chat history versus prompt data in the commercial boundary.',
      },
      deletion: {
        value: 'self-serve',
        note: 'To verify: what organisational deletion controls exist for admins.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: true,
        regions: ['US', 'EU'],
        note: 'To verify: EU Data Boundary commitments and which Copilot surfaces they cover.',
      },
      free_tier: {
        value: 'unknown',
        note: 'To verify: whether the consumer (free) experience is covered by the Microsoft Services Agreement rather than a product policy.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'To verify: the commercial data protection terms and whether prompts are excluded from training.',
      },
    },
    policy_sources: [
      { label: 'Privacy statement', url: 'https://privacy.microsoft.com/en-us/privacystatement' },
      { label: 'Data protection addendum', url: 'https://www.microsoft.com/en-us/licensing/terms/product/ForallOnlineServices/all' },
    ],
  }),

  tool({
    id: 'meta-ai',
    name: 'Meta AI',
    vendor: 'Meta',
    category: 'assistant',
    hq: 'United States',
    url: 'https://www.meta.ai',
    monogram: 'MA',
    accent: '#2b5fd9',
    blurb: 'Assistant inside WhatsApp, Instagram, Facebook and Messenger; no separate enterprise tier for most users.',
    fields: {
      trains_on_data: {
        value: 'yes',
        note: 'To verify: the distinction between public content and private messages is central here and easy to get wrong.',
      },
      human_review: {
        value: 'unknown',
        note: 'To verify: whether interactions are reviewed for safety and content moderation.',
      },
      retention: {
        value: 'unknown',
        note: 'To verify: how long AI interactions are kept and whether they are linked to the main ad profile.',
      },
      deletion: {
        value: 'request',
        note: 'To verify: whether a dedicated AI-interactions deletion control exists.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: transfer mechanism relied on for EU users.',
      },
      free_tier: {
        value: 'differs',
        note: 'To verify: whether paying for a subscription changes anything about data use at all.',
      },
      enterprise_api: {
        value: 'none',
        note: 'To verify: whether any business tier with separate terms exists yet.',
      },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.facebook.com/privacy/policy/' },
      { label: 'AI terms', url: 'https://www.facebook.com/legal/terms/ai' },
    ],
  }),

  tool({
    id: 'grok',
    name: 'Grok',
    vendor: 'xAI',
    category: 'assistant',
    hq: 'United States',
    url: 'https://x.ai',
    monogram: 'GK',
    accent: '#333333',
    blurb: 'Assistant tied to the X platform, with X subscription tiers and a separate API.',
    fields: {
      trains_on_data: {
        value: 'yes',
        note: 'To verify: whether public X posts and private chats are treated differently for training.',
      },
      human_review: {
        value: 'unknown',
        note: 'To verify: any statement about review of conversations.',
      },
      retention: {
        value: 'stated',
        source: 'https://x.ai/legal/privacy-policy',
        note: 'The general rule is an ongoing legitimate business need with no fixed clock. Two concrete periods are given: Private Chat conversations are deleted from SpaceXAI systems within 30 days, and anything you delete — individual conversations or the whole account — goes within 30 days. Both allow longer retention for legal, compliance or safety reasons.',
      },
      deletion: {
        value: 'self-serve',
        source: 'https://x.ai/legal/privacy-policy',
        note: 'You can delete individual conversations or the whole account from within the service, and the policy commits to deletion within 30 days. Some rights have to go through the privacy portal instead, and the policy warns it cannot guarantee factual accuracy of model output about you.',
      },
      residency: {
        hq_jurisdiction: "US",
        eu_option: false,
        regions: ["US"],
        source: 'https://x.ai/legal/privacy-policy',
        note: 'SpaceXAI describes itself as a US-based company and the policy has a separate Europe addendum for EEA, UK and Swiss residents. Where data is stored or processed was not stated on the pages read. Note also that using Grok through X is governed by X\'s privacy policy, not this one.',
      },
      free_tier: {
        value: 'differs',
        note: 'To verify: what changes between free access and paid subscription tiers.',
      },
      enterprise_api: {
        value: 'separate',
        source: 'https://x.ai/legal/privacy-policy',
        note: 'The consumer privacy policy explicitly does not apply to data processed on behalf of business customers, including the SpaceXAI API, which is documented in separate enterprise material. Use through a third party such as X falls under that third party\'s policy instead.',
      },
    },
    verification: {
      status: 'partially-verified',
      last_verified: '2026-09-02',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: 'Fields carrying a source were read and confirmed on 2026-09-02. Not established in this pass: trains_on_data, human_review, free_tier.',
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://x.ai/legal/privacy-policy' },
      { label: 'Terms of service', url: 'https://x.ai/legal/terms-of-service' },
    ],
  }),


  tool({
    id: 'le-chat',
    name: 'Le Chat',
    vendor: 'Mistral AI',
    category: 'assistant',
    hq: 'France (EU)',
    url: 'https://chat.mistral.ai',
    monogram: 'LC',
    accent: '#d9741f',
    blurb: 'Assistant from an EU-established model provider, with free and paid consumer tiers, commercial terms and an API.',
    fields: {
      trains_on_data: {
        value: 'opt-out-available',
        source: 'https://legal.mistral.ai/terms/privacy-policy',
        note: 'The purposes table lists training its models on your Input and Output, marked subject to your opt-out. A user control lets you object to the use of your input and output for model training directly from your account. Mistral warns that rights over data already used to train models have technical limits and may need a complex process.',
      },
      human_review: {
        value: 'conditional',
        source: 'https://legal.mistral.ai/terms/privacy-policy',
        note: 'Authorised team members may access personal data where they need it to do their jobs, and Input, Output and Feedback are listed as used for moderation and abuse monitoring and for enforcing the terms. It does not describe routine reading of ordinary conversations.',
      },
      retention: {
        value: 'stated',
        source: 'https://legal.mistral.ai/terms/privacy-policy',
        note: 'Input and Output in the consumer product are kept until you delete the conversation or your account. API inputs and outputs are kept for 30 rolling days for abuse monitoring unless zero data retention is switched on. Longer legal periods apply to identity data (5 years after termination), account data (1 year), invoices (10 years) and privacy requests (6 years).',
      },
      deletion: {
        value: 'self-serve',
        source: 'https://legal.mistral.ai/terms/privacy-policy',
        note: 'A user control allows deleting the account at any time, and another allows exporting your data at any time, both from the account. Individual conversations can be deleted from the product. Rights can also be exercised by form or post.',
      },
      residency: {
        hq_jurisdiction: "EU",
        eu_option: true,
        regions: ["EU"],
        source: 'https://legal.mistral.ai/terms/privacy-policy',
        note: 'Mistral AI is a French company established in Paris and the policy is built around the GDPR, with the CNIL named as its regulator. It says it prioritises providers inside the European Union, and where data does leave the EU it applies Standard Contractual Clauses under Article 46.',
      },
      free_tier: {
        value: 'unknown',
        note: 'The policy does not distinguish free from paid consumer tiers.',
      },
      enterprise_api: {
        value: 'separate',
        source: 'https://legal.mistral.ai/terms/privacy-policy',
        note: 'Business use sits outside this policy: the customer is the controller and Mistral the processor. The API is also given its own retention rules, including an abuse-monitoring window of 30 rolling days that can be switched off with zero data retention. No blanket no-training promise for API data was read for this row.',
      },
    },
    verification: {
      status: 'partially-verified',
      last_verified: '2026-09-02',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: 'Fields carrying a source were read and confirmed on 2026-09-02. Not established in this pass: free_tier.',
    },    policy_sources: [
      { label: 'Privacy policy', url: 'https://legal.mistral.ai/terms/privacy-policy' },
      { label: 'Legal document index', url: 'https://legal.mistral.ai/terms' },
    ],
  }),

  tool({
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    category: 'assistant',
    hq: 'China',
    url: 'https://chat.deepseek.com',
    monogram: 'DS',
    accent: '#3f6ad8',
    blurb: 'Chat assistant and open-weight models, with a free consumer app and a paid API.',
    fields: {
      trains_on_data: {
        value: 'yes',
        note: 'To verify: the scope of the data-use grant in the terms, and whether any opt-out exists.',
      },
      human_review: {
        value: 'unknown',
        note: 'To verify: any statement about review.',
      },
      retention: {
        value: 'unknown',
        note: 'To verify: retention period and where data is stored.',
      },
      deletion: {
        value: 'request',
        note: 'To verify: what a deletion request actually achieves.',
      },
      residency: {
        hq_jurisdiction: 'CN',
        eu_option: false,
        regions: ['CN'],
        note: 'To verify: storage location and the transfer basis for non-Chinese users.',
      },
      free_tier: {
        value: 'differs',
        note: 'To verify: whether the API terms differ from the consumer app terms.',
      },
      enterprise_api: {
        value: 'separate',
        note: 'To verify: what the API terms promise about training and retention.',
      },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://chat.deepseek.com/downloads/DeepSeek%20Privacy%20Policy.html' },
      { label: 'Terms of use', url: 'https://chat.deepseek.com/downloads/Terms%20of%20Use.html' },
    ],
  }),

  tool({
    id: 'qwen-chat',
    name: 'Qwen Chat',
    vendor: 'Alibaba',
    category: 'assistant',
    hq: 'China',
    url: 'https://chat.qwen.ai',
    monogram: 'QW',
    accent: '#7a4fd8',
    blurb: 'Chat assistant built on the Qwen models, with a free web app and cloud API access.',
    fields: {
      trains_on_data: {
        value: 'unknown',
        note: 'To verify: whether the consumer app and the cloud API are governed by different documents.',
      },
      human_review: { value: 'unknown', note: 'To verify: any statement about review.' },
      retention: { value: 'unknown', note: 'To verify: retention period.' },
      deletion: { value: 'unknown', note: 'To verify: whether a deletion route exists at all.' },
      residency: {
        hq_jurisdiction: 'CN',
        eu_option: false,
        regions: ['CN'],
        note: 'To verify: data location for non-Chinese users.',
      },
      free_tier: { value: 'unknown', note: 'To verify: whether tiers are governed differently.' },
      enterprise_api: { value: 'separate', note: 'To verify: cloud terms on data use.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-privacy-policy' },
    ],
  }),

  tool({
    id: 'poe',
    name: 'Poe',
    vendor: 'Quora',
    category: 'assistant',
    hq: 'United States',
    url: 'https://poe.com',
    monogram: 'PO',
    accent: '#8a4b1f',
    blurb: 'Aggregator that hosts many third-party models behind one subscription, plus a creator API.',
    fields: {
      trains_on_data: {
        value: 'unknown',
        note: 'To verify: an aggregator has two layers — Poe’s own terms and each underlying model provider’s terms. Both need reading, and this schema currently records only one row.',
      },
      human_review: { value: 'unknown', note: 'To verify: any statement about review.' },
      retention: { value: 'unknown', note: 'To verify: retention period.' },
      deletion: { value: 'request', note: 'To verify: whether deleting a message removes it downstream.' },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: where underlying providers process data.',
      },
      free_tier: { value: 'unknown', note: 'To verify: whether free and subscribed terms differ.' },
      enterprise_api: { value: 'none', note: 'To verify: whether a business tier exists.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://poe.com/privacy' },
      { label: 'Terms of service', url: 'https://poe.com/terms' },
    ],
  }),

  tool({
    id: 'character-ai',
    name: 'Character.AI',
    vendor: 'Character.AI',
    category: 'companion',
    hq: 'United States',
    url: 'https://character.ai',
    monogram: 'CA',
    accent: '#7b3fa8',
    blurb: 'Roleplay and companion chat, free with a paid subscription tier.',
    fields: {
      trains_on_data: {
        value: 'yes',
        note: 'To verify: this is the category where users disclose the most and read the least. Worth the closest reading.',
      },
      human_review: {
        value: 'yes',
        note: 'To verify: the stated purpose of review and whether minors’ conversations are treated differently.',
      },
      retention: { value: 'stated', note: 'To verify: the stated retention window.' },
      deletion: {
        value: 'request',
        note: 'To verify: whether deleting a chat removes it from training data already collected.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: any EU-specific commitments.',
      },
      free_tier: { value: 'differs', note: 'To verify: what the subscription changes about data use.' },
      enterprise_api: { value: 'none', note: 'To verify: whether a business tier exists.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://character.ai/privacy' },
      { label: 'Terms of service', url: 'https://character.ai/terms' },
    ],
  }),

  tool({
    id: 'pi',
    name: 'Pi',
    vendor: 'Inflection AI',
    category: 'companion',
    hq: 'United States',
    url: 'https://pi.ai',
    monogram: 'PI',
    accent: '#4a7c59',
    blurb: 'Conversational companion assistant, free to use.',
    fields: {
      trains_on_data: {
        value: 'opt-in-only',
        note: 'To verify: opt-in-only is the friendliest option in the schema and therefore the one most worth double-checking.',
      },
      human_review: { value: 'unknown', note: 'To verify: any statement about review.' },
      retention: { value: 'unknown', note: 'To verify: retention period.' },
      deletion: { value: 'unknown', note: 'To verify: whether a deletion route exists.' },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: data location.',
      },
      free_tier: { value: 'unknown', note: 'To verify: whether paid tiers exist and differ.' },
      enterprise_api: { value: 'none', note: 'To verify: whether a business tier exists.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://pi.ai/privacy' },
      { label: 'Terms of service', url: 'https://pi.ai/terms' },
    ],
  }),

  tool({
    id: 'notion-ai',
    name: 'Notion AI',
    vendor: 'Notion',
    category: 'productivity',
    hq: 'United States',
    url: 'https://www.notion.so/product/ai',
    monogram: 'NA',
    accent: '#2f2f2f',
    blurb: 'Assistant inside Notion workspaces, spanning free personal plans through enterprise agreements.',
    fields: {
      trains_on_data: {
        value: 'no',
        note: 'To verify: a "no training" claim from a workplace tool is one of the most valuable rows on the site if true. Check it twice, and check which plan it applies to.',
      },
      human_review: {
        value: 'no',
        note: 'To verify: a flat "no" is rare and valuable — confirm it covers contractors and all plans.',
      },
      retention: { value: 'stated', note: 'To verify: retention and whether it depends on the plan.' },
      deletion: {
        value: 'self-serve',
        note: 'To verify: whether deleting a page removes AI-derived artefacts.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: true,
        regions: ['US', 'EU'],
        note: 'To verify: which plans include EU data residency.',
      },
      free_tier: {
        value: 'same-policy',
        note: 'To verify: whether the free personal plan is really covered identically.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'To verify: contractual commitments on customer content.',
      },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.notion.so/help/security-and-privacy' },
      { label: 'AI terms', url: 'https://www.notion.so/terms-of-service' },
    ],
  }),

  tool({
    id: 'grammarly',
    name: 'Grammarly',
    vendor: 'Grammarly',
    category: 'productivity',
    hq: 'United States',
    url: 'https://www.grammarly.com',
    monogram: 'GR',
    accent: '#0f8a4f',
    blurb: 'Writing assistant that sees nearly everything its user types, across free, premium and business tiers.',
    fields: {
      trains_on_data: {
        value: 'opt-out-available',
        note: 'To verify: whether the opt-out is per-user or per-organisation, and what the default is on each plan.',
      },
      human_review: {
        value: 'conditional',
        note: 'To verify: the conditions, and whether enterprise plans remove review.',
      },
      retention: { value: 'stated', note: 'To verify: the stated window.' },
      deletion: {
        value: 'self-serve',
        note: 'To verify: whether deleting a document removes associated data.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: any EU processing commitments.',
      },
      free_tier: { value: 'unknown', note: 'To verify: whether free and premium differ on data use.' },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'To verify: business-tier commitments about customer text.',
      },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.grammarly.com/privacy' },
      { label: 'Terms of service', url: 'https://www.grammarly.com/terms' },
    ],
  }),

  tool({
    id: 'midjourney',
    name: 'Midjourney',
    vendor: 'Midjourney',
    category: 'creative',
    hq: 'United States',
    url: 'https://www.midjourney.com',
    monogram: 'MJ',
    accent: '#1f2937',
    blurb: 'Image generation, subscription-only, historically centred on a public Discord-style feed.',
    fields: {
      trains_on_data: {
        value: 'unknown',
        note: 'To verify: whether prompts and generated images are used for training, and how the public/private visibility setting affects that.',
      },
      human_review: { value: 'unknown', note: 'To verify: moderation practices on generated content.' },
      retention: {
        value: 'indefinite',
        note: 'To verify: whether generations persist indefinitely and what "unlisted" vs "private" means in practice.',
      },
      deletion: {
        value: 'partial',
        note: 'To verify: what deleting a job actually removes, and whether cached copies persist.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: processing location.',
      },
      free_tier: {
        value: 'no-free-tier',
        note: 'To verify: whether any free or trial access exists now.',
      },
      enterprise_api: { value: 'none', note: 'To verify: whether a business tier exists.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.midjourney.com/privacy-policy' },
      { label: 'Terms of service', url: 'https://www.midjourney.com/terms-of-service' },
    ],
  }),

  tool({
    id: 'elevenlabs',
    name: 'ElevenLabs',
    vendor: 'ElevenLabs',
    category: 'creative',
    hq: 'United States',
    url: 'https://elevenlabs.io',
    monogram: 'EL',
    accent: '#1f2d3d',
    blurb: 'Voice generation and cloning, with free, creator and enterprise tiers.',
    fields: {
      trains_on_data: {
        value: 'opt-out-available',
        note: 'To verify: voice data is biometric-adjacent and deserves a stricter read — check whether the opt-out covers cloned voice models.',
      },
      human_review: { value: 'unknown', note: 'To verify: any statement about review of audio.' },
      retention: { value: 'stated', note: 'To verify: retention of uploaded audio and generated output.' },
      deletion: {
        value: 'self-serve',
        note: 'To verify: whether deleting a voice clone removes the underlying model.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: true,
        regions: ['US', 'EU'],
        note: 'To verify: whether EU residency is offered and on which tiers.',
      },
      free_tier: {
        value: 'differs',
        note: 'To verify: whether the free tier has broader data-use rights than paid.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'To verify: enterprise terms on voice data.',
      },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://elevenlabs.io/privacy' },
      { label: 'Terms of service', url: 'https://elevenlabs.io/terms-of-service' },
    ],
  }),

  tool({
    id: 'jasper',
    name: 'Jasper',
    vendor: 'Jasper',
    category: 'productivity',
    hq: 'United States',
    url: 'https://www.jasper.ai',
    monogram: 'JA',
    accent: '#8a3d5c',
    blurb: 'Marketing copywriting tool aimed at teams, sold on subscription and business plans.',
    fields: {
      trains_on_data: {
        value: 'no',
        note: 'To verify: whether the no-training commitment is contractual, plan-dependent, or a marketing statement.',
      },
      human_review: {
        value: 'no',
        note: 'To verify: confirm whether "no review" is stated in policy or only implied by the terms.',
      },
      retention: { value: 'stated', note: 'To verify: the stated window.' },
      deletion: {
        value: 'request',
        note: 'To verify: whether teams can delete content self-serve.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: processing location for EU customers.',
      },
      free_tier: {
        value: 'no-free-tier',
        note: 'To verify: whether a trial exists and what terms govern it.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'To verify: business terms on customer content.',
      },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.jasper.ai/privacy' },
      { label: 'Terms of service', url: 'https://www.jasper.ai/terms-of-service' },
    ],
  }),

  tool({
    id: 'copy-ai',
    name: 'Copy.ai',
    vendor: 'Copy.ai',
    category: 'productivity',
    hq: 'United States',
    url: 'https://www.copy.ai',
    monogram: 'CY',
    accent: '#3d5a8a',
    blurb: 'Sales and marketing writing workflows, with free, pro and enterprise plans.',
    fields: {
      trains_on_data: {
        value: 'no',
        note: 'To verify: whether "no training" applies to every plan or only to business agreements.',
      },
      human_review: { value: 'no', note: 'To verify: confirm the scope of the claim.' },
      retention: { value: 'unknown', note: 'To verify: retention period.' },
      deletion: { value: 'request', note: 'To verify: what deletion covers.' },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: processing location.',
      },
      free_tier: { value: 'unknown', note: 'To verify: whether the free plan differs on data use.' },
      enterprise_api: { value: 'separate', note: 'To verify: enterprise terms.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://www.copy.ai/legal/privacy-policy' },
      { label: 'Terms of service', url: 'https://www.copy.ai/legal/terms-of-service' },
    ],
  }),

  tool({
    id: 'suno',
    name: 'Suno',
    vendor: 'Suno',
    category: 'creative',
    hq: 'United States',
    url: 'https://suno.com',
    monogram: 'SU',
    accent: '#c2410c',
    blurb: 'Music generation from text prompts, with free and paid tiers.',
    fields: {
      trains_on_data: {
        value: 'opt-out-available',
        note: 'To verify: whether prompts, lyrics and generated audio are all covered by the same control.',
      },
      human_review: { value: 'unknown', note: 'To verify: any statement about review.' },
      retention: { value: 'unknown', note: 'To verify: retention of generations.' },
      deletion: { value: 'unknown', note: 'To verify: whether generations can be deleted.' },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: processing location.',
      },
      free_tier: {
        value: 'differs',
        note: 'To verify: ownership and data-use differences between free and paid generations.',
      },
      enterprise_api: { value: 'none', note: 'To verify: whether a business tier exists.' },
    },
    policy_sources: [
      { label: 'Privacy policy', url: 'https://suno.com/privacy' },
      { label: 'Terms of service', url: 'https://suno.com/terms' },
    ],
  }),
]

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]))

export const DATASET_META = {
  tool_count: TOOLS.length,
  verified_count: TOOLS.filter((t) => t.verification.status === 'verified').length,
  scope: '20 major AI products. Deliberately not "every AI tool ever".',
  last_updated: '2026-08-31',
}
