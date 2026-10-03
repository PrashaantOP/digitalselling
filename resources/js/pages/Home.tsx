import { CourseFeatures } from '@/components/home/course-features';
import { CourseWorkflow } from '@/components/home/course-workflow';
import { CtaBand } from '@/components/home/cta-band';
import { EarningsCalculator } from '@/components/home/earnings-calculator';
import { Faq } from '@/components/home/faq';
import { GrowthTools } from '@/components/home/growth-tools';
import { Hero } from '@/components/home/hero';
import { HomeShell } from '@/components/home/home-shell';
import { Pricing } from '@/components/home/pricing';
import { SecurePayments } from '@/components/home/secure-payments';
import { type HomePlan, type HomeStats } from '@/components/home/types';

type Props = { stats: HomeStats; plans: HomePlan[]; trialDays: number };

export default function Home({ stats, plans, trialDays }: Props) {
    return (
        <HomeShell
            title="Create and sell online courses"
            description={`DigitalSelling is the course platform for Indian creators — video lessons, live classes, quizzes, assignments and certificates in one place. Start with ${trialDays} days of Pro free — secure payments by Razorpay.`}
        >
            <Hero stats={stats} trialDays={trialDays} />
            <CourseFeatures />
            <CourseWorkflow />
            <GrowthTools />
            <SecurePayments />
            <EarningsCalculator plans={plans} trialDays={trialDays} />
            <Pricing plans={plans} trialDays={trialDays} />
            <Faq trialDays={trialDays} />
            <CtaBand />
        </HomeShell>
    );
}
