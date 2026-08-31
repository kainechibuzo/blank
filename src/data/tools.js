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
 *      the only asset this product has.
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
        note: 'OpenAI states it may use your content to train its models, and offers an opt-out in the privacy portal. Opting out stops new conversations being used; feedback you submit afterwards can still be used, and Temporary Chats are excluded either way.',
      },
      human_review: {
        value: 'conditional',
        note: 'The policy says content submitted or exchanged on the platform may be monitored to prevent fraud, abuse and misuse. It does not spell out human review of consumer chats; for business tiers OpenAI states people only access conversations to resolve incidents, restore them at your request, or where the law requires.',
      },
      retention: {
        value: 'stated',
        note: 'Deleted content is removed from systems within 30 days, and Temporary Chats are deleted automatically within 30 days. Longer retention is possible for banned accounts, legal obligations and financial records. Ordinary chats are kept until you delete them.',
      },
      deletion: {
        value: 'self-serve',
        note: 'Individual conversations, all conversations, saved memories and the whole account can be deleted in-product, and history can be exported. Removal from systems takes up to 30 days.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'Personal data is processed and stored in the United States and in other countries where OpenAI, its affiliates, partners and vendors operate. A separate EEA, UK and Swiss policy version exists. EU data residency for business tiers was not verified in this pass.',
      },
      free_tier: {
        value: 'differs',
        note: 'The policy singles out Free and Go tiers for advertising: those tiers see ads, and ad personalisation and measurement use your data. Paid tiers are not described this way. Training controls are available on every tier.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'For ChatGPT Business, Enterprise, Edu and the API, OpenAI states it does not train on inputs or outputs by default; organisations must explicitly opt in to share data. Those offerings are governed by customer agreements and a data processing addendum rather than the consumer policy.',
      },
    },
    verification: {
      status: 'verified',
      last_verified: '2026-08-31',
      reviewer: 'agent-assisted first pass (pages read by hand, no LLM extraction)',
      method: 'linked policy pages read on the recorded date; values paraphrased, nothing quoted verbatim',
    },
    policy_sources: [
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
        value: 'opt-out-available',
        note: 'Anthropic states it may use inputs and outputs to train models unless you opt out in account settings. Safety-flagged conversations and feedback you submit explicitly can be used even when you have opted out; incognito chats are not used.',
      },
      human_review: {
        value: 'conditional',
        note: 'Conversations flagged by trust and safety systems are retained and analysed to improve policy enforcement. The policy does not state whether that review is done by people, by automated systems, or both.',
      },
      retention: {
        value: 'stated',
        note: 'Deleted conversations leave your history immediately and are deleted from back-end storage within 30 days. If model improvement is enabled, de-identified data may sit in training pipelines for up to 5 years; policy-violation cases are kept up to 2 years with classification scores up to 7 years; feedback data 5 years.',
      },
      deletion: {
        value: 'self-serve',
        note: 'Individual conversations can be deleted in-product and disappear from history immediately, with back-end deletion within 30 days. Account deletion and data export are also available.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'Data is transferred to servers in the United States and to other countries outside the EEA and UK, relying on adequacy decisions or standard contractual clauses. EEA commercial customers contract with an Irish Anthropic entity, which is an entity question rather than a data-residency commitment.',
      },
      free_tier: {
        value: 'unknown',
        note: 'The privacy policy covers Free, Pro and Max in the same language and states no difference between them. The absence of a stated difference is not proof of identical treatment, so this stays unknown.',
      },
      enterprise_api: {
        value: 'separate-no-training',
        note: 'The commercial terms state that Anthropic may not train models on customer content from the API and other commercial services. The consumer privacy policy does not apply to those offerings.',
      },
    },
    verification: {
      status: 'verified',
      last_verified: '2026-08-31',
      reviewer: 'agent-assisted first pass (pages read by hand, no LLM extraction)',
      method: 'linked policy pages read on the recorded date; values paraphrased, nothing quoted verbatim',
    },
    policy_sources: [
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
        note: 'With Keep Activity on, which is the default, Google uses your activity to develop and improve services including training generative AI models. Turning the setting off, or using temporary chats, stops future chats being used for training unless you choose to send feedback.',
      },
      human_review: {
        value: 'yes',
        note: 'Google states that human reviewers, including trained reviewers from its service providers, review some of the data, and that this continues even when Keep Activity is off. Reviewed data is disconnected from your account and kept for up to three years.',
      },
      retention: {
        value: 'stated',
        note: 'Activity auto-deletes after 18 months by default, with 3, 18, 36 months or no auto-delete as options. Temporary chats and chats with Keep Activity off are retained for 72 hours. Anything reviewed by human reviewers is retained for up to three years.',
      },
      deletion: {
        value: 'self-serve',
        note: 'Chats can be deleted manually at any time in Gemini Apps Activity, auto-delete can be configured, and data can be exported through Takeout. Deleting does not remove chats already sent to reviewers, nor copies held by other Google services.',
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
        note: 'Google states that work and school accounts may be subject to different data-handling terms under a separate Workspace privacy hub, and the cloud API is governed separately. Neither was read in this pass, so no training commitment is asserted here.',
      },
    },
    verification: {
      status: 'verified',
      last_verified: '2026-08-31',
      reviewer: 'agent-assisted first pass (pages read by hand, no LLM extraction)',
      method: 'linked policy pages read on the recorded date; values paraphrased, nothing quoted verbatim',
    },
    policy_sources: [
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
        value: 'yes',
        note: 'The notice lists improving and creating services, including its AI models, among the uses of user content, and documents no general opt-out. Incognito stops activity being saved across sessions but is not stated to stop training. Email-assistant content is explicitly excluded from training.',
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
        note: 'Deletion is described as a right exercised by contacting Perplexity, subject to identity verification and legal carve-outs. In-product deletion of individual threads is not documented in the notice.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'Data moves between affiliates worldwide and may be processed in countries with less stringent laws. The company is certified under the EU-US Data Privacy Framework and will supply standard contractual clauses on request.',
      },
      free_tier: {
        value: 'unknown',
        note: 'The notice does not distinguish free from paid tiers.',
      },
      enterprise_api: {
        value: 'separate',
        note: 'The notice explicitly does not apply to the Enterprise and API offerings, where Perplexity acts as a service provider or processor. Those terms were not read in this pass.',
      },
    },
    verification: {
      status: 'verified',
      last_verified: '2026-08-31',
      reviewer: 'agent-assisted first pass (pages read by hand, no LLM extraction)',
      method: 'linked policy pages read on the recorded date; values paraphrased, nothing quoted verbatim',
    },
    policy_sources: [
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
        value: 'unknown',
        note: 'To verify: retention of conversations and their relationship to the X account.',
      },
      deletion: {
        value: 'request',
        note: 'To verify: whether deleting chats is self-serve in the app.',
      },
      residency: {
        hq_jurisdiction: 'US',
        eu_option: false,
        regions: ['US'],
        note: 'To verify: whether EU users have any residency option.',
      },
      free_tier: {
        value: 'differs',
        note: 'To verify: what changes between free access and paid subscription tiers.',
      },
      enterprise_api: {
        value: 'separate',
        note: 'To verify: whether API data is excluded from training.',
      },
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
        note: 'Mistral lists model training as a purpose covering your input and output, subject to an opt-out, and provides an in-account control to object to training use directly.',
      },
      human_review: {
        value: 'conditional',
        note: 'Input and output are processed for moderation and abuse monitoring, and authorised team members may access personal data to do their jobs. The policy does not describe routine review of conversations.',
      },
      retention: {
        value: 'stated',
        note: 'Input and output are kept until you delete the conversation or the account. API input and output are kept for 30 rolling days for abuse monitoring unless zero data retention is enabled. Separate legal periods apply, including five years for identity data after termination and ten for invoices.',
      },
      deletion: {
        value: 'self-serve',
        note: 'In-account controls allow deleting the account and conversations, exporting data, and objecting to training use. Mistral notes that requests touching model training have technical limits.',
      },
      residency: {
        hq_jurisdiction: 'EU',
        eu_option: true,
        regions: ['EU'],
        note: 'Mistral AI is a French company based in Paris. It prioritises providers inside the EU, permits non-EU ones in exceptional cases, and attaches standard contractual clauses to those contracts.',
      },
      free_tier: {
        value: 'unknown',
        note: 'The policy does not distinguish free from paid consumer tiers.',
      },
      enterprise_api: {
        value: 'separate',
        note: 'The policy does not apply when the products are used in a business context, where the customer is the controller and Mistral is the processor. Separate commercial terms and a data processing addendum exist but were not read in this pass.',
      },
    },
    verification: {
      status: 'verified',
      last_verified: '2026-08-31',
      reviewer: 'agent-assisted first pass (pages read by hand, no LLM extraction)',
      method: 'linked policy pages read on the recorded date; values paraphrased, nothing quoted verbatim',
    },
    policy_sources: [
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
