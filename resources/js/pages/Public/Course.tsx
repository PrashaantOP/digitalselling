import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Award, BookOpen, Check, ChevronDown, ClipboardCheck, Clock, FileText, Headphones, Link2, ListChecks, Lock, Video, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type CheckoutQuestion = {
    id: number;
    label: string;
    field_type: 'text' | 'phone' | 'email' | 'number' | 'dropdown';
    options: string[] | null;
    is_required: boolean;
    is_enabled: boolean;
};

type Product = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_type: 'image' | 'video' | null;
    cover_video_url: string | null;
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    button_text: string | null;
    theme: string | null;
    accent_color: string | null;
    terms_and_conditions: string | null;
    refund_policy: string | null;
    privacy_policy: string | null;
    cover_images: string[];
    checkout_questions: CheckoutQuestion[];
    course: CourseData;
};

type CourseData = {
    access_type: 'lifetime' | 'days';
    access_days: number | null;
    certificate_enabled: boolean;
    total_lessons: number;
    modules: { id: number; title: string; lessons: { id: number; title: string; type: string; is_free_preview: boolean }[] }[];
    instructions: string[];
    benefits: string[];
    highlights: string[];
    faqs: { question: string; answer: string }[];
    testimonials: { name: string; message: string; avatar_path: string | null }[];
    gallery: string[];
    live_classes: { title: string; description: string | null; scheduled_at: string; duration_minutes: number }[];
};

type Props = { product: Product; creator: { name: string; username: string; avatar: string | null }; checkoutUrl: string };

const money = (value: string | number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
const asset = (path: string | null) => (path ? `/assets/${path}` : '');
const INPUT = 'h-11 w-full rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';

const LESSON_ICONS: Record<string, LucideIcon> = {
    video: Video,
    text_image: BookOpen,
    audio: Headphones,
    quiz: ListChecks,
    assignment: ClipboardCheck,
    notes_pdf: FileText,
};

const cookie = (key: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))?.[1] ?? '');

export default function Course({ product, creator, checkoutUrl }: Props) {
    const appName = usePage<SharedData>().props.name;
    const course = product.course;
    const accent = /^#[0-9A-Fa-f]{6}$/.test(product.accent_color ?? '') ? product.accent_color! : '#4F46E5';
    const cover = product.cover_images?.[0];
    const modules = (course.modules ?? []).map((module) => ({ ...module, lessons: (module.lessons ?? []).filter((lesson) => lesson.title) }));
    const lessonCount = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const price = product.pricing_type === 'free' ? 'Free' : product.pricing_type === 'customer_decides' ? 'Pay what you want' : money(product.has_discount && product.discounted_price ? product.discounted_price : product.price);
    const accessText = course.access_type === 'days' ? `${course.access_days ?? 0} days access` : 'Lifetime access';
    const descriptionText = product.description?.trim() || '<p>Tell learners what they will gain from this course, what they will miss if they don\'t enroll, and why now is the right time to join.</p>';

    // Email aur phone hamesha dikhte hain — creator inhe editor se band nahi kar sakta.
    // GSTIN/State ke apne top-level fields hain (OrderController inhe alag maangta hai), par
    // dikhna ya na dikhna Checkout experience ke toggle se decide hota hai — controller
    // sirf is_enabled=true wale questions bhejta hai, to yahan mil gaye matlab on hain.
    const gstinQuestion = product.checkout_questions.find((q) => /gstin/i.test(q.label));
    const stateQuestion = product.checkout_questions.find((q) => q.field_type === 'dropdown' && /state/i.test(q.label));
    const customQuestions = product.checkout_questions.filter(
        (q) => q !== stateQuestion && q !== gstinQuestion && !['email', 'phone'].includes(q.field_type),
    );

    const [fields, setFields] = useState({ name: '', email: '', phone: '', gstin: '', state: '' });
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const set = (key: keyof typeof fields, value: string) => setFields((f) => ({ ...f, [key]: value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(checkoutUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') },
                body: JSON.stringify({ ...fields, answers }),
            });
            const data = await response.json().catch(() => null);

            setError(response.ok ? 'Payment is not available yet. Please try again later.' : (data?.message ?? 'Could not start checkout. Please check your details.'));
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    async function copyLink() {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const label = (text: string) => (
        <h3 className="mb-3 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {text}
        </h3>
    );

    const policies = ([
        ['Terms & conditions', product.terms_and_conditions],
        ['Refund policy', product.refund_policy],
        ['Privacy policy', product.privacy_policy],
    ] as const).filter(([, body]) => body?.trim());

    return (
        <>
            <Head title={product.title} />
            <main className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#14141B]">
                <div className="h-1" style={{ backgroundColor: accent }} />
                <header>
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
                        <Link href={`/${creator.username}`} className="flex min-w-0 items-center gap-2.5 transition hover:opacity-70">
                            {creator.avatar ? (
                                <img src={asset(creator.avatar)} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                            ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E4E2DA] text-xs font-bold text-[#4B4B57]">
                                    {(creator.name || creator.username || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                            <span className="truncate text-sm font-bold">{creator.name || creator.username}</span>
                        </Link>
                        <span className="shrink-0 text-xs text-[#6B6B78]">
                            Built with <span aria-hidden="true">♥</span> on <span className="font-semibold text-[#14141B]">{appName}</span>
                        </span>
                    </div>
                </header>

                <section className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
                    <div className="flex min-w-0 flex-col gap-8">
                        <h1 className="text-3xl font-extrabold tracking-tight break-words md:text-5xl">{product.title}</h1>

                        {(cover || product.cover_video_url) && (
                            <div className="overflow-hidden rounded-xl border border-[#E4E2DA] bg-white">
                                {product.cover_video_url ? (
                                    <div className="flex aspect-video items-center justify-center gap-2 text-sm" style={{ background: '#F6F5F2', color: '#6B6B78' }}>
                                        <Video className="size-5" style={{ color: accent }} />
                                        <span className="max-w-[70%] truncate">{product.cover_video_url}</span>
                                    </div>
                                ) : (
                                    <img src={asset(cover)} alt="" className="aspect-video w-full object-cover" />
                                )}
                            </div>
                        )}

                        <div>
                            {label('About the course')}
                            <div className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: descriptionText }} />
                        </div>

                        {course.highlights.length > 0 && (
                            <div>
                                {label('Highlights')}
                                <div className="flex flex-wrap gap-2">
                                    {course.highlights.map((item, i) => (
                                        <span key={i} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${accent}1A`, color: accent }}>
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(course.benefits.length > 0 || course.certificate_enabled) && (
                            <div>
                                {label('What you get')}
                                <ul className="flex flex-col gap-2.5">
                                    {course.benefits.map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[15px] text-[#14141B]">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                                                <Check className="size-3" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                    {course.certificate_enabled && (
                                        <li className="flex items-center gap-3 text-[15px] text-[#14141B]">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                                                <Award className="size-3" />
                                            </span>
                                            Certificate of completion
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div>
                            {label('Course content')}
                            {modules.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-[#E4E2DA] p-4 text-sm text-[#6B6B78]">
                                    No published lessons yet — publish at least one lesson to show your syllabus.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {modules.map((module, index) => (
                                        <div key={module.id} className="overflow-hidden rounded-xl border border-[#E4E2DA] bg-white">
                                            <div className="border-b border-[#E4E2DA] px-4 py-3 text-sm font-bold text-[#14141B]">
                                                Module {index + 1}: {module.title}
                                            </div>
                                            {module.lessons.map((lesson) => {
                                                const Icon = LESSON_ICONS[lesson.type] ?? FileText;
                                                return (
                                                    <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#14141B]">
                                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: '#FAF9F5', color: '#6B6B78' }}>
                                                            <Icon className="size-3" />
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                                                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase" style={{ border: '1px solid #E4E2DA', color: lesson.is_free_preview ? accent : '#8A8A96' }}>
                                                            {lesson.is_free_preview ? 'Free preview' : (
                                                                <>
                                                                    <Lock className="size-2.5" /> Locked
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {course.live_classes.length > 0 && (
                            <div>
                                {label('Live classes')}
                                <div className="flex flex-col gap-2">
                                    {course.live_classes.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-xl border border-[#E4E2DA] bg-white px-4 py-3 text-sm text-[#14141B]">
                                            <Video className="size-4 shrink-0" style={{ color: accent }} />
                                            <span className="min-w-0 flex-1 truncate font-semibold">{item.title}</span>
                                            <span className="text-xs text-[#6B6B78]">
                                                {new Date(item.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {course.instructions.length > 0 && (
                            <div>
                                {label('Instructions')}
                                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-[#14141B]">
                                    {course.instructions.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {course.gallery.length > 0 && (
                            <div>
                                {label('Gallery')}
                                <div className="grid gap-2 md:grid-cols-3">
                                    {course.gallery.map((item, i) => (
                                        <img key={i} src={asset(item)} alt="" className="aspect-square w-full rounded-lg object-cover" />
                                    ))}
                                </div>
                            </div>
                        )}

                        {course.testimonials.length > 0 && (
                            <div>
                                {label('Testimonials')}
                                <div className="flex flex-col gap-3">
                                    {course.testimonials.map((item, i) => (
                                        <div key={i} className="rounded-xl border border-[#E4E2DA] bg-white p-4">
                                            <p className="text-sm text-[#14141B]">“{item.message}”</p>
                                            <p className="mt-2 text-xs font-bold text-[#6B6B78]">— {item.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {course.faqs.length > 0 && (
                            <div>
                                {label('FAQ')}
                                <div className="flex flex-col gap-2">
                                    {course.faqs.map((item, i) => (
                                        <details key={i} className="group rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#14141B]">
                                                {item.question}
                                                <ChevronDown className="size-4 shrink-0 text-[#6B6B78] transition group-open:rotate-180" />
                                            </summary>
                                            {item.answer && <p className="mt-1.5 text-sm text-[#6B6B78]">{item.answer}</p>}
                                        </details>
                                    ))}
                                </div>
                            </div>
                        )}

                        {policies.length > 0 && (
                            <div>
                                {label('Policies')}
                                <div className="flex flex-col gap-2">
                                    {policies.map(([title, body]) => (
                                        <details key={title} className="group rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#14141B]">
                                                {title}
                                                <ChevronDown className="size-4 shrink-0 text-[#6B6B78] transition group-open:rotate-180" />
                                            </summary>
                                            <p className="mt-1.5 text-sm whitespace-pre-line text-[#6B6B78]">{body}</p>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="h-fit rounded-2xl border border-[#E4E2DA] bg-white p-5 shadow-sm lg:sticky lg:top-6">
                        <div className="flex items-center gap-2.5 text-sm text-[#6B6B78]">
                            <Video className="size-4" /> {lessonCount} {lessonCount === 1 ? 'in-depth lesson' : 'in-depth lessons'}
                        </div>
                        <div className="mt-2 flex items-center gap-2.5 text-sm text-[#6B6B78]">
                            <Clock className="size-4" /> {accessText}
                        </div>
                        {course.certificate_enabled && (
                            <div className="mt-2 flex items-center gap-2.5 text-sm text-[#6B6B78]">
                                <Award className="size-4" /> Certificate included
                            </div>
                        )}

                        <p className="mt-6 text-3xl font-extrabold text-[#14141B]">{price}</p>
                        <p className="mt-2 text-xs text-[#6B6B78]">Access to this purchase will be sent to this email</p>

                        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                            <input value={fields.name} onChange={(e) => set('name', e.target.value)} required maxLength={150} placeholder="Full name" className={INPUT} />
                            <input type="email" value={fields.email} onChange={(e) => set('email', e.target.value)} required maxLength={150} placeholder="Email address" className={INPUT} />
                            <div className="flex h-11 items-center rounded-lg border border-[#DAD8D0] bg-white pl-3 transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                                <span className="border-r border-[#E4E2DA] pr-2 text-sm text-[#6B6B78]">+91</span>
                                <input type="tel" value={fields.phone} onChange={(e) => set('phone', e.target.value)} required pattern="[0-9]{8,15}" placeholder="Phone number" className="h-full min-w-0 flex-1 rounded-r-lg px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]" />
                            </div>
                            {gstinQuestion && (
                                <input
                                    value={fields.gstin}
                                    onChange={(e) => set('gstin', e.target.value)}
                                    required={gstinQuestion.is_required}
                                    maxLength={20}
                                    placeholder={`${gstinQuestion.label}${gstinQuestion.is_required ? '' : ' (optional)'}`}
                                    className={INPUT}
                                />
                            )}

                            {stateQuestion && (
                                <select value={fields.state} onChange={(e) => set('state', e.target.value)} required={stateQuestion.is_required} className={INPUT}>
                                    <option value="">Select state</option>
                                    {(stateQuestion.options ?? []).map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            )}

                            {customQuestions.map((question) => (
                                question.field_type === 'dropdown' ? (
                                    <select
                                        key={question.id}
                                        value={answers[question.id] ?? ''}
                                        onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                                        required={question.is_required}
                                        className={INPUT}
                                    >
                                        <option value="">{question.label}{question.is_required ? '' : ' (optional)'}</option>
                                        {(question.options ?? []).map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        key={question.id}
                                        type={question.field_type === 'number' ? 'number' : 'text'}
                                        value={answers[question.id] ?? ''}
                                        onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                                        required={question.is_required}
                                        placeholder={`${question.label}${question.is_required ? '' : ' (optional)'}`}
                                        className={INPUT}
                                    />
                                )
                            ))}

                            {error && <p role="alert" className="rounded-lg bg-[#FFEDE8] px-3 py-2 text-xs font-medium text-[#C2410C]">{error}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-12 w-full items-center justify-between gap-2 rounded-xl px-4 text-sm font-bold tracking-wide text-white uppercase disabled:opacity-60"
                                style={{ backgroundColor: accent }}
                            >
                                <span className="truncate">{submitting ? 'Please wait…' : product.button_text || 'Enroll now'}</span>
                                {product.pricing_type !== 'customer_decides' && (
                                    <span className="flex shrink-0 items-center gap-1">
                                        {price} <ArrowRight className="size-4" />
                                    </span>
                                )}
                            </button>
                        </form>

                        <p className="mt-3 text-center text-[11px] text-[#8A8A96]">Secure payment via Razorpay · no account needed</p>

                        <button
                            type="button"
                            onClick={copyLink}
                            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E4E2DA] text-xs font-semibold text-[#4B4B57] transition hover:bg-[#FAF9F5]"
                        >
                            <Link2 className="size-3.5" /> {copied ? 'Link copied' : 'Copy link — invite your network'}
                        </button>
                    </aside>
                </section>

                <footer className="py-5 text-center text-xs text-[#6B6B78]">
                    Built with <span className="font-semibold text-[#14141B]">{appName}</span>
                </footer>
            </main>
        </>
    );
}
