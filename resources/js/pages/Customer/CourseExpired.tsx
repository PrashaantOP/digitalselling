import { PRIMARY } from '@/components/customer/code-input';
import CustomerLayout from '@/layouts/customer-layout';
import { Link } from '@inertiajs/react';
import { Hourglass } from 'lucide-react';

export default function CourseExpired({ title, expiredAt, buyUrl }: { title: string; expiredAt: string; buyUrl: string }) {
    return (
        <CustomerLayout title={title}>
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-xl bg-white px-6 py-12 text-center shadow-sm">
                <span className="flex size-12 items-center justify-center rounded-xl bg-[#FFF4DB] text-[#B46E00]">
                    <Hourglass className="size-6" />
                </span>
                <h1 className="text-lg font-bold">Your access to this course has ended</h1>
                <p className="text-sm text-[#6B6B78]">
                    <span className="font-semibold text-[#14141B]">{title}</span> was available till{' '}
                    {new Date(expiredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Your progress is saved — buy it again to continue from where you stopped.
                </p>
                <a href={buyUrl} className={`${PRIMARY} mt-2`}>
                    Buy again
                </a>
                <Link href="/me/courses" className="text-sm font-medium text-[#6B6B78] hover:text-[#14141B]">
                    Back to my courses
                </Link>
            </div>
        </CustomerLayout>
    );
}
