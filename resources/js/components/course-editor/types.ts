/** Shapes of what CourseController@edit sends (Laravel camelCases relation names — see normalize below). */

export type PricingType = 'fixed' | 'customer_decides' | 'free';
export type LessonType = 'video' | 'text_image' | 'audio' | 'quiz' | 'assignment' | 'notes_pdf';
export type SectionType = 'instructions' | 'benefits' | 'highlights' | 'faqs' | 'testimonials' | 'gallery';
export type ThemeKey = 'default' | 'light' | 'dark';

export interface QuizOption {
    id: number;
    option_text: string | null;
    is_correct: boolean;
}

export interface QuizQuestion {
    id: number;
    question_text: string;
    type: 'single_choice' | 'multiple_choice';
    options: QuizOption[];
}

export interface Lesson {
    id: number;
    module_id: number;
    title: string;
    type: LessonType;
    is_published: boolean;
    is_free_preview: boolean;
    sort_order: number;
    video?: { video_url: string | null; notes: string | null } | null;
    text_content?: { content: string | null; images: { id: number; image_path: string }[] } | null;
    textContent?: { content: string | null; images: { id: number; image_path: string }[] } | null;
    audio?: { audio_url: string | null; audio_path: string | null; notes: string | null } | null;
    notes?: { allow_download: boolean; description: string | null; files: { id: number; original_name: string }[] } | null;
    assignment?: { assignment_prompt: string | null; allow_file_upload: boolean } | null;
    quiz?: { id: number; title: string; questions: QuizQuestion[] } | null;
}

/** Backend sends textContent (relation method name); editor reads text_content. Merge both. */
export function normalizeLesson(raw: Lesson): Lesson {
    const r = raw as unknown as Record<string, unknown>;
    const text = (r.text_content ?? r.textContent ?? null) as Lesson['text_content'];
    return { ...raw, text_content: text ?? undefined };
}

export function normalizeModules(modules: Module[] | undefined | null): Module[] {
    return (modules ?? []).map((m) => ({ ...m, lessons: (m.lessons ?? []).map(normalizeLesson) }));
}

export interface Module {
    id: number;
    course_id: number;
    title: string;
    sort_order: number;
    lessons: Lesson[];
}

export interface TextRow {
    id: number;
    text: string;
    is_enabled: boolean;
}
export interface FaqRow {
    id: number;
    question: string;
    answer: string;
    is_enabled: boolean;
}
export interface TestimonialRow {
    id: number;
    name: string;
    message: string;
    avatar_path: string | null;
    is_enabled: boolean;
}
export interface GalleryRow {
    id: number;
    image_path: string;
    is_enabled: boolean;
}

export interface LiveClass {
    id: number;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    join_link: string | null;
}

export interface Coupon {
    id: number;
    code: string;
    discount_percent: string | number;
    usage_limit: number | null;
    used_count: number;
    expires_at: string | null;
    is_active: boolean;
}

export interface CheckoutQuestion {
    id: number;
    label: string;
    field_type: 'text' | 'phone' | 'email' | 'number' | 'dropdown';
    options: string[] | null;
    is_required: boolean;
}

export interface CourseDetail {
    id: number;
    access_type: 'lifetime' | 'days';
    access_days: number | null;
    certificate_enabled: boolean;
    total_lessons: number;
    modules: Module[];
    instructions: TextRow[];
    benefits: TextRow[];
    highlights: TextRow[];
    faqs: FaqRow[];
    testimonials: TestimonialRow[];
    gallery_items: GalleryRow[];
    galleryItems?: GalleryRow[];
    live_classes: LiveClass[];
    liveClasses?: LiveClass[];
}

export interface CourseItem {
    id: number;
    uuid: string;
    title: string;
    slug: string;
    status: 'draft' | 'published' | 'unpublished';
    cover_type: 'image' | 'video' | null;
    cover_video_url: string | null;
    description: string | null;
    pricing_type: PricingType;
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    button_text: string | null;
    theme: string | null;
    accent_color: string | null;
    post_purchase_message: string | null;
    terms_and_conditions: string | null;
    refund_policy: string | null;
    privacy_policy: string | null;
    fb_pixel_id: string | null;
    ga_tracking_id: string | null;
    course_detail: CourseDetail | null;
    courseDetail?: CourseDetail | null;
    cover_images: { id: number; image_path: string }[];
    coverImages?: { id: number; image_path: string }[];
    coupons: Coupon[];
    checkout_questions: CheckoutQuestion[];
    checkoutQuestions?: CheckoutQuestion[];
}
/** Everything the main "Save draft" button sends to PUT /dashboard/courses/{uuid}. */
export interface FormState {
    title: string;
    slug: string;
    description: string;
    cover_video_url: string;
    pricing_type: PricingType;
    price: string;
    has_discount: boolean;
    discounted_price: string;
    button_text: string;
    theme: ThemeKey;
    accent_color: string;
    post_purchase_message: string;
    terms_and_conditions: string;
    refund_policy: string;
    privacy_policy: string;
    fb_pixel_id: string;
    ga_tracking_id: string;
    access_type: 'lifetime' | 'days';
    access_days: string;
    certificate_enabled: boolean;
}

export const DEFAULT_ACCENT = '#4F46E5';
export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const numStr = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '' : String(Number(v)));

/**
 * Laravel serialises relations with the *method* name (courseDetail, coverImages …),
 * so the edit payload uses camelCase keys. Everything else stays snake_case.
 * This merges both spellings so the editor works no matter which key arrives.
 */
export function normalizeItem(raw: CourseItem): CourseItem {
    const r = raw as unknown as Record<string, unknown>;
    const detailRaw = (r.course_detail ?? r.courseDetail ?? null) as Record<string, unknown> | null;
    let detail: CourseDetail | null = null;
    if (detailRaw) {
        const d = detailRaw as Record<string, unknown>;
        detail = {
            ...(detailRaw as object),
            gallery_items: (d.gallery_items ?? d.galleryItems ?? []) as GalleryRow[],
            live_classes: (d.live_classes ?? d.liveClasses ?? []) as LiveClass[],
        } as CourseDetail;
    }
    return {
        ...raw,
        course_detail: detail,
        cover_images: (r.cover_images ?? r.coverImages ?? []) as CourseItem['cover_images'],
        checkout_questions: (r.checkout_questions ?? r.checkoutQuestions ?? []) as CheckoutQuestion[],
    };
}

export function toFormState(item: CourseItem): FormState {
    const detail = normalizeItem(item).course_detail;
    return {
        title: item.title ?? '',
        slug: item.slug ?? '',
        description: item.description ?? '',
        cover_video_url: item.cover_video_url ?? '',
        pricing_type: item.pricing_type ?? 'fixed',
        price: numStr(item.price),
        has_discount: Boolean(item.has_discount),
        discounted_price: numStr(item.discounted_price),
        button_text: item.button_text ?? '',
        theme: (['default', 'light', 'dark'].includes(item.theme ?? '') ? item.theme : 'default') as ThemeKey,
        accent_color: HEX_RE.test(item.accent_color ?? '') ? (item.accent_color as string) : DEFAULT_ACCENT,
        post_purchase_message: item.post_purchase_message ?? '',
        terms_and_conditions: item.terms_and_conditions ?? '',
        refund_policy: item.refund_policy ?? '',
        privacy_policy: item.privacy_policy ?? '',
        fb_pixel_id: item.fb_pixel_id ?? '',
        ga_tracking_id: item.ga_tracking_id ?? '',
        access_type: detail?.access_type ?? 'lifetime',
        access_days: detail?.access_days ? String(detail.access_days) : '',
        certificate_enabled: Boolean(detail?.certificate_enabled),
    };
}

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Payload for the controller's validation rules (commonRules + detailRules). */
export function formPayload(f: FormState): Record<string, unknown> {
    const free = f.pricing_type === 'free';
    return {
        title: f.title.trim(),
        slug: f.slug.trim(),
        description: orNull(f.description.replace(/^<p><br><\/p>$/, '')),
        cover_type: f.cover_video_url.trim() ? 'video' : 'image',
        cover_video_url: orNull(f.cover_video_url),
        pricing_type: f.pricing_type,
        price: free ? 0 : Number(f.price) || 0,
        has_discount: free ? false : f.has_discount,
        discounted_price: free || !f.has_discount ? null : Number(f.discounted_price) || 0,
        button_text: f.button_text.trim(),
        theme: f.theme,
        accent_color: f.accent_color,
        post_purchase_message: orNull(f.post_purchase_message),
        terms_and_conditions: orNull(f.terms_and_conditions),
        refund_policy: orNull(f.refund_policy),
        privacy_policy: orNull(f.privacy_policy),
        fb_pixel_id: orNull(f.fb_pixel_id),
        ga_tracking_id: orNull(f.ga_tracking_id),
        access_type: f.access_type,
        access_days: f.access_type === 'days' ? Number(f.access_days) || null : null,
        certificate_enabled: f.certificate_enabled,
    };
}

export const LESSON_TYPES: { key: LessonType; label: string; hint: string }[] = [
    { key: 'video', label: 'Video', hint: 'Engage learners with engaging and impactful video lessons.' },
    { key: 'text_image', label: 'Text & Images', hint: 'A reading lesson presented with text and images.' },
    { key: 'audio', label: 'Audio', hint: 'Teach concepts seamlessly with audio-based storytelling.' },
    { key: 'quiz', label: 'Quiz', hint: 'Test knowledge with auto-graded quiz questions.' },
    { key: 'assignment', label: 'Assignment', hint: 'Encourage deeper learning with mentor-graded assignments.' },
    { key: 'notes_pdf', label: 'Notes / PDF', hint: 'Share notes learners read in-app. You choose if they can download.' },
];

export const SECTION_LABELS: Record<SectionType, string> = {
    instructions: 'Course instructions',
    benefits: 'Course benefits',
    gallery: 'Gallery',
    faqs: 'FAQ',
    testimonials: 'Testimonials',
    highlights: 'Course highlights',
};
