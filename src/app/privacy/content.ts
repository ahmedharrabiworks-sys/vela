import type { LegalSection } from "@/components/legal/LegalDoc";

export const PRIVACY_INTRO =
  "This Privacy Policy explains how Vela (\"we\", \"us\", or \"our\") collects, uses, discloses, and protects information in connection with our website, dashboard, AI chat agents, AI voice phone agents, website builder, and related features (together, the \"Service\"). It applies to businesses that create a Vela account (\"Customer\", \"you\") and, where relevant, to the End Customers who interact with a Vela powered chat, voice, or messaging agent on a Customer's behalf. Please also read our Terms of Service, which governs your use of the Service generally.";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "scope-and-definitions",
    title: "1. Scope and Definitions",
    blocks: [
      { type: "p", text: "This Privacy Policy applies to personal information processed through the Service. It does not apply to third party websites, applications, or services that are not operated by us, even if accessed through the Service, or to information processed by a Customer outside the Service, such as in their own separate systems." },
      { type: "p", text: "Terms defined in our Terms of Service, such as \"Customer\", \"Account\", \"AI Agent\", \"End Customer\", \"User Content\", and \"Customer Data\", have the same meaning in this Privacy Policy. \"Personal information\" or \"personal data\" means information relating to an identified or identifiable individual, as defined more specifically under applicable data protection law." },
    ],
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    blocks: [
      { type: "p", text: "We collect the categories of information described in this Section 2, either directly from you, automatically through your use of the Service, or from your End Customers as part of delivering the Service to you." },
      {
        type: "sub",
        title: "2.1 Account and Business Information",
        blocks: [
          { type: "p", text: "When you create a Vela account, we collect information such as your name, email address, password or authentication credentials (including, where you sign in with Google, information provided by that sign in method), business name, industry, city, and phone number." },
        ],
      },
      {
        type: "sub",
        title: "2.2 User Content and Knowledge Base Data",
        blocks: [
          { type: "p", text: "We collect the business information you provide to configure and train your AI Agents, including your knowledge base content, services and pricing information, business hours, booking policies, uploaded documents and images, and any other content you submit to personalize your AI Agents." },
        ],
      },
      {
        type: "sub",
        title: "2.3 Conversation and Messaging Data",
        blocks: [
          { type: "p", text: "We process the content of conversations between your AI Agent and your End Customers across connected channels, including website chat, the embeddable chat widget, Instagram, and WhatsApp, in order to generate responses, maintain conversation history, and populate your leads, appointments, and customer relationship management records." },
        ],
      },
      {
        type: "sub",
        title: "2.4 Voice and Call Data",
        blocks: [
          { type: "p", text: "If you use the AI voice phone agent, we process call audio in real time in order to deliver the call, and we generate and store call transcripts, call summaries, and call metadata such as timestamps, call duration, and, where applicable, phone numbers, in order to provide the voice agent feature, populate your leads and appointments, and calculate voice minute usage against your Plan allowance. Call audio is processed through the voice infrastructure providers described in Section 8; our own systems are designed around storing transcripts and summaries rather than a persistent audio recording archive, though the underlying voice or telecommunications provider may retain audio for a limited period as part of delivering their service, subject to their own terms." },
        ],
      },
      {
        type: "sub",
        title: "2.5 Leads, Appointments, and CRM Data",
        blocks: [
          { type: "p", text: "Where an End Customer provides their name, phone number, email address, or other contact or scheduling information through a conversation, a booking flow, or a website form, we store this information as part of your leads, appointments, and conversation records so that you can manage your customer relationships within the Service." },
        ],
      },
      {
        type: "sub",
        title: "2.6 Website and Usage Data",
        blocks: [
          { type: "p", text: "We automatically collect certain information when you or your website visitors use the Service, including browser type, device information, IP address, pages visited, features used, referring URLs, and timestamps of activity, using standard web server logging and our own first party product analytics. We also track visit counts and chat widget interactions for websites built with the Service so that you can see traffic and engagement in your dashboard." },
        ],
      },
      {
        type: "sub",
        title: "2.7 Device and Technical Information",
        blocks: [
          { type: "p", text: "We collect technical information about the device and browser used to access the Service, such as operating system, screen size, and browser identifiers, to operate, secure, and improve the Service." },
        ],
      },
      {
        type: "sub",
        title: "2.8 Cookies and Similar Technologies",
        blocks: [
          { type: "p", text: "We use cookies, local storage, and similar technologies to keep you signed in, remember your preferences such as light or dark mode, and understand how the Service is used. See Section 15, Cookies, for more detail." },
        ],
      },
      {
        type: "sub",
        title: "2.9 Payment Information",
        blocks: [
          { type: "p", text: "If you subscribe to a paid Plan, payment card and billing details are collected and processed directly by our payment processor. We do not store full payment card numbers on our own systems, and we retain only limited billing metadata, such as the plan purchased and payment status, necessary to administer your subscription." },
        ],
      },
      {
        type: "sub",
        title: "2.10 Information From Integrations",
        blocks: [
          { type: "p", text: "Where you connect a Connected Channel such as Instagram or WhatsApp, we receive information from that platform necessary to operate the connection, such as account identifiers, page or business account identifiers, and access tokens, as well as the messages your End Customers send through that channel. This information is subject to the applicable platform's own terms in addition to this Privacy Policy." },
        ],
      },
      {
        type: "sub",
        title: "2.11 Information From Third Parties",
        blocks: [
          { type: "p", text: "We may receive limited information from Third Party Services that support the Service, such as delivery and error information from our email provider, or account status information from our payment processor, as necessary to operate the Service." },
        ],
      },
      {
        type: "sub",
        title: "2.12 Sensitive Categories of Information",
        blocks: [
          { type: "p", text: "The Service is designed for general business communications, scheduling, and customer relationship management. We do not intentionally design the Service to collect special categories of personal data, such as health information, government identification numbers, or financial account details, and we ask Customers not to configure their AI Agents to intentionally solicit such information. However, because conversations and calls are free form and End Customers may voluntarily disclose any information they choose, sensitive information may occasionally appear within conversation content, call transcripts, or knowledge base data submitted by a Customer, for example where a Customer operates a clinic and an End Customer describes a medical concern when booking an appointment. In such cases, that information is processed as part of the relevant conversation, call, or appointment record in the same manner as other Customer Data, and Customers are responsible for handling any such information appropriately for their industry, including under any applicable sector specific law." },
        ],
      },
      {
        type: "sub",
        title: "2.13 Aggregated and De-identified Data",
        blocks: [
          { type: "p", text: "We may create aggregated or de-identified data from the information described in this Section 2, for example to understand overall product usage trends across the Service. Aggregated or de-identified data does not identify you or any End Customer, and we may use it for purposes such as improving the Service, without further restriction under this Privacy Policy, for as long as it remains de-identified." },
        ],
      },
      {
        type: "sub",
        title: "2.14 Categories of Data at a Glance",
        blocks: [
          { type: "p", text: "Because the Service sits between a Customer's business and that Customer's End Customers, it is useful to distinguish between the different categories of data referenced throughout this Privacy Policy. The table below summarizes who each category primarily relates to and where it is described in more detail." },
          {
            type: "table",
            headers: ["Category", "Primarily relates to", "Described in"],
            rows: [
              ["Account data", "The Customer (business owner or Authorized User)", "Section 2.1"],
              ["Business and knowledge base data", "The Customer's business", "Section 2.2"],
              ["Conversation and messaging data", "The Customer's End Customers", "Section 2.3"],
              ["Voice and call data", "The Customer's End Customers", "Section 2.4"],
              ["Leads and appointment data", "The Customer's End Customers", "Section 2.5"],
              ["Website and product usage data", "The Customer and, for published websites, their visitors", "Sections 2.6 and 2.7"],
              ["Billing data", "The Customer", "Section 2.9"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "how-we-use-information",
    title: "3. How We Use Personal Information",
    blocks: [
      { type: "p", text: "We use the information described in Section 2 to:" },
      {
        type: "ul",
        items: [
          "Provide, operate, and maintain the Service, including your AI chat and voice agents, website builder, and CRM;",
          "Train, configure, and personalize your AI Agents based on your business data and knowledge base;",
          "Process and respond to conversations and calls on your behalf through your configured AI Agents;",
          "Calculate usage against your Plan allowances and process billing;",
          "Send you service notifications, account communications, and, where permitted, product updates;",
          "Monitor, analyze, and improve the performance, reliability, and security of the Service, using our own first party analytics;",
          "Detect, investigate, and prevent fraud, abuse, and security incidents;",
          "Comply with our legal obligations and enforce our Terms of Service.",
        ],
      },
      { type: "p", text: "We do not sell personal information, and we do not use third party advertising or marketing trackers on the Service." },
      { type: "p", text: "We aim to collect and process only the information reasonably necessary for the purposes described above. Where a feature of the Service is optional, such as connecting a particular Connected Channel or uploading a document to your knowledge base, the associated data is only collected if and when you choose to use that feature." },
    ],
  },
  {
    id: "ai-processing",
    title: "4. AI Processing",
    blocks: [
      { type: "p", text: "This Section explains, at a general level, how personal information is processed through the AI functionality of the Service." },
      {
        type: "sub",
        title: "4.1 AI Chat Generation",
        blocks: [
          { type: "p", text: "When an End Customer messages your AI Agent, the message content, relevant conversation history, and your business knowledge base are sent to a third party AI language model provider in order to generate a response. The generated response is returned to the Service and sent to the End Customer, and the exchange is stored as part of your conversation history." },
        ],
      },
      {
        type: "sub",
        title: "4.2 AI Voice Processing",
        blocks: [
          { type: "p", text: "When an End Customer calls your AI voice phone agent, call audio is processed through voice infrastructure and speech to text and text to speech providers in order to conduct the call in real time, and a transcript and summary are generated and stored as described in Section 2.4." },
        ],
      },
      {
        type: "sub",
        title: "4.3 AI Training and Configuration",
        blocks: [
          { type: "p", text: "Where you use AI assisted interview or import tools to build your knowledge base, such as a voice or chat based training interview or importing information from your existing website, the information you provide is processed by a third party AI model provider to extract, normalize, and structure it into your knowledge base." },
        ],
      },
      {
        type: "sub",
        title: "4.4 Use of Data by AI Model Providers",
        blocks: [
          { type: "note", text: "We do not independently operate the underlying AI language models, speech to text, or text to speech systems used by the Service. Whether a given AI model provider uses data submitted through their application programming interface to train or improve their own models is governed by that provider's own terms and policies, which may change over time. We do not represent that any particular provider does or does not use data for model training, and we encourage you to review the applicable provider's documentation referenced in Section 8 if this is important to you. Where a provider offers contractual commitments regarding training use of API data, we aim to rely on the applicable business or API terms offered by that provider rather than consumer facing product terms." },
        ],
      },
      {
        type: "sub",
        title: "4.5 Automated Decision Making",
        blocks: [
          { type: "p", text: "AI Agents generate conversational responses and can identify information such as a caller's name, requested service, or a proposed booking time from a conversation, and can create or update a lead or appointment record accordingly. This automated processing supports your business operations. It does not, to our knowledge, produce legal or similarly significant effects concerning End Customers of a kind that would trigger a right to human review of an automated decision under applicable law, since it assists with scheduling and customer communication rather than making decisions such as credit, employment, or eligibility determinations. If you use the Service in a way that involves automated decisions with legal or similarly significant effects on individuals, you are responsible for ensuring appropriate safeguards and disclosures are in place, and you should contact us to discuss your specific use case." },
        ],
      },
      {
        type: "sub",
        title: "4.6 Conversation Context and Memory",
        blocks: [
          { type: "p", text: "To generate a relevant response, an AI Agent is typically provided with recent conversation history for the same End Customer, in addition to the current message, so that it can maintain context within a conversation. This context is drawn from the conversation records described in Section 2.3 and is scoped to the relevant Customer's Account; it is not shared across different Customers' AI Agents." },
        ],
      },
      {
        type: "sub",
        title: "4.7 Human Access to AI Processed Data",
        blocks: [
          { type: "p", text: "Conversation content, call transcripts, and knowledge base data processed by AI Agents are visible to the relevant Customer within their dashboard, since this is necessary for the Customer to review and manage their own business communications. Vela personnel may access this data where necessary to provide customer support, investigate a reported issue, or maintain the security and reliability of the Service, subject to the access controls described in Section 11." },
        ],
      },
      {
        type: "sub",
        title: "4.8 Limitations",
        blocks: [
          { type: "p", text: "As described in our Terms of Service, AI generated output can be inaccurate or incomplete. Where personal information is extracted from a conversation or call by an AI Agent, such as a name, phone number, or requested appointment time, that extraction may occasionally be incorrect, and Customers should periodically review records created through the Service." },
        ],
      },
    ],
  },
  {
    id: "legal-basis",
    title: "5. Legal Basis for Processing",
    blocks: [
      { type: "p", text: "Where applicable data protection law, such as the General Data Protection Regulation, requires a legal basis for processing personal data, we rely on one or more of the following, depending on the specific processing activity: performance of a contract with you, such as providing the Service you have subscribed to; our legitimate interests, such as securing, maintaining, and improving the Service, provided those interests are not overridden by your rights and interests; compliance with a legal obligation; and, where applicable, consent, such as for certain optional cookies or marketing communications, which you may withdraw at any time as described in Section 16." },
      { type: "p", text: "Where we process personal data on behalf of a Customer in connection with that Customer's use of the Service, the legal basis for that processing is generally established between the Customer and their End Customers, and the Customer is responsible for ensuring an appropriate legal basis exists, as described in Section 9." },
    ],
  },
  {
    id: "how-we-share-information",
    title: "6. How We Share Information",
    blocks: [
      { type: "p", text: "We share information with the following categories of recipients:" },
      {
        type: "ul",
        items: [
          "Subprocessors and service providers who support the Service, as described in Section 8, under contractual confidentiality and data protection obligations;",
          "Connected Channel providers such as Meta, to the extent necessary to send and receive messages through Instagram or WhatsApp that you have connected;",
          "Professional advisors, such as legal or accounting advisors, where necessary for a legitimate business purpose;",
          "Any party in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate confidentiality protections and, where required by law, notice to affected individuals;",
          "Law enforcement, regulators, or other third parties where required by law, legal process, or to protect the rights, property, or safety of Vela, our customers, End Customers, or others.",
        ],
      },
      { type: "p", text: "We do not permit our subprocessors to use the personal information they process on our behalf for their own independent marketing purposes." },
    ],
  },
  {
    id: "controller-processor-roles",
    title: "7. Customer Responsibilities and Controller / Processor Roles",
    blocks: [
      { type: "p", text: "Depending on applicable law and the specific processing activity, the Customer may act as a controller or business, and Vela may act as a processor or service provider, with respect to personal data relating to the Customer's End Customers that is processed through the Service. Where this is the case, the Customer determines the purposes for which End Customer personal data is collected through their AI Agents and connected channels, and Vela processes that data to provide the Service as instructed by the Customer through their configuration and use of the Service." },
      { type: "p", text: "This is a general description intended to help Customers understand the typical relationship, and it may not reflect the correct legal classification in every jurisdiction or for every processing activity. Customers who require a specific contractual data processing arrangement, such as a data processing addendum, should contact us at the address in Section 23." },
      { type: "p", text: "As a Customer, you are responsible for providing your End Customers with any privacy notices required by applicable law regarding your use of Vela and your AI Agents to process their personal information, and for ensuring you have an appropriate legal basis to collect and process that information." },
    ],
  },
  {
    id: "subprocessors",
    title: "8. Subprocessors and Service Providers",
    blocks: [
      { type: "p", text: "We use the following categories of third party subprocessors and service providers to deliver the Service. This list reflects providers integrated into the Service and may be updated as the Service evolves; where a provider is described as not yet fully active, it means the integration exists in our systems but full production use is pending configuration on our side." },
      {
        type: "table",
        headers: ["Provider", "Purpose", "Data potentially processed"],
        rows: [
          ["OpenAI", "Generates AI chat responses, marketing content, website copy, and knowledge base extraction using large language models.", "Conversation content, business knowledge base data, prompts and configuration."],
          ["Vapi", "Provides voice call routing and orchestration for the AI voice phone agent.", "Call audio in transit, call metadata."],
          ["ElevenLabs", "Provides text to speech voice synthesis and speech to text transcription for voice calls.", "Call audio, generated call transcripts."],
          ["Meta (Instagram and WhatsApp)", "Provides the messaging infrastructure used to send and receive messages when you connect Instagram or WhatsApp.", "Message content, platform account identifiers, access tokens."],
          ["Supabase", "Provides our primary database and authentication infrastructure, hosted in the West Europe region.", "Account data, business data, conversation and call records, authentication credentials."],
          ["Vercel", "Hosts and serves the Vela application, dashboard, and websites built with the website builder.", "Application traffic and request data, including data in transit to and from the Service."],
          ["Unsplash", "Provides stock photography used by the website builder to generate images for Customer websites.", "Image search queries derived from business information; does not receive End Customer personal data."],
          ["Resend", "Provides transactional email delivery, such as website contact form notifications, where configured.", "Recipient email address and message content of the relevant notification."],
          ["Payment processor", "Processes Subscription payments where billing is active on your account.", "Payment card and billing details, handled directly by the processor."],
        ],
      },
      { type: "p", text: "We may also engage additional service providers to support functions such as customer support, security monitoring, and infrastructure operations, each bound by contractual confidentiality and data protection obligations. Where the exact geographic processing location of a given provider is not stated above, this is because it depends on that provider's own infrastructure configuration, which may include multiple regions." },
      {
        type: "sub",
        title: "8.1 Why Each Subprocessor Is Necessary",
        blocks: [
          { type: "p", text: "Each subprocessor listed above supports a specific, necessary part of the Service. OpenAI, Vapi, and ElevenLabs together provide the artificial intelligence and voice technology that make the AI chat and voice agents possible; without them, the Service could not generate conversational responses or handle phone calls. Meta provides the only supported means of sending and receiving messages through Instagram and WhatsApp, since these are proprietary platforms that require use of their own infrastructure. Supabase and Vercel provide the database, authentication, and hosting infrastructure on which the entire Service runs. Unsplash and Resend support specific optional features, the website builder's stock imagery and transactional email notifications respectively, and are only invoked when those features are used." },
        ],
      },
      {
        type: "sub",
        title: "8.2 Changes to Subprocessors",
        blocks: [
          { type: "p", text: "We may add or replace subprocessors over time as the Service evolves. Where we add a new subprocessor that will process personal data in a materially different way than described in this Privacy Policy, we will update this page and, where required by a specific contractual commitment to a Customer, provide additional notice." },
        ],
      },
    ],
  },
  {
    id: "international-transfers",
    title: "9. International Data Transfers",
    blocks: [
      { type: "p", text: "Vela is used by businesses worldwide, and our subprocessors may process and store data in countries other than your own, including the United States and countries within the European Union, depending on the provider. Where we or our subprocessors transfer personal data across borders from a jurisdiction that restricts such transfers, such as the European Economic Area, the United Kingdom, or Switzerland, we aim to rely on an appropriate transfer mechanism recognized under applicable data protection law, such as Standard Contractual Clauses, to the extent applicable to the relevant transfer." },
      { type: "p", text: "We have not exhaustively mapped every subprocessor's specific data center locations in this Privacy Policy, since this can change based on the provider's own infrastructure. Customers who require detailed transfer information for a specific compliance purpose should contact us at the address in Section 23." },
    ],
  },
  {
    id: "data-retention",
    title: "10. Data Retention",
    blocks: [
      { type: "p", text: "We retain personal information for as long as your Account is active and as needed to provide the Service. Following account closure or a verified deletion request, we work to delete or anonymize the relevant data within a reasonable period, except where we are required to retain it for legal, tax, accounting, dispute resolution, fraud prevention, or legitimate business record keeping purposes, in which case we retain only what is necessary for those purposes and for as long as required." },
      { type: "p", text: "We do not currently publish a single fixed retention period applicable to every category of data, since the appropriate period depends on factors such as the type of data, the purpose for which it was collected, applicable legal record keeping requirements, and whether the data is needed to resolve an open dispute or security matter. As a general matter:" },
      {
        type: "ul",
        items: [
          "Account and business information is retained for as long as the Account is active, and for a limited period after closure to allow for reactivation, dispute resolution, and legal compliance;",
          "Conversation history, call transcripts, and call summaries are retained for the period necessary to provide the relevant feature, such as ongoing conversation context and your ability to review historical records within the dashboard, after which they may be deleted or archived in accordance with our data retention practices;",
          "Billing records are retained for the period required by applicable tax and accounting law;",
          "Security and access logs are retained for a limited period sufficient to support security monitoring and incident investigation.",
        ],
      },
      { type: "p", text: "Where you have a specific retention requirement, such as a shorter deletion timeline for regulatory reasons, please contact us at the address in Section 23." },
      {
        type: "sub",
        title: "10.1 Factors That Determine Retention Period",
        blocks: [
          { type: "p", text: "Where a fixed retention period is not specified above, the actual period for which a given record is kept depends on a combination of the following factors, applied to the specific category of data in question:" },
          {
            type: "ul",
            items: [
              "Whether the data is still needed to provide an active feature of the Service to you, such as ongoing conversation context for ongoing customer relationships;",
              "Any applicable statutory record keeping period, such as tax or accounting retention requirements in the jurisdictions where you or we operate;",
              "Whether the data is subject to an open dispute, support ticket, security investigation, or legal hold, in which case it is retained until that matter is resolved;",
              "Your own instructions, where you request earlier deletion of specific data under Section 12 or Section 17;",
              "Technical constraints of the underlying infrastructure, such as backup cycles, which may mean a short additional period elapses between a deletion request being actioned and the data being removed from all backup copies.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "data-security",
    title: "11. Data Security",
    blocks: [
      { type: "p", text: "We use administrative, technical, and organizational measures designed to protect personal information processed through the Service, including:" },
      {
        type: "ul",
        items: [
          "Encryption of data in transit between your browser or device and our servers;",
          "Row level security policies on our database that scope each Customer's access, and the access of our own application, to that Customer's own data, so that one Customer's data is not visible to another;",
          "Authentication safeguards for Account access, including support for third party sign in through Google in addition to email and password;",
          "Access controls that limit internal access to production data to personnel who require it to operate, secure, or support the Service;",
          "Fail closed verification on inbound webhooks from Connected Channel and voice providers, so that unverified or unauthenticated requests are rejected rather than processed;",
          "Ongoing monitoring for security vulnerabilities and dependency risks in the software that powers the Service.",
        ],
      },
      { type: "p", text: "You are responsible for the security of your own Account credentials, any API keys or integration tokens you generate, and the devices you use to access the Service, as described in our Terms of Service. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of a security incident affecting your personal data that requires notification under applicable law, we will notify you and any applicable regulator as required by that law, as further described in Section 18." },
    ],
  },
  {
    id: "your-privacy-rights",
    title: "12. Data Subject Rights",
    blocks: [
      { type: "p", text: "Depending on your location, you may have some or all of the following rights regarding your personal data. Where these rights apply, you may exercise them by contacting us using the details in Section 23 or, where available, through your account settings." },
      {
        type: "ul",
        items: [
          "Access, the right to request a copy of the personal data we hold about you;",
          "Correction, the right to request that we correct inaccurate or incomplete data;",
          "Deletion, the right to request deletion of your personal data, subject to certain legal exceptions described in Section 10;",
          "Export or portability, the right to receive your data in a portable, commonly used format;",
          "Objection, the right to object to certain processing of your data based on our legitimate interests;",
          "Restriction, the right to request that we limit how we use your data in certain circumstances;",
          "Withdrawal of consent, where processing is based on consent, the right to withdraw that consent at any time, without affecting the lawfulness of processing before withdrawal.",
        ],
      },
      { type: "p", text: "We will respond to verified requests within the timeframe required by applicable law. We may need to verify your identity before fulfilling certain requests, and we will not discriminate against you for exercising any of these rights." },
      { type: "p", text: "Where you are an End Customer of a Vela Customer rather than a Vela account holder yourself, we recommend directing your request to the relevant business in the first instance, since they generally control the purposes for which your information is collected through their AI Agent, as described in Section 7. You may also contact us directly and we will coordinate with the relevant Customer as appropriate." },
    ],
  },
  {
    id: "gdpr-eea-uk-switzerland",
    title: "13. GDPR, EEA, UK, and Switzerland",
    blocks: [
      { type: "p", text: "If you are located in the European Economic Area, the United Kingdom, or Switzerland, the rights described in Section 12 are provided in accordance with the General Data Protection Regulation and equivalent UK and Swiss data protection law. You also have the right to lodge a complaint with your local data protection supervisory authority. We do not represent that Vela holds any specific certification of compliance with these frameworks; our aim is to process personal data in a manner consistent with their requirements to the extent applicable to our processing activities." },
    ],
  },
  {
    id: "california-and-us-state-privacy",
    title: "14. California and Other U.S. State Privacy Rights",
    blocks: [
      { type: "p", text: "If you are a California resident, you may have rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act, including the right to know what personal information we collect, use, and disclose, the right to request deletion, the right to correct inaccurate information, and the right to opt out of the sale or sharing of personal information and of certain targeted advertising. As noted in Section 3, we do not sell personal information and do not use third party advertising trackers." },
      { type: "p", text: "If you are a resident of another U.S. state with a comprehensive privacy law, such as Virginia, Colorado, Connecticut, Utah, or others that may come into effect, you may have similar rights of access, correction, deletion, and portability, and a right to opt out of certain processing such as targeted advertising, which, as noted above, we do not conduct. You may exercise applicable rights by contacting us at the address in Section 23." },
      {
        type: "sub",
        title: "14.1 Categories of Personal Information Collected and Disclosed",
        blocks: [
          { type: "p", text: "In the twelve months preceding the effective date of this Privacy Policy, we have collected, and may disclose to service providers for a business purpose as described in Section 6, the following categories of personal information, using the categories defined under the California Consumer Privacy Act:" },
          {
            type: "table",
            headers: ["Category", "Examples", "Disclosed to service providers"],
            rows: [
              ["Identifiers", "Name, email address, phone number, IP address, account identifiers", "Yes"],
              ["Customer records information", "Billing name and contact details", "Yes"],
              ["Commercial information", "Plan subscribed to, usage history", "Yes"],
              ["Internet or network activity", "Pages visited, feature usage, device and browser information", "Yes"],
              ["Audio and electronic information", "Call audio processed in real time, call transcripts and summaries", "Yes"],
              ["Geolocation data", "Approximate location derived from IP address or business city, where applicable", "Yes"],
              ["Professional or business information", "Business name, industry, and services, where you are a Customer", "Yes"],
            ],
          },
          { type: "p", text: "We disclose these categories to the service providers described in Section 8 for the business purposes described in Sections 3 and 6. We do not sell or share personal information as those terms are defined under the California Consumer Privacy Act." },
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "15. Cookies and Similar Technologies",
    blocks: [
      { type: "p", text: "We use the following categories of cookies and similar technologies, such as browser local storage:" },
      {
        type: "ul",
        items: [
          "Essential or strictly necessary technologies, required for core functionality such as keeping you signed in and maintaining session security through our authentication provider;",
          "Preference technologies, which remember settings such as your light or dark mode selection and language preference, some of which are stored using browser local storage rather than a cookie;",
          "First party analytics technologies, which help us understand how the Service is used, based on our own internal usage tracking rather than a third party advertising or analytics network.",
        ],
      },
      { type: "p", text: "We do not currently use third party advertising or marketing cookies on the Service. Most browsers allow you to control cookies through their settings, including blocking or deleting them. Disabling essential cookies will affect your ability to sign in and use core features of the Service. Where applicable law requires consent for certain non essential cookies before they are set, we aim to provide an appropriate mechanism for obtaining that consent; if you believe such a mechanism is required for a specific jurisdiction and does not currently appear on the Service, please contact us." },
    ],
  },
  {
    id: "marketing-and-account-communications",
    title: "16. Marketing and Account Communications",
    blocks: [
      { type: "p", text: "We may send you account related communications, such as service notifications, security alerts, and billing notices, which are necessary to the Service and cannot be opted out of while you maintain an Account. We may also send product updates or other marketing communications, which you can opt out of using the unsubscribe mechanism in the relevant message or by contacting us at the address in Section 23." },
    ],
  },
  {
    id: "your-choices-and-controls",
    title: "17. Your Choices and Controls",
    blocks: [
      { type: "p", text: "In addition to the rights described in Section 12, the Service itself provides a number of practical, self service controls over your data and how your AI Agents operate:" },
      {
        type: "ul",
        items: [
          "You can disconnect Instagram or WhatsApp from your Account at any time from the Channels page, which stops new messages from that channel from being processed;",
          "Where you build a website with the Service, you can choose whether an AI chat widget is added to it during the build process, and you can turn the AI Agent on or off for a published website at any time from the Channels page;",
          "You can review, edit, or remove your knowledge base content, including business information, services, and frequently asked questions, from the Train Your AI section of your dashboard at any time, and changes take effect for future conversations;",
          "You can export appointment records as a CSV file from the Appointments page;",
          "You can review conversation history, call transcripts, and call summaries from the Conversations and Calls sections of your dashboard;",
          "You can request export or deletion of other categories of User Content or Customer Data, and closure of your Account, by contacting us as described in Section 23.",
        ],
      },
      { type: "p", text: "These controls apply at the Account level. Where an End Customer wants a specific message, call record, or lead entry corrected or removed, the Customer who operates the relevant AI Agent is generally best placed to action that request directly within their dashboard, since they control the underlying record." },
    ],
  },
  {
    id: "data-breach-notification",
    title: "18. Security Incidents and Breach Notification",
    blocks: [
      { type: "p", text: "If we become aware of a security incident involving unauthorized access to or disclosure of personal data that requires notification under applicable law, we will notify affected Customers and, where required, individuals and regulators, without undue delay and in accordance with the timeframes required by applicable law. Notifications will include information reasonably available to us about the nature of the incident and recommended steps, to the extent known at the time of notification." },
    ],
  },
  {
    id: "third-party-websites",
    title: "19. Third Party Websites and Services",
    blocks: [
      { type: "p", text: "The Service may contain links to, or integrations with, third party websites or services that are not operated by us, including the Connected Channels described in Section 8. This Privacy Policy does not apply to those third party websites or services, and we encourage you to review their own privacy policies." },
    ],
  },
  {
    id: "childrens-privacy",
    title: "20. Children's Privacy",
    blocks: [
      { type: "p", text: "The Service is intended for business use, and, consistent with our Terms of Service, an Account may only be created by an individual who is at least 18 years old. We do not knowingly collect personal data from individuals under the age of 16 in connection with Account registration, and we do not intentionally direct the Service at children." },
      { type: "p", text: "Where an End Customer interacts with a Customer's AI Agent, for example by messaging a business's website chat widget, we do not knowingly and intentionally collect personal data from a child through that interaction in a manner inconsistent with applicable law, and Customers are responsible for ensuring their own use of AI Agents to interact with the public complies with applicable child privacy laws relevant to their business and audience. If we become aware that we have collected personal data from a child in a manner inconsistent with applicable law, we will take steps to delete that information." },
    ],
  },
  {
    id: "automated-signals",
    title: "21. Do Not Track and Browser Signals",
    blocks: [
      { type: "p", text: "Some browsers offer a \"Do Not Track\" signal or similar privacy preference signal. Because there is not yet a common industry standard for how to interpret these signals, the Service does not currently respond to them differently than described elsewhere in this Privacy Policy. As noted in Section 15, we do not use third party advertising trackers regardless of this setting." },
    ],
  },
  {
    id: "changes-to-privacy-policy",
    title: "22. Changes to This Privacy Policy",
    blocks: [
      { type: "p", text: "We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or applicable law. When we make material changes, we will update the \"Last updated\" date at the top of this page and, where appropriate, provide additional notice, such as an email or an in product notification. We encourage you to review this Privacy Policy periodically." },
    ],
  },
  {
    id: "contact",
    title: "23. Contact Information",
    blocks: [
      { type: "p", text: "For privacy related questions, to exercise any of the rights described in this Privacy Policy, or to request a data processing addendum, contact us at privacy@tryvela.com." },
      { type: "note", text: "Operating entity, registered address, and jurisdiction: [LEGAL ENTITY NAME], [REGISTERED ADDRESS], [JURISDICTION OF INCORPORATION]. This information will be completed once Vela's corporate structure is finalized. If your jurisdiction requires you to be told the identity of a specific data protection officer or representative, and one has been appointed, that information will also be provided here." },
    ],
  },
];
