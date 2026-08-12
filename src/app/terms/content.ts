import type { LegalSection } from "@/components/legal/LegalDoc";

export const TERMS_INTRO =
  "These Terms of Service (the \"Terms\") form a binding agreement between you and Vela governing your access to and use of the Vela platform, including our website, dashboard, AI chat agents, AI voice phone agents, website builder, customer relationship management tools, analytics, marketing tools, and all related features (together, the \"Service\"). By creating an account or otherwise using the Service, you agree to these Terms. Please read them carefully, together with our Privacy Policy, before using the Service.";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "definitions",
    title: "1. Definitions",
    blocks: [
      { type: "p", text: "The following terms have the meanings given below wherever they appear in these Terms, whether capitalized or not, unless the context requires otherwise." },
      {
        type: "ul",
        items: [
          "\"Vela\", \"we\", \"us\", or \"our\" means the operator of the Service. See Section 35 for how to contact us, including current information about the operating entity where available.",
          "\"Service\" means the Vela platform in its entirety, including the website, the dashboard, AI Agents, the Website Builder, connected channels, analytics, marketing tools, and any associated mobile or desktop interfaces, application programming interfaces, and documentation.",
          "\"Customer\", \"Business\", \"you\", or \"your\" means the individual or business entity that registers for a Vela account and is bound by these Terms. Where you register on behalf of a business, \"you\" refers to that business.",
          "\"Account\" means the Vela account created by a Customer to access the Service, associated with a single business record within our systems.",
          "\"Authorized User\" means any individual you permit to access your Account, such as an employee, contractor, or team member, subject to Section 4.",
          "\"End Customer\" means an individual who interacts with your business through the Service, for example by messaging your AI Agent, calling your AI voice phone agent, or submitting a form on a website built with Vela.",
          "\"User Content\" means any information, business data, knowledge base material, files, images, prompts, configuration, and other content that you or your Authorized Users submit to, upload to, or generate through the Service, excluding Customer Data described below.",
          "\"Customer Data\" means data relating to your End Customers that is collected, stored, or processed through the Service in connection with your use of it, including conversation content, lead and appointment records, and, where applicable, call recordings, call transcripts, and call summaries.",
          "\"AI Agent\" means any AI powered chat, messaging, or voice agent made available through the Service and configured for your business, including the AI chat assistant and the AI voice phone agent described in Section 6.",
          "\"AI Services\" means the artificial intelligence functionality of the Service generally, including natural language generation, speech to text transcription, text to speech synthesis, and related automated processing.",
          "\"Connected Channel\" means any external messaging or communications channel you connect to the Service, such as Instagram, WhatsApp, a telephone number, or a website chat widget.",
          "\"Third Party Services\" means services provided by parties other than Vela that the Service integrates with or relies on to operate, including artificial intelligence model providers, voice infrastructure providers, messaging platforms, and hosting providers, as further described in Section 24 and in our Privacy Policy.",
          "\"Subscription\" or \"Plan\" means the tier of the Service you subscribe to, as described on our Pricing page, together with any usage allowances, features, and pricing applicable to that tier.",
          "\"Documentation\" means any user guides, help center articles, or in-product explanatory content we make available describing the use of the Service.",
          "\"Confidential Information\" has the meaning given in Section 26.",
        ],
      },
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility and Authority",
    blocks: [
      { type: "p", text: "You must be at least 18 years old and have the legal capacity to enter into a binding contract to create a Vela Account. The Service is designed and intended for business use. It is not directed at, and must not be used by, individual consumers acting purely in a personal, family, or household capacity outside of a business, trade, or profession." },
      { type: "p", text: "If you are creating an Account or otherwise agreeing to these Terms on behalf of a business, organization, or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms, in which case \"you\" and \"your\" refer to that entity. If you do not have such authority, or if you do not agree to these Terms, you must not create an Account or use the Service." },
      { type: "p", text: "You represent that your use of the Service will comply with all laws applicable to you, including any laws or regulations governing the industry in which your business operates." },
    ],
  },
  {
    id: "account-registration",
    title: "3. Account Registration and Security",
    blocks: [
      {
        type: "sub",
        title: "3.1 Registration",
        blocks: [
          { type: "p", text: "To use the Service, you must register for an Account by providing accurate, current, and complete information about yourself and your business, either using an email address and password or through a supported third party sign in method such as Google. You must keep your Account information up to date." },
        ],
      },
      {
        type: "sub",
        title: "3.2 Account Security",
        blocks: [
          { type: "p", text: "You are responsible for maintaining the confidentiality of your Account credentials, including your password and any API keys, access tokens, or integration credentials associated with your Account, and for all activity that occurs under your Account, whether or not you personally authorized that activity." },
          { type: "p", text: "You must notify us promptly at the contact address in Section 35 if you become aware of any unauthorized access to or use of your Account, or of any other security breach relating to the Service. We are not liable for any loss or damage arising from your failure to safeguard your Account credentials, but we will take reasonable steps to assist you in securing your Account once notified." },
        ],
      },
      {
        type: "sub",
        title: "3.3 Accuracy of Information",
        blocks: [
          { type: "p", text: "You are responsible for the accuracy of the business information you provide during registration and thereafter, including the information used to configure your AI Agents, since this information directly determines how your AI Agents represent your business to End Customers." },
        ],
      },
    ],
  },
  {
    id: "business-accounts",
    title: "4. Business Accounts and Authorized Users",
    blocks: [
      { type: "p", text: "A Vela Account is associated with a single business record. Depending on your Plan, you may be permitted to allow a limited number of Authorized Users to access your Account, as described on our Pricing page. Where the Service does not yet provide a self service mechanism for inviting or managing Authorized Users, references to Authorized Users in these Terms apply to the extent such functionality is made available to you, and you remain solely responsible for any access you grant to your Account by any means, including by sharing your login credentials." },
      { type: "p", text: "You are responsible for ensuring that each Authorized User complies with these Terms, and you are responsible for any act or omission of an Authorized User as if it were your own act or omission. You must promptly remove access for any Authorized User who should no longer have access to your Account, for example because their employment or engagement with your business has ended." },
    ],
  },
  {
    id: "description-of-service",
    title: "5. Description of the Service",
    blocks: [
      { type: "p", text: "Vela is an artificial intelligence powered business operating system designed to help businesses across a wide range of industries, including but not limited to clinics, gyms, salons, real estate agencies, restaurants, law firms, e commerce businesses, and other professional service businesses, manage customer communications, bookings, leads, and analytics across multiple channels." },
      { type: "p", text: "Depending on your Plan, the Service may include some or all of the following: an AI chat assistant that responds to End Customers on your website and connected messaging channels; an AI voice phone agent that can answer inbound telephone calls and assist with booking appointments; a website builder that generates and hosts a business website; a customer relationship management system covering leads, conversations, and appointments; AI assisted marketing content generation tools; and analytics reporting on your business activity within the Service." },
      { type: "p", text: "Not all features described in the Documentation or on our marketing pages are available on every Plan, and feature availability may change over time. The features, usage allowances, and limits applicable to your Plan are as described on our Pricing page at the time in question." },
      { type: "p", text: "The Service is under continuous development. We may add, change, deprecate, or remove features, and may make other modifications to the Service, as described in Section 22." },
      {
        type: "sub",
        title: "5.1 Support",
        blocks: [
          { type: "p", text: "We provide customer support in connection with the Service through the channels and response expectations associated with your Plan, as described on our Pricing page, which may range from email support to priority or dedicated support depending on your Plan. Support is provided on a commercially reasonable efforts basis and does not constitute a guaranteed service level unless separately agreed with you in writing." },
        ],
      },
      {
        type: "sub",
        title: "5.2 Documentation",
        blocks: [
          { type: "p", text: "We may make Documentation available to help you use the Service. Documentation is provided for convenience and does not modify these Terms. In the event of a conflict between the Documentation and these Terms, these Terms control." },
        ],
      },
    ],
  },
  {
    id: "ai-services",
    title: "6. AI Services and AI Generated Content",
    blocks: [
      { type: "p", text: "This Section 6 contains important disclosures about the nature and limitations of the artificial intelligence functionality within the Service. You should read it carefully before configuring an AI Agent for your business." },
      {
        type: "sub",
        title: "6.1 Nature of AI Output",
        blocks: [
          { type: "p", text: "AI Agents use large language models and related artificial intelligence technology, including technology provided by Third Party Services, to generate conversational responses, draft marketing content, and otherwise produce output automatically based on your business information, your instructions, your knowledge base, and the End Customer's message or call. AI generated output is probabilistic in nature. It can be inaccurate, incomplete, out of date, unexpected, or inappropriate for a given situation, and it can misunderstand context, tone, or intent, including in languages other than English." },
          { type: "p", text: "We design the Service with the aim of producing accurate and appropriate output based on the information you provide, but we do not guarantee, and you should not assume, that any AI generated output is accurate, complete, current, or suitable for your specific purpose." },
        ],
      },
      {
        type: "sub",
        title: "6.2 Your Responsibility for Configuration and Oversight",
        blocks: [
          { type: "p", text: "You are solely responsible for reviewing, configuring, and maintaining the knowledge base, instructions, tone settings, and other configuration that shapes how your AI Agents behave, and for monitoring the communications your AI Agents send to End Customers on your behalf. You are responsible for the accuracy and legality of the information you provide to your AI Agent, including pricing, services, hours, and policies, since your AI Agent will communicate this information to End Customers as configured." },
          { type: "p", text: "Where your business or industry requires a human escalation, handoff, or review process for certain types of inquiries, such as medical, legal, financial, safety related, or emergency matters, you are responsible for configuring your AI Agent and your operational processes accordingly. The Service may provide handoff or notification functionality, but you remain responsible for ensuring that such functionality is configured appropriately for your business and is not, on its own, a substitute for your own operational safeguards." },
        ],
      },
      {
        type: "sub",
        title: "6.3 No Professional Advice",
        blocks: [
          { type: "p", text: "AI generated output provided through the Service is not, and must not be treated as, medical, legal, financial, tax, safety, or other regulated professional advice, whether directed at you or at your End Customers. If your business operates in a regulated industry, you are responsible for ensuring that your use of AI Agents, and the content they generate, complies with the professional, ethical, and regulatory obligations applicable to your business." },
        ],
      },
      {
        type: "sub",
        title: "6.4 Consents and Permissions",
        blocks: [
          { type: "p", text: "You are responsible for obtaining any consents, permissions, or disclosures required by applicable law before your AI Agent communicates with an End Customer, including any requirement to disclose that a customer is interacting with an automated or AI powered system, where such disclosure is required by applicable law in the relevant jurisdiction." },
        ],
      },
      {
        type: "sub",
        title: "6.5 Evolving Models and Providers",
        blocks: [
          { type: "p", text: "The AI models and Third Party Services underlying the AI Services may change over time as providers update, retire, or replace their models, or as we change providers. As a result, the behavior, style, capability, and output of your AI Agents may change over time, including without advance notice from the underlying provider. We will use reasonable efforts to maintain the quality of the Service through any such transition, but we do not guarantee that AI behavior will remain identical over time." },
        ],
      },
    ],
  },
  {
    id: "voice-and-telephone",
    title: "7. Voice Services, Telephone Calls, and Call Recording",
    blocks: [
      { type: "p", text: "This Section applies where your Plan includes the AI voice phone agent or any other voice calling functionality of the Service." },
      {
        type: "sub",
        title: "7.1 How Voice Calls Are Handled",
        blocks: [
          { type: "p", text: "Inbound calls to a telephone number connected to your AI voice phone agent are answered and handled using voice infrastructure and speech technology provided by Third Party Services, as described in Section 24 and in our Privacy Policy. Depending on configuration, calls may be transcribed to text, summarized, and used to update your leads, appointments, and knowledge base. Call transcripts and summaries are retained as part of the Service so that you can review them, subject to the retention practices described in our Privacy Policy." },
        ],
      },
      {
        type: "sub",
        title: "7.2 Call Recording and Notification Laws",
        blocks: [
          { type: "p", text: "Laws governing the recording, monitoring, and transcription of telephone calls vary significantly between jurisdictions. Some jurisdictions require the consent of only one party to a call before it may be recorded, while others require the consent of all parties, and some impose specific notification requirements. Vela does not determine, and does not represent, that any particular configuration of the Service satisfies the call recording, notification, or consent requirements applicable to your business, your location, or the location of your End Customers." },
          { type: "note", text: "You are solely responsible for determining what notices, disclosures, or consents are legally required for your specific use case and jurisdictions, and for configuring your AI voice phone agent, your call handling procedures, and any required notices accordingly. You should seek your own legal advice if you are uncertain about the requirements applicable to your business." },
        ],
      },
      {
        type: "sub",
        title: "7.3 Automated and AI Voice Communications",
        blocks: [
          { type: "p", text: "Laws in many jurisdictions regulate automated telephone calls, robocalls, and the use of synthetic or AI generated voices in telephone communications, including telemarketing and consumer protection laws such as, in the United States, the Telephone Consumer Protection Act and related regulations. You are responsible for ensuring that your use of the AI voice phone agent, including any outbound calling functionality if and when made available, complies with all such laws applicable to your business and your End Customers." },
        ],
      },
      {
        type: "sub",
        title: "7.4 Emergency and Critical Communications",
        blocks: [
          { type: "note", text: "The AI voice phone agent is not designed, and must not be used or relied upon, to handle emergency calls or as a substitute for emergency services, life safety systems, or other critical communications infrastructure. You must maintain independent arrangements for any emergency or safety critical communications needs of your business." },
        ],
      },
      {
        type: "sub",
        title: "7.5 Call Quality and Accuracy",
        blocks: [
          { type: "p", text: "Call quality, transcription accuracy, and voice agent behavior depend in part on factors outside our control, including the telecommunications networks and Third Party Services involved in handling a given call, network conditions, background noise, accents, and speech patterns. We do not guarantee that any call will be handled without error, that any transcript will be perfectly accurate, or that the AI voice phone agent will always correctly understand or respond to a caller." },
        ],
      },
    ],
  },
  {
    id: "third-party-messaging",
    title: "8. Third Party Messaging Channels",
    blocks: [
      { type: "p", text: "The Service allows you to connect Connected Channels operated by third parties, including Instagram and WhatsApp, both of which are operated by Meta Platforms, Inc. or its affiliates (\"Meta\")." },
      {
        type: "sub",
        title: "8.1 Platform Terms Apply",
        blocks: [
          { type: "p", text: "Your use of any third party platform connected through the Service, including Instagram and WhatsApp, is subject to that platform's own terms of service, developer policies, business messaging policies, and any other applicable rules of that platform, in addition to these Terms. Connecting a Connected Channel through Vela does not relieve you of your obligations under that platform's own terms, and does not transfer responsibility for compliance with those terms to Vela." },
        ],
      },
      {
        type: "sub",
        title: "8.2 Messaging Rules and Restrictions",
        blocks: [
          { type: "p", text: "Messaging platforms such as WhatsApp and Instagram impose their own rules regarding, among other things, obtaining opt in consent before messaging a customer, permitted message content, message templates for certain categories of business initiated messages, response time windows, and prohibitions on spam or unsolicited messaging. You are responsible for ensuring that your business, and any communications sent by your AI Agent through a Connected Channel, comply with these platform specific rules." },
        ],
      },
      {
        type: "sub",
        title: "8.3 Platform Availability, Changes, and Enforcement",
        blocks: [
          { type: "p", text: "We do not control, and are not responsible for, the availability, performance, features, application programming interfaces, or policies of any third party platform. A Connected Channel may become unavailable, restricted, or disconnected as a result of an outage, policy change, enforcement action, or other decision made by the relevant platform, including Meta, and such events may affect the availability of related functionality within the Service. We will use reasonable efforts to notify you of known material disruptions affecting a Connected Channel, but we do not guarantee advance notice of third party platform changes or enforcement actions, since these are outside our control." },
        ],
      },
    ],
  },
  {
    id: "customer-data-and-user-content",
    title: "9. Customer Data and User Content",
    blocks: [
      {
        type: "sub",
        title: "9.1 Ownership",
        blocks: [
          { type: "p", text: "As between you and Vela, you retain all ownership rights in your User Content and in Customer Data relating to your End Customers, to the extent such data is capable of being owned. This includes your business information, your knowledge base content, your leads, appointments, and conversation records, and any files or images you upload." },
        ],
      },
      {
        type: "sub",
        title: "9.2 License to Vela",
        blocks: [
          { type: "p", text: "You grant Vela a worldwide, non exclusive, royalty free license to host, store, process, transmit, reproduce, and display your User Content and Customer Data solely for the purpose of providing, maintaining, securing, and improving the Service for you, including for the purpose of generating AI Agent responses, populating your dashboard, and providing analytics. This license does not permit us to sell your User Content or Customer Data, and it ends when the relevant content is deleted from the Service, subject to Section 21 and the retention practices described in our Privacy Policy." },
        ],
      },
      {
        type: "sub",
        title: "9.3 Relationship to End Customer Personal Data",
        blocks: [
          { type: "p", text: "Where Customer Data includes personal data relating to your End Customers, you are responsible for ensuring that you have a lawful basis to collect and process that personal data, and for providing any notices to your End Customers required by applicable data protection law regarding your use of Vela and any AI Agent to process their information. Our Privacy Policy describes, in more detail, the respective roles that you and Vela may play with respect to such personal data." },
        ],
      },
      {
        type: "sub",
        title: "9.4 Your Responsibility for Content Accuracy and Lawfulness",
        blocks: [
          { type: "p", text: "You represent that you have all rights necessary to submit your User Content and Customer Data to the Service, and that your User Content and Customer Data, and your use of the Service generally, do not violate any applicable law or any third party's intellectual property, privacy, or other rights." },
        ],
      },
      {
        type: "sub",
        title: "9.5 Aggregated and De-identified Data",
        blocks: [
          { type: "p", text: "We may create aggregated or de-identified data derived from User Content and Customer Data across our customer base, for example to understand overall product usage trends. Aggregated or de-identified data does not identify you or any End Customer, and we may use it to operate, improve, and promote the Service without further restriction under these Terms, for as long as it remains de-identified." },
        ],
      },
    ],
  },
  {
    id: "customer-responsibilities",
    title: "10. Customer Responsibilities",
    blocks: [
      { type: "p", text: "In addition to the specific responsibilities described elsewhere in these Terms, you are responsible for:" },
      {
        type: "ul",
        items: [
          "Configuring your AI Agents, knowledge base, and business information accurately and keeping them up to date;",
          "Reviewing AI generated output and communications with reasonable regularity, particularly during onboarding and after any significant change to your knowledge base or configuration;",
          "Ensuring your use of the Service, including any AI Agent communications and any Connected Channel, complies with applicable law, including consumer protection, telecommunications, advertising, and data protection law;",
          "Maintaining the security of your Account credentials, API keys, and integration credentials;",
          "Obtaining any consents or permissions required from your End Customers before collecting or processing their information through the Service;",
          "Independently backing up any User Content or Customer Data that is critical to your business;",
          "Promptly notifying us of any suspected security incident, unauthorized access, or misuse of your Account.",
        ],
      },
    ],
  },
  {
    id: "website-builder",
    title: "11. Website Builder",
    blocks: [
      { type: "p", text: "Where your Plan includes the website builder, the Service allows you to generate, publish, and host a business website using AI assisted tools, including AI generated text and images sourced from third party stock photography providers as described in our Privacy Policy." },
      { type: "p", text: "You are responsible for reviewing website content before publishing it, including for accuracy of business information, pricing, and claims, and for ensuring the published website complies with applicable law, including consumer protection and advertising law. Vela does not independently verify the accuracy of website content that you approve and publish." },
      { type: "p", text: "Websites built with the Service may include an embedded AI chat widget, either automatically or based on a configuration choice you make during the build process or afterward in your dashboard. You may also be offered the ability to embed the same chat widget on an externally hosted website that is not built with Vela, using an embed code we provide. Where you use this embed code on a third party website, you are responsible for your use of that website and for ensuring you have the right to add third party embedded functionality to it." },
      { type: "p", text: "Depending on your Plan, you may be able to connect a custom domain to a website built with the Service. You are responsible for the registration, renewal, and configuration of any domain you connect, and for ensuring you have the right to use that domain." },
    ],
  },
  {
    id: "marketing-content",
    title: "12. Marketing and Generated Content",
    blocks: [
      { type: "p", text: "Where your Plan includes AI assisted marketing tools, such as social media post generation, video script generation, or broadcast message drafting, the Service generates content based on your business information and your instructions. You are responsible for reviewing generated marketing content before publishing or sending it, including for factual accuracy, compliance with advertising and consumer protection law, and compliance with the rules of any platform on which you publish it, such as Instagram, Facebook, or other social platforms." },
      { type: "p", text: "Vela does not review or approve marketing content on your behalf, and does not guarantee that generated content is accurate, non infringing, or compliant with any particular law or platform policy." },
    ],
  },
  {
    id: "acceptable-use",
    title: "13. Acceptable Use and Prohibited Activities",
    blocks: [
      { type: "p", text: "You agree not to use the Service, and not to permit any Authorized User or your AI Agents to be used, to:" },
      {
        type: "ul",
        items: [
          "Violate any applicable law, regulation, or third party right, including intellectual property, privacy, publicity, or consumer protection rights;",
          "Send unsolicited bulk messages, spam, or engage in phishing, fraud, or other deceptive communications through any Connected Channel;",
          "Harass, threaten, defame, discriminate against, or abuse any person, whether through your own conduct or through your AI Agent's automated communications;",
          "Collect or process sensitive personal data, such as health information, government identifiers, or financial account details, through the Service in a manner that violates applicable law;",
          "Attempt to gain unauthorized access to the Service, other Accounts, or any systems or networks connected to the Service;",
          "Interfere with or disrupt the integrity, security, or performance of the Service, including by introducing malware, conducting denial of service attacks, or making excessive automated requests;",
          "Reverse engineer, decompile, or attempt to extract the source code, underlying models, or algorithms of the Service, except to the extent such restriction is prohibited by applicable law;",
          "Use the Service to develop, train, or benchmark a competing product or service, or to scrape, harvest, or extract data from the Service beyond your own Account data;",
          "Misrepresent your identity, impersonate any person or business, or misrepresent your affiliation with any person or entity;",
          "Use the Service to generate content that is unlawful, defamatory, obscene, or that infringes any third party's rights;",
          "Circumvent any usage limits, access controls, or security measures of the Service;",
          "Use the Service in any manner that could damage, disable, overburden, or impair Vela's infrastructure or that of our Third Party Services.",
        ],
      },
      { type: "p", text: "You are solely responsible for ensuring that your use of the Service, including the content and conduct of your AI Agents' communications with End Customers, complies with all laws applicable to your business and to the jurisdictions in which your End Customers are located." },
    ],
  },
  {
    id: "compliance-with-laws",
    title: "14. Compliance With Laws",
    blocks: [
      { type: "p", text: "You are responsible for identifying and complying with all laws, regulations, and industry rules applicable to your business and your use of the Service, including those relating to consumer protection, advertising and marketing, telecommunications and telemarketing, data protection and privacy, accessibility, and any industry specific regulation applicable to your business, such as healthcare, financial services, or legal services regulation, where applicable." },
      { type: "p", text: "Vela provides tools that you can configure and use in a lawful manner, but Vela does not, by providing the Service, represent or warrant that your particular use of the Service will satisfy the legal requirements applicable to your business. You should seek independent legal advice regarding the requirements applicable to your industry and jurisdiction." },
    ],
  },
  {
    id: "intellectual-property",
    title: "15. Intellectual Property",
    blocks: [
      { type: "p", text: "The Service, including its software, user interface, design, text, graphics, logos, and underlying technology, is owned by Vela or its licensors and is protected by intellectual property laws. Except for the limited rights expressly granted to you to use the Service under these Terms, no rights, title, or interest in the Service are transferred to you." },
      { type: "p", text: "As between you and Vela, and subject to the license granted in Section 9.2, you own the website content, marketing content, and other output generated for your business through the Service based on your instructions and User Content, to the extent such output is capable of being owned and subject to any rights held by underlying Third Party Services or their providers in the tools used to generate that output. You are responsible for ensuring that any generated content you use does not infringe any third party's rights." },
      { type: "p", text: "You may not copy, modify, distribute, sell, or lease any part of the Service itself, nor reverse engineer or attempt to extract the source code of the Service, except as expressly permitted by law. \"Vela\" and our logos are trademarks of Vela, and you may not use them without our prior written consent except as reasonably necessary to identify that you are a Vela customer." },
    ],
  },
  {
    id: "feedback",
    title: "16. Feedback",
    blocks: [
      { type: "p", text: "If you choose to provide us with feedback, suggestions, or ideas about the Service, you grant us a perpetual, irrevocable, worldwide, royalty free license to use that feedback for any purpose, including to improve the Service, without any obligation or compensation to you." },
    ],
  },
  {
    id: "subscription-plans-and-trials",
    title: "17. Subscription Plans and Free Trials",
    blocks: [
      { type: "p", text: "Vela offers multiple subscription tiers, each with its own feature set, usage allowances, and price, as described on our Pricing page. We reserve the right to introduce new Plans, retire existing Plans, or adjust Plan features and pricing at any time. Material price changes to your active Subscription will be communicated to you in advance of taking effect, in accordance with Section 18.6." },
      { type: "p", text: "From time to time we may offer a free trial or introductory offer for a Plan. Where such an offer is presented to you at signup or elsewhere, the specific terms of that offer, including its duration, any card requirement, and what happens at the end of the trial period, are as stated at the time the offer is presented to you and will govern in the event of any conflict with a general description of trials in these Terms. Unless expressly stated otherwise at the time of the offer, we do not guarantee that a free trial or introductory offer is currently available, and any such offer may be withdrawn or modified at our discretion for future signups." },
    ],
  },
  {
    id: "billing-taxes-payment",
    title: "18. Billing, Taxes, and Payment",
    blocks: [
      {
        type: "sub",
        title: "18.1 Billing Cycle",
        blocks: [
          { type: "p", text: "Subscriptions are billed in advance on a recurring monthly or annual basis, depending on the billing cycle you select at signup or thereafter. By providing a payment method, you authorize us, or the applicable payment processor acting on our behalf, to charge that payment method on each billing date for the applicable Subscription fee, plus any applicable taxes and any usage overage charges described in Section 19." },
        ],
      },
      {
        type: "sub",
        title: "18.2 Payment Processor",
        blocks: [
          { type: "p", text: "Payment processing is handled by the applicable third party payment processor, and your payment information is subject to that processor's own terms and privacy practices in addition to ours. We do not store full payment card numbers on our own systems." },
        ],
      },
      {
        type: "sub",
        title: "18.3 Taxes",
        blocks: [
          { type: "p", text: "Prices for the Service are exclusive of taxes unless stated otherwise, and you are responsible for any applicable sales, use, value added, goods and services, or similar taxes arising from your Subscription, other than taxes on Vela's net income." },
        ],
      },
      {
        type: "sub",
        title: "18.4 Failed Payments",
        blocks: [
          { type: "p", text: "If a payment cannot be processed, we may retry the charge, suspend your access to paid features, or downgrade your Account until payment is successfully collected. We will use reasonable efforts to notify you of a failed payment before suspending your Account." },
        ],
      },
      {
        type: "sub",
        title: "18.5 Chargebacks and Fraud",
        blocks: [
          { type: "p", text: "Initiating a chargeback or payment dispute without first contacting us to resolve a billing concern may result in immediate suspension of your Account pending resolution. We reserve the right to suspend or terminate any Account associated with fraudulent, abusive, or unauthorized payment activity." },
        ],
      },
      {
        type: "sub",
        title: "18.6 Price Changes",
        blocks: [
          { type: "p", text: "We may change our prices from time to time. For an active Subscription, we will provide advance notice of any material price increase before it takes effect on your next renewal, and your continued use of the Service after the effective date of a price change constitutes acceptance of the new price. Promotional or discounted pricing is offered at our discretion and may be limited in duration or eligibility." },
        ],
      },
    ],
  },
  {
    id: "usage-limits-and-overages",
    title: "19. Usage Limits and Overages",
    blocks: [
      { type: "p", text: "Each Plan includes specific usage allowances, such as voice minutes, text messages, connected channels, and websites, as described on our Pricing page. We monitor usage against these allowances at the Account level." },
      { type: "p", text: "Where you exceed your Plan's usage allowance for a given billing period, depending on the type of usage and your Plan, the Service may apply an overage charge at the rate published on our Pricing page for the applicable usage type, temporarily limit the affected feature until your next billing cycle, or prompt you to upgrade your Plan. The specific handling of usage beyond your allowance for a given feature is as described on our Pricing page and in the Service at the relevant time, and may be updated as our billing and payment processing capabilities evolve." },
    ],
  },
  {
    id: "cancellation-suspension-refunds",
    title: "20. Cancellation, Suspension, and Refunds",
    blocks: [
      {
        type: "sub",
        title: "20.1 Cancellation by You",
        blocks: [
          { type: "p", text: "You may cancel your Subscription at any time from your Account settings. Cancellation takes effect at the end of your current billing period, and you will retain access to the Service until that date. Vela Subscriptions can be cancelled at any time, with no long term contract or minimum commitment beyond the current billing period already paid for." },
        ],
      },
      {
        type: "sub",
        title: "20.2 Refunds",
        blocks: [
          { type: "p", text: "Except as required by applicable law, or as expressly stated at the time of purchase or in a specific offer, fees already paid are non refundable, including for partial billing periods following cancellation. If applicable law in your jurisdiction grants you a statutory right to a refund or cooling off period, that right is not affected by this Section." },
        ],
      },
      {
        type: "sub",
        title: "20.3 Suspension",
        blocks: [
          { type: "p", text: "We may suspend your access to all or part of the Service where we reasonably believe suspension is necessary to prevent harm to the Service, to other customers, to End Customers, or to Vela, including in cases of suspected fraud, security incidents, material breach of these Terms, or non payment, as described in Section 18.4. We will use reasonable efforts to notify you of a suspension and the reason for it, except where doing so would compromise a legitimate security or legal purpose." },
        ],
      },
    ],
  },
  {
    id: "data-export-and-deletion",
    title: "21. Data Export and Deletion",
    blocks: [
      { type: "p", text: "Where the Service provides self service export functionality for a given category of data, such as appointment records, you may use it to export that data. For categories of User Content or Customer Data that do not yet have a self service export tool within the Service, you may request an export by contacting us at the address in Section 35, and we will provide the requested data in a reasonably usable format within a reasonable time." },
      { type: "p", text: "You may request deletion of your Account and associated User Content and Customer Data at any time by contacting us at the address in Section 35. Upon a verified deletion request, or upon termination of your Account under Section 31, we will delete or anonymize your data within the period described in our Privacy Policy, except where retention is required for legal, tax, dispute resolution, fraud prevention, or legitimate business record keeping purposes, or where data has already been aggregated or anonymized such that it no longer identifies you or your End Customers." },
      { type: "p", text: "You are responsible for maintaining your own backup copies of any User Content or Customer Data that is important to your business before requesting deletion or before your Account is terminated." },
    ],
  },
  {
    id: "service-availability",
    title: "22. Service Availability and Modifications",
    blocks: [
      { type: "p", text: "We aim to keep the Service available at all times, but we do not guarantee uninterrupted, timely, secure, or error free operation. The Service may be temporarily unavailable due to scheduled or emergency maintenance, updates, Third Party Service outages, or circumstances beyond our reasonable control, as described in Section 30. Unless a specific service level commitment has been agreed with you in writing, we do not offer a service level agreement or uptime guarantee." },
      { type: "p", text: "We reserve the right to modify, suspend, or discontinue any part of the Service, including specific features, at any time. Where reasonably possible, we will provide advance notice of material changes that significantly reduce the functionality available to you on a paid Plan. Continued use of the Service after a change becomes effective constitutes your acceptance of that change." },
    ],
  },
  {
    id: "beta-features",
    title: "23. Beta and Experimental Features",
    blocks: [
      { type: "p", text: "We may from time to time make experimental, beta, or early access features available to you. Such features are provided \"as is\", may be incomplete, may not function as intended, may be changed or discontinued at any time without notice, and are excluded from any service level or support commitment that may otherwise apply to the Service. We may collect additional feedback and usage data from your use of beta features to improve them." },
    ],
  },
  {
    id: "third-party-services",
    title: "24. Third Party Services",
    blocks: [
      { type: "p", text: "The Service integrates with and relies on a number of Third Party Services to deliver its functionality, including providers of artificial intelligence language processing, voice call handling, text to speech and speech to text transcription, messaging channel connectivity such as Meta for Instagram and WhatsApp, stock photography for the website builder, transactional email delivery, payment processing, and cloud infrastructure and hosting. These providers, and the categories of data they may process, are described in more detail in our Privacy Policy." },
      { type: "p", text: "Your use of the Service is subject to the availability and proper functioning of these Third Party Services. Vela is not responsible for the availability, performance, security, content, or policies of any Third Party Service, and any outage, change, discontinuation, or policy change by a Third Party Service provider may affect the availability or behavior of related functionality within the Service. We will use reasonable efforts to adapt the Service to material Third Party Service changes where feasible." },
    ],
  },
  {
    id: "security",
    title: "25. Security",
    blocks: [
      { type: "p", text: "We maintain administrative, technical, and organizational measures designed to protect the Service and the data processed through it, including access controls that scope each customer's access to their own data, authentication for Account access, and use of reputable infrastructure providers. Further detail on our security practices is provided in our Privacy Policy." },
      { type: "p", text: "You are responsible for the security of your own Account credentials, API keys, integration tokens, and devices used to access the Service, and for promptly notifying us of any suspected compromise as described in Section 3.2. No method of transmission or storage is completely secure, and we cannot guarantee absolute security of the Service or of any data processed through it." },
    ],
  },
  {
    id: "confidentiality",
    title: "26. Confidentiality",
    blocks: [
      { type: "p", text: "\"Confidential Information\" means non public information disclosed by one party to the other in connection with these Terms that is designated as confidential or that would reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure, including your User Content and non public information about the Service. Each party agrees to use the other party's Confidential Information only as necessary to perform its obligations under these Terms, and to protect it using at least the same degree of care it uses to protect its own confidential information of similar importance, but no less than a reasonable degree of care. This Section does not apply to information that is or becomes publicly available through no fault of the receiving party, was already known to the receiving party without an obligation of confidentiality, is independently developed without use of the disclosing party's Confidential Information, or is required to be disclosed by law, provided reasonable notice is given where legally permitted." },
    ],
  },
  {
    id: "disclaimers",
    title: "27. Disclaimers",
    blocks: [
      { type: "p", text: "To the maximum extent permitted by applicable law, the Service, including all AI Services and AI generated output, is provided \"as is\" and \"as available\" without warranties of any kind, whether express, implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose, title, and non infringement, and any warranty arising from course of dealing or usage of trade." },
      { type: "p", text: "We do not warrant that the Service will be uninterrupted, error free, or secure, that any AI generated output will be accurate, complete, or suitable for your purposes, that any Connected Channel or Third Party Service will remain available or unchanged, or that any defect will be corrected. Nothing in these Terms excludes or limits any warranty that cannot lawfully be excluded or limited under applicable law." },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "28. Limitation of Liability",
    blocks: [
      { type: "p", text: "To the maximum extent permitted by applicable law, in no event will Vela, its officers, employees, or agents be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, or business opportunity, arising out of or in connection with your use of, or inability to use, the Service, whether based on contract, tort, negligence, strict liability, or any other legal theory, even if advised of the possibility of such damages." },
      { type: "p", text: "To the maximum extent permitted by applicable law, our total aggregate liability arising out of or relating to these Terms or the Service, whether in contract, tort, or otherwise, will not exceed the total fees actually paid by you to Vela in the three months immediately preceding the event giving rise to the claim." },
      { type: "p", text: "Nothing in these Terms excludes or limits either party's liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited under applicable law." },
    ],
  },
  {
    id: "indemnification",
    title: "29. Indemnification",
    blocks: [
      { type: "p", text: "You agree to defend, indemnify, and hold harmless Vela and its officers, employees, and agents from and against any claims, damages, liabilities, losses, and expenses, including reasonable legal fees, arising out of or related to: your use of the Service; your User Content or Customer Data; your violation of these Terms; your violation of any applicable law or any third party's rights; or any communication sent, or action taken, by your AI Agent on your behalf, including communications sent through a Connected Channel." },
    ],
  },
  {
    id: "force-majeure",
    title: "30. Force Majeure",
    blocks: [
      { type: "p", text: "Neither party will be liable for any failure or delay in performance under these Terms, other than payment obligations, to the extent caused by circumstances beyond that party's reasonable control, including acts of God, natural disaster, war, terrorism, civil unrest, labor disputes, governmental action, internet or telecommunications failures, or outages or policy changes of a Third Party Service." },
    ],
  },
  {
    id: "term-and-termination",
    title: "31. Term and Termination",
    blocks: [
      {
        type: "sub",
        title: "31.1 Term",
        blocks: [
          { type: "p", text: "These Terms remain in effect for as long as you maintain an Account or otherwise use the Service." },
        ],
      },
      {
        type: "sub",
        title: "31.2 Termination by You",
        blocks: [
          { type: "p", text: "You may stop using the Service and cancel your Subscription at any time as described in Section 20.1." },
        ],
      },
      {
        type: "sub",
        title: "31.3 Termination by Vela",
        blocks: [
          { type: "p", text: "We may suspend or terminate your access to the Service, with or without notice, if you materially breach these Terms and, where the breach is capable of remedy, fail to remedy it within a reasonable period after notice, if we reasonably believe your use of the Service poses a security, legal, or reputational risk to Vela or to other customers, or if required to do so by law." },
        ],
      },
      {
        type: "sub",
        title: "31.4 Effect of Termination",
        blocks: [
          { type: "p", text: "Upon termination, your right to access the Service ends immediately. Provisions of these Terms that by their nature should survive termination, including Sections 9 (as to data already licensed), 15 through 21, and 25 through 34, will survive." },
        ],
      },
      {
        type: "sub",
        title: "31.5 Post Termination Data Handling",
        blocks: [
          { type: "p", text: "Following termination, we retain your Account, User Content, and Customer Data for the period described in Section 21 and in our Privacy Policy, after which it is deleted or anonymized from active systems, except where retention is required for legal, tax, or legitimate business record keeping purposes." },
        ],
      },
    ],
  },
  {
    id: "dispute-resolution",
    title: "32. Dispute Resolution and Governing Law",
    blocks: [
      { type: "p", text: "These Terms are governed by the laws of [GOVERNING LAW JURISDICTION TO BE CONFIRMED], without regard to conflict of law principles, except where a different governing law is required by applicable mandatory consumer protection rules in your jurisdiction." },
      { type: "p", text: "We encourage you to contact us first to resolve any dispute informally using the contact details in Section 35. If a dispute cannot be resolved informally, it will be subject to the exclusive jurisdiction of the competent courts of [GOVERNING LAW JURISDICTION TO BE CONFIRMED], unless applicable law requires otherwise. This Section does not limit any right you may have to bring a claim in your local courts under mandatory consumer protection law, and does not require arbitration unless a separate arbitration agreement is entered into by the parties." },
    ],
  },
  {
    id: "changes-to-terms",
    title: "33. Changes to These Terms",
    blocks: [
      { type: "p", text: "We may update these Terms from time to time to reflect changes in the Service, our business practices, or applicable law. When we make material changes, we will update the \"Last updated\" date at the top of this page and, where appropriate, provide additional notice, such as an email or an in product notification. Your continued use of the Service after a change takes effect constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service and may cancel your Subscription as described in Section 20.1." },
    ],
  },
  {
    id: "general-provisions",
    title: "34. General Provisions",
    blocks: [
      {
        type: "sub",
        title: "34.1 Entire Agreement",
        blocks: [
          { type: "p", text: "These Terms, together with our Privacy Policy and any Plan specific terms referenced on our Pricing page, constitute the entire agreement between you and Vela regarding the Service, and supersede any prior agreements or understandings, written or oral, regarding the subject matter of these Terms." },
        ],
      },
      {
        type: "sub",
        title: "34.2 Severability",
        blocks: [
          { type: "p", text: "If any provision of these Terms is found to be unenforceable, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect." },
        ],
      },
      {
        type: "sub",
        title: "34.3 No Waiver",
        blocks: [
          { type: "p", text: "Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision." },
        ],
      },
      {
        type: "sub",
        title: "34.4 Assignment",
        blocks: [
          { type: "p", text: "You may not assign or transfer these Terms, or any rights or obligations under them, without our prior written consent. We may assign these Terms, in whole or in part, in connection with a merger, acquisition, reorganization, or sale of assets, or by operation of law, without restriction." },
        ],
      },
      {
        type: "sub",
        title: "34.5 Notices",
        blocks: [
          { type: "p", text: "We may provide notices to you by email to the address associated with your Account, by posting within the Service, or by posting on our website. You may provide notices to us using the contact details in Section 35." },
        ],
      },
      {
        type: "sub",
        title: "34.6 Relationship of the Parties",
        blocks: [
          { type: "p", text: "The parties are independent contractors. Nothing in these Terms creates a partnership, joint venture, agency, or employment relationship between you and Vela." },
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "35. Contact Information",
    blocks: [
      { type: "p", text: "If you have any questions about these Terms, please contact us at legal@tryvela.com." },
      { type: "note", text: "Operating entity, registered address, and jurisdiction: [LEGAL ENTITY NAME], [REGISTERED ADDRESS], [JURISDICTION OF INCORPORATION]. This information will be completed once Vela's corporate structure is finalized." },
    ],
  },
];
