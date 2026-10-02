import CustomerLayout from '@/layouts/customer-layout';
import { Link } from '@inertiajs/react';
import { Award, GraduationCap, PlayCircle } from 'lucide-react';
import { useState } from 'react';

interface CourseRow {
    uuid: string;
    title: string;
    creator: { name: string; username: string | null };
    cover: string | null;
    progress_percent: number;
    completed_at: string | null;
    access_expires_at: string | null;
    expired: boolean;
    /** course poora + certificate bana ho tabhi */
    certificate_uuid: string | null;
}

const date = (v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function MyCourses({ courses }: { courses: CourseRow[] }) {
    return (
        <CustomerLayout title="My courses">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My courses</h1>
                <p className="mt-1 text-sm text-[#8A8A96]">Pick up where you left off.</p>
            </div>

            {courses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#4F46E5]">
                        <GraduationCap className="size-6" />
                    </span>
                    <p className="text-sm font-semibold">No courses yet</p>
                    <p className="max-w-sm text-sm text-[#8A8A96]">
                        Courses you buy show up here. E-books, sessions and other purchases are under{' '}
                        <Link href="/me/purchases" className="font-semibold text-[#4F46E5] hover:underline">
                            Purchases
                        </Link>
                        .
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <CourseCard key={course.uuid} course={course} />
                    ))}
                </div>
            )}
        </CustomerLayout>
    );
}

function CourseCard({ course }: { course: CourseRow }) {
    const [broken, setBroken] = useState(false);
    const done = course.progress_percent >= 100;

    return (
        <div className="relative flex">
            <Link
                href={`/me/courses/${course.uuid}/learn`}
                className="group flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
            >
                <div className="relative aspect-video bg-[#EEF0FF]">
                    {course.cover && !broken ? (
                        <img
                            src={`/assets/${course.cover}`}
                            alt=""
                            loading="lazy"
                            onError={() => setBroken(true)}
                            className="absolute inset-0 size-full object-cover"
                        />
                    ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[#4F46E5]/40">
                            <GraduationCap className="size-10" />
                        </span>
                    )}
                    {course.expired && (
                        <span className="absolute top-2 left-2 rounded-full bg-[#14141B]/80 px-2 py-0.5 text-[11px] font-bold text-white">
                            Access ended
                        </span>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                        <p className="line-clamp-2 text-sm font-bold">{course.title}</p>
                        <p className="mt-0.5 text-xs text-[#8A8A96]">by {course.creator.name}</p>
                    </div>

                    <div className="mt-auto">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#4B4B57]">{done ? 'Completed' : `${course.progress_percent}% complete`}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0EFEA]">
                            <span
                                className="block h-full rounded-full bg-[#4F46E5]"
                                style={{ width: `${Math.min(100, course.progress_percent)}%` }}
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-[#8A8A96]">
                            <span>
                                {course.expired
                                    ? 'Buy again to continue'
                                    : course.access_expires_at
                                      ? `Access till ${date(course.access_expires_at)}`
                                      : 'Lifetime access'}
                            </span>
                            {!course.expired && (
                                <span className="flex items-center gap-1 font-semibold text-[#4F46E5]">
                                    <PlayCircle className="size-4" /> {course.progress_percent > 0 && !done ? 'Continue' : done ? 'Review' : 'Start'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
            {/* card khud ek link hai — certificate ka link uske bahar, cover ke upar */}
            {course.certificate_uuid && (
                <a
                    href={`/me/certificates/${course.certificate_uuid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#B46E00] shadow-sm ring-1 ring-black/5 transition hover:bg-[#FFF7E6]"
                >
                    <Award className="size-3.5" /> View certificate
                </a>
            )}
        </div>
    );
}
