import { CourseWorkflow } from '@/components/home/course-workflow';
import { CtaBand } from '@/components/home/cta-band';
import { EarningsCalculator } from '@/components/home/earnings-calculator';
import { Faq } from '@/components/home/faq';
import { GrowthTools } from '@/components/home/growth-tools';
import { Hero } from '@/components/home/hero';
import { HomeShell } from '@/components/home/home-shell';
import { Pricing } from '@/components/home/pricing';
import { ProductGrid } from '@/components/home/product-grid';
import { ProductWorkflows } from '@/components/home/product-workflows';
import { SecurePayments } from '@/components/home/secure-payments';
import { type HomePlan, type HomeStats } from '@/components/home/types';

type Props = { stats: HomeStats; plans: HomePlan[]; trialDays: number };

export default function Home({ stats, plans, trialDays }: Props) {
    return (
        <HomeShell
            title="Sell courses, eBooks, events & 1:1 sessions"
            description={`DigitalSelling is the all-in-one platform for Indian creators to sell online courses, live classes, eBooks, events, locked content and 1:1 sessions. Start with ${trialDays} days of Pro free — secure payments by Razorpay.`}
        >
            <Hero stats={stats} trialDays={trialDays} />
            <ProductGrid />
            <CourseWorkflow />
            <ProductWorkflows />
            <GrowthTools />
            <SecurePayments />
            <EarningsCalculator plans={plans} trialDays={trialDays} />
            <Pricing plans={plans} trialDays={trialDays} />
            <Faq trialDays={trialDays} />
            <CtaBand />
        </HomeShell>
    );
}
