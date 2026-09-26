import { type ProductKey } from './products';

/**
 * /products/{slug} pages ka detailed content. Har claim asli feature/schema pe based hai
 * (course_lessons types, event_details.mode, book_details.format, locked_content_*, booking availability…).
 */
export type ProductDetail = {
    headline: string;
    subheadline: string;
    capabilities: { title: string; items: string[] }[];
    buyerSteps: { title: string; body: string }[];
    useCases: { title: string; body: string }[];
    faqs: { q: string; a: string }[];
};

export const PRODUCT_DETAILS: Record<ProductKey, ProductDetail> = {
    course: {
        headline: 'Launch an online course your students actually finish',
        subheadline:
            'Recorded lessons, live classes, quizzes, assignments and certificates — in one course player your students open on any phone or laptop.',
        capabilities: [
            {
                title: 'Curriculum builder',
                items: [
                    'Unlimited modules and lessons',
                    'Drag & drop reordering',
                    'Publish or hide lessons individually',
                    'Free-preview lessons to build trust',
                ],
            },
            {
                title: '6 lesson formats',
                items: [
                    'Video lessons',
                    'Text with images',
                    'Audio lessons',
                    'Quizzes with scoring',
                    'Assignments you grade',
                    'Downloadable notes (PDF)',
                ],
            },
            {
                title: 'Live + recorded',
                items: [
                    'Schedule live classes inside the course',
                    'Zoom / Meet / YouTube Live links',
                    'Duration and time shown to students',
                    'Recorded and live in one place',
                ],
            },
            {
                title: 'Sales page that converts',
                items: ['Highlights & benefits', 'Testimonials & FAQs', 'Image gallery & instructions', 'Facebook Pixel & Google Analytics'],
            },
            {
                title: 'Checkout & pricing',
                items: [
                    'Fixed, pay-what-you-want or free',
                    'Strike-through discounts',
                    'Coupons & add-on upsells',
                    'Custom checkout questions + GSTIN',
                ],
            },
            {
                title: 'Completion & access',
                items: [
                    'Lifetime or fixed-days access',
                    'Lesson-by-lesson progress tracking',
                    'Auto certificate with unique number',
                    'Enrollment list per course',
                ],
            },
        ],
        buyerSteps: [], // course ke liye CourseWorkflow component (creator + student view) render hota hai
        useCases: [
            { title: 'Skill courses', body: 'Excel, coding, design, video editing — teach step by step with practice quizzes.' },
            { title: 'Exam preparation', body: 'Notes PDFs, recorded lectures, weekly live doubt sessions and mock quizzes.' },
            { title: 'Cohort programs', body: 'Run a batch with live classes on fixed dates and assignments every week.' },
            { title: 'Hobby & lifestyle', body: 'Cooking, fitness, music or art — video lessons with downloadable guides.' },
        ],
        faqs: [
            {
                q: 'Can students watch on mobile?',
                a: 'Yes. The course player works in any modern mobile or desktop browser — no app download needed.',
            },
            { q: 'Can I add a course trailer?', a: 'Yes. Use a promo video as the cover, and mark any lessons as free preview.' },
            {
                q: 'Do certificates generate automatically?',
                a: 'When you enable certificates for a course, each student who completes it gets one with a unique certificate number.',
            },
            { q: 'Can I limit access to, say, 180 days?', a: 'Yes. Choose lifetime access or access for a fixed number of days per course.' },
        ],
    },

    event: {
        headline: 'Sell seats for webinars and workshops',
        subheadline: 'Online or in-person — take registrations and payments, and share joining details automatically.',
        capabilities: [
            {
                title: 'Event setup',
                items: ['Online or in-person mode', 'Start and end date & time', 'Join link or venue address', 'Cover image or promo video'],
            },
            {
                title: 'Registrations',
                items: [
                    'Every paid order becomes a registration',
                    'Checkout answers saved per attendee',
                    'Registration list in your dashboard',
                    'Free events supported',
                ],
            },
            {
                title: 'Selling tools',
                items: ['Early-bird discounts', 'Coupon codes', 'Add-ons like recordings or workbooks', 'Pay-what-you-want pricing'],
            },
        ],
        buyerSteps: [
            { title: 'Finds your event', body: 'Opens the event page from your store or social link and sees date, time, mode and agenda.' },
            { title: 'Registers & pays', body: 'Fills your checkout questions and pays via UPI, card or netbanking.' },
            { title: 'Gets joining details', body: 'The join link (online) or venue address (in-person) is shared after payment.' },
            { title: 'Attends', body: 'Shows up on time — you have the full attendee list with their answers.' },
        ],
        useCases: [
            { title: 'Webinars', body: 'Paid masterclasses on Zoom or Google Meet.' },
            { title: 'Workshops', body: 'Hands-on in-person sessions with a venue address.' },
            { title: 'Bootcamps', body: 'Weekend intensives with limited seats.' },
            { title: 'Meetups', body: 'Community events — free or paid entry.' },
        ],
        faqs: [
            { q: 'Can I run a free event?', a: 'Yes. Set the pricing to free and you still collect registrations with contact details.' },
            { q: 'Where do I see who registered?', a: 'Every registration appears under the event in your dashboard along with checkout answers.' },
        ],
    },

    book: {
        headline: 'Sell eBooks, templates and digital downloads',
        subheadline: 'Upload once and sell forever. Buyers get their file right after payment — you get a detailed listing page for free.',
        capabilities: [
            {
                title: 'Files',
                items: [
                    'PDF and EPUB, or any other file',
                    'External link if hosted elsewhere',
                    'Page count and format shown',
                    'Private storage — not publicly linkable',
                ],
            },
            { title: 'Listing page', items: ['Subtitle and author name', '“What’s inside” list', 'FAQs for buyers', 'Cover images or video'] },
            {
                title: 'Delivery',
                items: ['Instant download after payment', 'Every download logged', 'Buyer details in your audience', 'Discounts & coupons'],
            },
        ],
        buyerSteps: [
            { title: 'Reads the listing', body: 'Sees the cover, what’s inside, page count, format and FAQs.' },
            { title: 'Pays', body: 'Quick checkout with UPI, cards or netbanking.' },
            { title: 'Downloads instantly', body: 'The file unlocks right after payment — no waiting for an email.' },
        ],
        useCases: [
            { title: 'eBooks & guides', body: 'Recipe books, study notes, how-to guides.' },
            { title: 'Templates', body: 'Canva, Notion, Excel or resume templates.' },
            { title: 'Presets & assets', body: 'Lightroom presets, fonts, stock packs (as a file).' },
            { title: 'Printables', body: 'Planners, worksheets and trackers.' },
        ],
        faqs: [
            { q: 'Can someone share my file link?', a: 'Files are kept in private storage and delivered only to buyers. We also log each download.' },
            { q: 'Can I sell a ZIP of many files?', a: 'Yes — upload a single file of any type, including a ZIP of multiple files.' },
        ],
    },

    locked_content: {
        headline: 'Put a paywall on anything',
        subheadline: 'Show a teaser publicly and reveal a secret message, video, images or files only after payment.',
        capabilities: [
            { title: 'What you can lock', items: ['A hidden text message', 'A private video link', 'Multiple images', 'Downloadable files'] },
            {
                title: 'Teaser page',
                items: ['Public teaser line', 'Category label', 'Counts of locked items shown', 'Hidden content never exposed before payment'],
            },
            {
                title: 'Tracking',
                items: ['Unlock history per buyer', 'Pricing: fixed, pay-what-you-want or free', 'Coupons supported', 'Buyer details saved'],
            },
        ],
        buyerSteps: [
            { title: 'Sees the teaser', body: 'Knows what kind of content is locked and how many items are inside.' },
            { title: 'Pays to unlock', body: 'A quick checkout — nothing else to sign up for.' },
            { title: 'Content reveals', body: 'The hidden message, video, images and files unlock for them.' },
        ],
        useCases: [
            { title: 'Secret links', body: 'Private community invites or resource links.' },
            { title: 'Behind the scenes', body: 'Exclusive videos or photo sets for fans.' },
            { title: 'Exact settings', body: 'Your gear list, camera settings or presets.' },
            { title: 'Answer keys', body: 'Solutions and cheat sheets for your students.' },
        ],
        faqs: [
            {
                q: 'Can anyone see the hidden content without paying?',
                a: 'No. The public page shows only the teaser and counts — hidden text, video links, images and files are sent only after unlock.',
            },
        ],
    },

    payment_page: {
        headline: 'Collect payments for anything, in minutes',
        subheadline: 'A clean payment page for services, custom offers, donations or fees — no product setup needed.',
        capabilities: [
            { title: 'Page', items: ['Title, subtitle and description', '“What’s included” list', 'FAQs', 'Cover image or video'] },
            { title: 'Pricing', items: ['Fixed amount', 'Customer decides (donations/support)', 'Free', 'Discounts & coupons'] },
            {
                title: 'Details',
                items: ['Optionally collect full name', 'Optional buyer note / reference', 'Custom checkout questions', 'GSTIN for invoices'],
            },
        ],
        buyerSteps: [
            { title: 'Opens your link', body: 'Sees what they are paying for and what’s included.' },
            { title: 'Enters details', body: 'Adds name, a note or answers you asked for.' },
            { title: 'Pays securely', body: 'UPI, cards or netbanking via Razorpay — you see the order instantly.' },
        ],
        useCases: [
            { title: 'Services', body: 'Resume reviews, design work, consulting fees.' },
            { title: 'Donations & support', body: '“Buy me a coffee” with pay-what-you-want.' },
            { title: 'Custom quotes', body: 'Share a link for a one-off amount.' },
            { title: 'Registrations & fees', body: 'Club fees, tuition, membership dues.' },
        ],
        faqs: [{ q: 'Do buyers need an account?', a: 'No. They just open the link, fill the details and pay.' }],
    },

    booking: {
        headline: 'Get booked and paid for 1:1 calls',
        subheadline: 'Share one booking page. People pick a free slot from your availability and pay upfront — no back-and-forth.',
        capabilities: [
            { title: 'Services', items: ['Multiple session types', 'Custom duration per session', 'Price per session', 'Pre-call questions'] },
            {
                title: 'Availability',
                items: ['Weekly working hours', 'Holidays & date exceptions', 'Only free slots are shown', 'Pause a session anytime'],
            },
            {
                title: 'Bookings',
                items: ['All bookings in one list', 'Answers attached to each booking', 'Buyer contact details', 'Coupons supported'],
            },
        ],
        buyerSteps: [
            { title: 'Opens your booking page', body: 'Sees your sessions with duration and price.' },
            { title: 'Picks a slot', body: 'Chooses a date and a free time slot from your availability.' },
            { title: 'Answers & pays', body: 'Fills your pre-call questions and pays to confirm.' },
            { title: 'Meets you', body: 'The booking shows up in your dashboard with all details.' },
        ],
        useCases: [
            { title: 'Mentorship', body: 'Career guidance and portfolio reviews.' },
            { title: 'Consulting', body: 'Business, marketing or tech consultations.' },
            { title: 'Coaching', body: 'Fitness, nutrition or life coaching.' },
            { title: 'Tutoring', body: 'One-on-one doubt-solving sessions.' },
        ],
        faqs: [
            { q: 'Can two people book the same slot?', a: 'No — once a slot is booked it is no longer shown as available.' },
            { q: 'Can I block a holiday?', a: 'Yes. Add an availability exception for any date you are unavailable.' },
        ],
    },
};
