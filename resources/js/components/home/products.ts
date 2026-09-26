import { BookOpen, CalendarClock, CalendarDays, GraduationCap, LockKeyhole, type LucideIcon, Wallet } from 'lucide-react';

/**
 * Platform ke saare product types — landing ke grid, workflows aur footer teeno yahi list use karte hain.
 * Keys = products.type enum (course, event, book, locked_content, payment_page, booking).
 */
export type ProductKey = 'course' | 'event' | 'book' | 'locked_content' | 'payment_page' | 'booking';

export type ProductInfo = {
    key: ProductKey;
    name: string;
    icon: LucideIcon;
    tagline: string;
    features: string[];
    // creator ka flow (dashboard me kya karta hai) → buyer ka flow
    steps: { title: string; body: string }[];
    example: string;
};

export const PRODUCTS: ProductInfo[] = [
    {
        key: 'course',
        name: 'Online Courses',
        icon: GraduationCap,
        tagline: 'Structured, self-paced or cohort courses with everything a student needs to finish.',
        features: [
            'Modules & 6 lesson formats',
            'Live classes inside the course',
            'Quizzes, assignments & grading',
            'Auto certificates on completion',
        ],
        steps: [], // course ka detailed flow CourseWorkflow section me hai
        example: 'e.g. “Excel for Beginners” — 5 modules, 40 lessons',
    },
    {
        key: 'event',
        name: 'Events & Webinars',
        icon: CalendarDays,
        tagline: 'Sell seats for online webinars or in-person workshops with automatic registrations.',
        features: ['Online or in-person mode', 'Start / end date & time', 'Join link shared after payment', 'Registration list with answers'],
        steps: [
            { title: 'Create the event', body: 'Add title, cover, description and choose online (Zoom / Meet link) or in-person (venue address).' },
            { title: 'Set schedule & price', body: 'Pick start and end time, set a fixed price, free entry or let people pay what they want.' },
            { title: 'Share & collect registrations', body: 'Every paid order becomes a registration with the buyer’s checkout answers attached.' },
            { title: 'Attendees get access', body: 'The join link or venue details reach the buyer right after payment — no manual follow-ups.' },
        ],
        example: 'e.g. “Sunday Stock Market Live Workshop”',
    },
    {
        key: 'book',
        name: 'eBooks & Downloads',
        icon: BookOpen,
        tagline: 'Sell PDFs, EPUBs, templates and guides with instant, secure delivery.',
        features: ['PDF / EPUB / file upload', '“What’s inside” & FAQs', 'Author, subtitle & page count', 'Download tracking'],
        steps: [
            { title: 'Upload your file', body: 'Upload a PDF, EPUB or any file — or point to an external link if it’s hosted elsewhere.' },
            {
                title: 'Build the listing',
                body: 'Add subtitle, author, pages, a “What’s inside” list and FAQs so buyers know exactly what they get.',
            },
            { title: 'Buyer checks out', body: 'Buyers pay via UPI, card or netbanking on a clean checkout page with your custom questions.' },
            { title: 'Instant download', body: 'The file unlocks immediately after payment and every download is logged for you.' },
        ],
        example: 'e.g. “100 Canva Templates Pack”',
    },
    {
        key: 'locked_content',
        name: 'Locked Content',
        icon: LockKeyhole,
        tagline: 'Put a paywall on a secret message, video, image set or files — unlocked on payment.',
        features: [
            'Public teaser, private reward',
            'Hidden text, video, images & files',
            'Great for recipes, links, presets',
            'Unlock history per buyer',
        ],
        steps: [
            { title: 'Write the teaser', body: 'Show a short public teaser that makes people curious about what’s behind the lock.' },
            { title: 'Add hidden content', body: 'Attach the hidden message, a private video link, images or downloadable files.' },
            { title: 'Buyer pays to unlock', body: 'A quick checkout — the content reveals itself on the same page after payment.' },
            { title: 'Track unlocks', body: 'See who unlocked what and when, right in your dashboard.' },
        ],
        example: 'e.g. “My exact Lightroom presets + settings”',
    },
    {
        key: 'payment_page',
        name: 'Payment Pages',
        icon: Wallet,
        tagline: 'A simple page to collect money for anything — services, donations, fees or custom offers.',
        features: ['“What’s included” list & FAQs', 'Fixed or pay-what-you-want', 'Collect name & a buyer note', 'Shareable short link'],
        steps: [
            { title: 'Describe the offer', body: 'Add a title, subtitle and what’s included. Perfect for services that don’t fit other types.' },
            { title: 'Choose pricing', body: 'Fixed amount, customer-decides (great for support / donations) or free.' },
            { title: 'Collect details', body: 'Optionally ask for the buyer’s full name, a note and any custom checkout questions.' },
            { title: 'Get paid', body: 'Payment lands in your account and the order appears in your dashboard with all answers.' },
        ],
        example: 'e.g. “Resume review — ₹499”',
    },
    {
        key: 'booking',
        name: '1:1 Sessions',
        icon: CalendarClock,
        tagline: 'Let people book paid calls on your calendar — mentorship, consulting or coaching.',
        features: ['Session length per service', 'Weekly availability', 'Holidays & exceptions', 'Buyer picks a free slot'],
        steps: [
            { title: 'Create a session', body: 'Set the session name, duration (e.g. 30 or 60 min), price and questions to ask before the call.' },
            { title: 'Set availability', body: 'Choose your weekly working hours and block out holidays or busy dates with exceptions.' },
            { title: 'Buyer books a slot', body: 'Your public booking page only shows free slots — no double bookings, no back-and-forth.' },
            { title: 'Meet & manage', body: 'Every booking with its responses shows up in your Bookings dashboard.' },
        ],
        example: 'e.g. “30-min career guidance call”',
    },
];

// URL: /products/{slug} — HomeController::PRODUCT_PAGES ke saath sync rakho
export const PRODUCT_SLUGS: Record<ProductKey, string> = {
    course: 'courses',
    event: 'events',
    book: 'ebooks',
    locked_content: 'locked-content',
    payment_page: 'payment-pages',
    booking: 'one-on-one-sessions',
};

export const productUrl = (key: ProductKey) => `/products/${PRODUCT_SLUGS[key]}`;
