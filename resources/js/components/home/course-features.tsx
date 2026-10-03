import { Link } from '@inertiajs/react';
import { ArrowRight, Award, Check, ClipboardList, Layers, type LucideIcon, ShoppingCart, Users, Video } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './primitives';
import { PRODUCT_DETAILS } from './product-details';
import { productUrl } from './products';

/*
 * Homepage ka "product" section — sirf online course, poori detail ke saath. Content wahi jo /products/courses
 * page pe hai (product-details.ts), taaki dono jagah ek hi baat likhi rahe.
 */

const course = PRODUCT_DETAILS.course;

// capabilities ke kram me (product-details.ts) — har card ka icon
const ICONS: LucideIcon[] = [Layers, Video, Users, ClipboardList, ShoppingCart, Award];

export function CourseFeatures() {
    return (
        <section id="course-features" className="scroll-mt-20 bg-white py-20 sm:py-28">
            <Container>
                <SectionHeading
                    eyebrow="Online courses"
                    title={
                        <>
                            Everything your course needs, <span className="text-blue-600">built in</span>
                        </>
                    }
                    description={course.subheadline}
                />

                <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {course.capabilities.map((group, i) => {
                        const Icon = ICONS[i] ?? Layers;
                        const featured = i === 0;

                        return (
                            <Reveal key={group.title} delay={(i % 3) * 90}>
                                <div
                                    className={`flex h-full flex-col rounded-3xl p-6 transition duration-300 hover:-translate-y-1 sm:p-7 ${
                                        featured
                                            ? 'bg-linear-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-700/30'
                                            : 'bg-white ring-1 ring-slate-200/80 hover:shadow-xl hover:shadow-blue-900/5 hover:ring-blue-200'
                                    }`}
                                >
                                    <span className={`grid size-12 place-items-center rounded-2xl ${featured ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                        <Icon className="size-6" />
                                    </span>
                                    <h3 className={`mt-5 text-lg font-semibold tracking-tight ${featured ? 'text-white' : 'text-slate-900'}`}>{group.title}</h3>
                                    <ul className="mt-4 space-y-2.5">
                                        {group.items.map((item) => (
                                            <li key={item} className={`flex items-start gap-2.5 text-sm ${featured ? 'text-blue-50' : 'text-slate-600'}`}>
                                                <Check className={`mt-0.5 size-4 shrink-0 ${featured ? 'text-sky-200' : 'text-blue-600'}`} />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>

                {/* kaun kaun se course bante hain */}
                <Reveal className="mt-16">
                    <h3 className="text-center text-sm font-semibold tracking-wider text-slate-500 uppercase">What creators teach here</h3>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {course.useCases.map((u) => (
                            <div key={u.title} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70">
                                <p className="font-semibold text-slate-900">{u.title}</p>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{u.body}</p>
                            </div>
                        ))}
                    </div>
                </Reveal>

                <Reveal className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <a
                        href="#course-workflow"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700"
                    >
                        See how a course works <ArrowRight className="size-4" />
                    </a>
                    <Link href={productUrl('course')} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50">
                        Full course feature list
                    </Link>
                </Reveal>
            </Container>
        </section>
    );
}
