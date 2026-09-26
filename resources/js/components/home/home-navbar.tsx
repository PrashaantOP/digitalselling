import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Container, Logo, primaryBtn } from './primitives';

// "/#id" — home pe same-page scroll, legal pages se home pe wapas le jaata hai
export const NAV_LINKS = [
    { label: 'Products', href: '/#products' },
    { label: 'How it works', href: '/#course-workflow' },
    { label: 'Features', href: '/#growth' },
    { label: 'Calculator', href: '/#calculator' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'FAQ', href: '/#faq' },
];

export function HomeNavbar() {
    const { auth } = usePage<SharedData>().props;
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={cn(
                'sticky top-0 z-40 transition-all duration-300',
                scrolled
                    ? 'border-b border-blue-100/80 bg-white/80 shadow-[0_8px_30px_-12px_rgba(30,64,175,0.18)] backdrop-blur-xl'
                    : 'bg-transparent',
            )}
        >
            <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
                <Link href="/" aria-label="DigitalSelling home">
                    <Logo />
                </Link>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
                    {NAV_LINKS.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                        >
                            {l.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    {auth.user ? (
                        <Link href={route('dashboard')} className={primaryBtn}>
                            Go to dashboard <ArrowRight className="size-4" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route('login')}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-blue-700"
                            >
                                Log in
                            </Link>
                            <Link href={route('register')} className={primaryBtn}>
                                Start selling free <ArrowRight className="size-4" />
                            </Link>
                        </>
                    )}
                </div>

                <Sheet>
                    <SheetTrigger
                        className="grid size-10 place-items-center rounded-xl text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 lg:hidden"
                        aria-label="Open menu"
                    >
                        <Menu className="size-5" />
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85%] max-w-sm border-l-blue-100 bg-white p-6">
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                        <Logo />
                        <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                            {NAV_LINKS.map((l) => (
                                <SheetClose asChild key={l.href}>
                                    <a
                                        href={l.href}
                                        className="rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                                    >
                                        {l.label}
                                    </a>
                                </SheetClose>
                            ))}
                        </nav>
                        <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-6">
                            {auth.user ? (
                                <Link href={route('dashboard')} className={primaryBtn}>
                                    Go to dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('register')} className={primaryBtn}>
                                        Start selling free
                                    </Link>
                                    <Link
                                        href={route('login')}
                                        className="rounded-xl py-3 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                                    >
                                        Log in
                                    </Link>
                                </>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </Container>
        </header>
    );
}
