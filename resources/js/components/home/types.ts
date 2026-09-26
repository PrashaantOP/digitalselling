export type HomeStats = {
    creators: number;
    products: number;
    courses: number;
    lessons: number;
    learners: number;
};

export type HomePlan = {
    id: number;
    name: string;
    slug: string;
    monthly_price: string;
    commission_rate: string;
    features: string[] | null;
};
