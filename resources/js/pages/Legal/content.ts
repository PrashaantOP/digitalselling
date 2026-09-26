/**
 * Footer ke legal / company pages ka content. DRAFT hai — publish se pehle legal review zaroor karwao.
 * TODO: neeche ke placeholders (email, address, jurisdiction) apni asli details se replace karo.
 */
export const COMPANY = {
    name: 'DigitalSelling',
    email: 'support@example.com', // TODO: asli support email
    address: 'Your registered business address, City, State, India', // TODO
    jurisdiction: 'your city', // TODO: courts ka shehar (Terms → governing law)
    responseTime: '2 business days',
};

export type PolicyBlock = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type PolicyPage = { title: string; intro: string; updated: string; sections: PolicyBlock[] };

export type PageKey = 'privacy-policy' | 'terms' | 'refund-policy' | 'about' | 'contact';

const UPDATED = '26 September 2026';
// PlanPricing::TRIAL_DAYS ke saath sync
const TRIAL_DAYS = 90;

export const PAGES: Record<PageKey, PolicyPage> = {
    'privacy-policy': {
        title: 'Privacy Policy',
        updated: UPDATED,
        intro: `This Privacy Policy explains how ${COMPANY.name} (“we”, “us”) collects, uses and protects information when you use our platform — whether you are a creator selling products or a buyer purchasing them.`,
        sections: [
            {
                heading: '1. Information we collect',
                bullets: [
                    'Account details: name, email address, phone number, username and profile photo.',
                    'Creator details: store information, products and content you upload, payout details (bank / UPI) and KYC documents required by law.',
                    'Buyer details: name, email, phone, answers to checkout questions, optional GSTIN and notes you provide at checkout.',
                    'Transaction data: order amount, product purchased, coupon used and payment status. Card / UPI credentials are handled by our payment partner and never stored by us.',
                    'Usage data: pages visited, links clicked, device and browser type, and approximate location derived from IP address.',
                ],
            },
            {
                heading: '2. How we use information',
                bullets: [
                    'To create and operate accounts, stores and products.',
                    'To process payments, deliver purchased products and grant course or content access.',
                    'To show creators orders, enrollments, bookings and analytics for their own products.',
                    'To process payouts and meet KYC, tax and anti-fraud obligations.',
                    'To send transactional emails and, where you have agreed, product updates.',
                    'To keep the platform secure and improve our services.',
                ],
            },
            {
                heading: '3. Sharing of information',
                paragraphs: [
                    'When you buy from a creator, the creator receives the details you submit at checkout so they can fulfil your order. We share data with service providers that help us run the platform — such as our payment gateway (Razorpay), hosting, email delivery and analytics providers — only to the extent needed for them to perform their service.',
                    'We may disclose information if required by law, court order or government authority, or to protect the rights and safety of our users and the platform. We do not sell your personal information.',
                ],
            },
            {
                heading: '4. Cookies and tracking',
                paragraphs: [
                    'We use essential cookies for login sessions and security, and analytics to understand how pages are used. Creators may add their own Facebook Pixel or Google Analytics ID to their product pages; those tools are governed by the respective providers’ policies.',
                ],
            },
            {
                heading: '5. Data retention',
                paragraphs: [
                    'We keep account data while your account is active. Transaction and invoice records are retained for as long as required under applicable tax and accounting laws, even after an account is closed.',
                ],
            },
            {
                heading: '6. Security',
                paragraphs: [
                    'We use industry-standard safeguards such as encrypted connections (HTTPS), access controls and role-based permissions. No system is completely secure, so please keep your password and OTPs confidential.',
                ],
            },
            {
                heading: '7. Your choices and rights',
                bullets: [
                    'Access and update your profile information from your account settings.',
                    'Request a copy or deletion of your personal data, subject to legal retention requirements.',
                    'Unsubscribe from marketing emails using the link in any such email.',
                ],
            },
            {
                heading: '8. Children',
                paragraphs: ['The platform is not intended for use by children under 18 without the involvement of a parent or guardian.'],
            },
            {
                heading: '9. Changes and contact',
                paragraphs: [
                    `We may update this policy from time to time; the “Last updated” date shows the latest version. For privacy questions or requests, write to ${COMPANY.email}.`,
                ],
            },
        ],
    },

    terms: {
        title: 'Terms & Conditions',
        updated: UPDATED,
        intro: `These Terms govern your use of ${COMPANY.name}. By creating an account, publishing a product or making a purchase, you agree to these Terms.`,
        sections: [
            {
                heading: '1. The platform',
                paragraphs: [
                    `${COMPANY.name} provides tools for creators to build a store and sell digital products and services — including online courses, events, eBooks and downloads, locked content, payment pages and 1:1 sessions. The creator is the seller of each product; ${COMPANY.name} provides the technology, checkout and payment facilitation.`,
                ],
            },
            {
                heading: '2. Accounts',
                bullets: [
                    'You must provide accurate information and keep your login credentials secure.',
                    'You are responsible for all activity under your account, including actions by sub-admins you invite.',
                    'Usernames must not impersonate others or infringe trademarks. Some usernames are reserved by the platform.',
                ],
            },
            {
                heading: '3. Creator responsibilities',
                bullets: [
                    'You own, or have the rights to sell, all content you upload.',
                    'Product descriptions, prices and promises must be accurate and not misleading.',
                    'You are responsible for delivering what you sell — for example, conducting live classes, events and booked sessions as scheduled.',
                    'You may set your own terms, refund and privacy policy per product, which must not conflict with these Terms or applicable law.',
                    'You are responsible for your own taxes, including GST where applicable.',
                ],
            },
            {
                heading: '4. Prohibited content and use',
                bullets: [
                    'Illegal, pirated, hateful, sexually explicit or harmful content.',
                    'Get-rich-quick, gambling, or misleading financial schemes.',
                    'Selling content you do not own or have a licence to sell.',
                    'Attempting to bypass platform checkout, scrape data or disrupt the service.',
                ],
                paragraphs: ['We may remove content or suspend accounts that violate these Terms.'],
            },
            {
                heading: '5. Fees and payouts',
                bullets: [
                    'Free plan: 15% platform commission on each successful sale, no monthly fee.',
                    'Pro plan: 10% platform commission on each successful sale, ₹499 per month (plus applicable GST).',
                    'The commission includes payment gateway (Razorpay) charges — no separate gateway fee is deducted from your earnings.',
                    `Every new creator account starts on Pro free for ${TRIAL_DAYS} days. When the trial ends, the account moves to the Free plan automatically unless you choose to subscribe to Pro. No card is required to start the trial.`,
                    'Plan changes apply to sales made after the change; past orders keep the commission rate recorded at the time of sale.',
                ],
                paragraphs: [
                    'Earnings are paid out to the creator’s verified bank account or UPI after KYC. We may hold payouts where we reasonably suspect fraud, chargebacks or a breach of these Terms.',
                ],
            },
            {
                heading: '6. Buyers',
                paragraphs: [
                    'When you purchase a product, you enter into an agreement with the creator. Access to digital products is for your personal use only — sharing login access, redistributing files or recording paid content is not permitted. Course access lasts for the duration set by the creator (lifetime or a fixed number of days).',
                ],
            },
            {
                heading: '7. Intellectual property',
                paragraphs: [
                    `Creators retain ownership of their content and grant ${COMPANY.name} a licence to host, display and deliver it for operating the platform. The ${COMPANY.name} name, logo and software remain our property.`,
                ],
            },
            {
                heading: '8. Disclaimers and liability',
                paragraphs: [
                    `The platform is provided “as is”. ${COMPANY.name} does not guarantee any particular earnings or learning outcomes and is not responsible for the quality of products sold by creators. To the extent permitted by law, our total liability for any claim is limited to the fees you paid us in the three months before the claim.`,
                ],
            },
            {
                heading: '9. Termination',
                paragraphs: [
                    'You may close your account at any time. We may suspend or terminate accounts for violations of these Terms. Obligations relating to payments, refunds and content already sold survive termination.',
                ],
            },
            {
                heading: '10. Governing law',
                paragraphs: [`These Terms are governed by the laws of India. Courts at ${COMPANY.jurisdiction} shall have exclusive jurisdiction.`],
            },
        ],
    },

    'refund-policy': {
        title: 'Refund & Cancellation Policy',
        updated: UPDATED,
        intro: `Most products on ${COMPANY.name} are digital and delivered instantly. This policy explains when refunds are possible and how to request one.`,
        sections: [
            {
                heading: '1. Creator refund policies come first',
                paragraphs: [
                    'Each creator may publish their own refund policy on their product page. Where a creator’s policy exists, it applies to that purchase. If a product has no specific policy, the default rules below apply.',
                ],
            },
            {
                heading: '2. Default rules by product type',
                bullets: [
                    'Online courses: refund may be requested within 7 days of purchase if less than 20% of the course has been completed.',
                    'eBooks, downloads and locked content: non-refundable once the file has been downloaded or the content unlocked, except when the file is corrupt or not as described.',
                    'Events and webinars: full refund if cancelled or rescheduled by the creator. Buyer cancellations are refundable up to 48 hours before the start time.',
                    '1:1 sessions: full refund if the creator cancels or does not attend. Buyer cancellations are refundable up to 24 hours before the booked slot.',
                    'Payment pages (services / donations): as described by the creator; voluntary contributions are generally non-refundable.',
                ],
            },
            {
                heading: '3. How to request a refund',
                paragraphs: [
                    `Contact the creator first using the details on their store. If the issue is not resolved within ${COMPANY.responseTime}, write to ${COMPANY.email} with your order ID, registered email and reason for the request.`,
                ],
            },
            {
                heading: '4. Processing time',
                paragraphs: [
                    'Approved refunds are returned to the original payment method. Banks usually take 5–7 business days to credit the amount after the refund is initiated. Access to the refunded product is removed.',
                ],
            },
            {
                heading: '5. Failed or duplicate payments',
                paragraphs: [
                    'If money was deducted but the order failed, or you were charged twice, the amount is normally auto-reversed by the payment gateway. If not, contact us with the transaction details and we will help resolve it.',
                ],
            },
            {
                heading: '6. Creator subscriptions',
                paragraphs: [
                    `The first ${TRIAL_DAYS} days of Pro are free and nothing is charged during the trial. After that, the Pro plan (₹499/month) is billed in advance and is non-refundable for the current billing period. You can cancel anytime to stop future renewals and continue on the Free plan.`,
                ],
            },
        ],
    },

    about: {
        title: `About ${COMPANY.name}`,
        updated: UPDATED,
        intro: 'We help teachers, coaches, experts and creators turn their knowledge into a real business — without needing a developer, a website or five different tools.',
        sections: [
            {
                heading: 'What we do',
                paragraphs: [
                    `${COMPANY.name} is an all-in-one platform to sell online courses, live classes, eBooks, events, locked content, payment pages and 1:1 sessions from a single link. Checkout, payments, content delivery, certificates, analytics and payouts are built in.`,
                ],
            },
            {
                heading: 'Why we built it',
                paragraphs: [
                    'Creators in India were stitching together a website builder, a course host, a payment link, a booking app and a spreadsheet. We believe selling what you know should be as easy as posting a reel — so we put everything in one place and designed it for UPI-first, mobile-first buyers.',
                ],
            },
            {
                heading: 'What we care about',
                bullets: [
                    'Creators first: you own your content and your audience.',
                    'Simplicity: go live in minutes, not weeks.',
                    'Trust: secure payments, clear policies and transparent fees.',
                ],
            },
        ],
    },

    contact: {
        title: 'Contact us',
        updated: UPDATED,
        intro: `We’re happy to help — whether you’re a creator setting up your store or a buyer with a question about an order.`,
        sections: [
            {
                heading: 'Support',
                paragraphs: [`Email: ${COMPANY.email}`, `We usually reply within ${COMPANY.responseTime}.`],
            },
            {
                heading: 'Questions about a purchase?',
                paragraphs: [
                    'For access to a course, a download, an event link or a booked session, please contact the creator first using the details on their store page. Include your order ID and registered email so they can find your order quickly.',
                ],
            },
            {
                heading: 'Registered address',
                paragraphs: [COMPANY.address],
            },
        ],
    },
};
