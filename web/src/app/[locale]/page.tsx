'use client';

import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { Post } from '@/entities/post';
import type { Product } from '@/entities/product';
import { getPosts } from '@/entities/post';
import { getProducts } from '@/entities/product';
import { Box } from '@/shared/ui/box';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { useToastActions } from '@/shared/hooks/useToast';
import { PostCard } from '@/widgets/posts-list';
import { ProductCard } from '@/widgets/product-card';
import {
    RocketIcon,
    ShieldIcon,
    CheckCircleIcon,
    ClockIcon,
    TrendingIcon,
    PostsIcon,
    ShoppingIcon,
    StarIcon,
    ReviewsIcon,
    MailIcon,
    SendIcon,
    BookIcon,
    QuestionIcon,
    UsersIcon,
    ChevronDownIcon,
    BullhornIcon,
    HandshakeIcon,
    GlobeIcon,
    ChevronRightIcon
} from '@/shared/ui/icons';

interface HighlightItem {
    key: string;
    icon: ReactElement;
    color: string;
}

interface StepItem {
    key: string;
    icon: ReactElement;
    color: string;
}

interface ListItem {
    key: string;
}

export default function Home() {
    const t = useTranslations('landing');
    const tAdminPosts = useTranslations('admin.posts');
    const tAdminProducts = useTranslations('admin.products');
    const tContact = useTranslations('contact');
    const { success, error: showError } = useToastActions();
    const locale = useLocale();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });
    const [landingPosts, setLandingPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [landingProducts, setLandingProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const postsFetchKeyRef = useRef<string | null>(null);
    const productsFetchKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const fetchKey = `${locale}-landing-posts`;
        if (postsFetchKeyRef.current === fetchKey) return;
        postsFetchKeyRef.current = fetchKey;

        setPostsLoading(true);
        void getPosts({ limit: 3, locale })
            .then((response) => {
                setLandingPosts(response.posts.slice(0, 3));
            })
            .catch((error) => {
                console.error('Error loading landing posts:', error);
                showError(tAdminPosts('loading'));
            })
            .finally(() => setPostsLoading(false));
    }, [locale, showError, tAdminPosts]);

    useEffect(() => {
        const fetchKey = `${locale}-landing-products`;
        if (productsFetchKeyRef.current === fetchKey) return;
        productsFetchKeyRef.current = fetchKey;

        setProductsLoading(true);
        void getProducts({ limit: 3 })
            .then((response) => {
                setLandingProducts(response.products.slice(0, 3));
            })
            .catch((error) => {
                console.error('Error loading landing products:', error);
                showError(tAdminProducts('loading'));
            })
            .finally(() => setProductsLoading(false));
    }, [locale, showError, tAdminProducts]);

    const heroHighlights: Array<HighlightItem & { label: string; value: string }> = useMemo(
        () =>
            [
                {
                    key: 'uptime',
                    icon: <ShieldIcon size={18} />,
                    color: 'bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                },
                {
                    key: 'response',
                    icon: <ClockIcon size={18} />,
                    color: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                },
                {
                    key: 'coverage',
                    icon: <GlobeIcon size={18} />,
                    color: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
                },
            ].map((item) => ({
                ...item,
                label: t(`hero.stats.${item.key}.label`),
                value: t(`hero.stats.${item.key}.value`),
            })),
        [t]
    );

    const heroPoints = useMemo(
        () => [0, 1, 2].map((index) => t(`hero.points.${index}`)),
        [t]
    );

    const steps: Array<StepItem & { title: string; description: string; badge: string }> = useMemo(
        () =>
            [
                {
                    key: 'discover',
                    icon: <BookIcon size={18} />,
                    color: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                },
                {
                    key: 'decide',
                    icon: <TrendingIcon size={18} />,
                    color: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                },
                {
                    key: 'act',
                    icon: <CheckCircleIcon size={18} />,
                    color: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                },
            ].map((step) => ({
                ...step,
                title: t(`howItWorks.steps.${step.key}.title`),
                description: t(`howItWorks.steps.${step.key}.description`),
                badge: t(`howItWorks.steps.${step.key}.badge`),
            })),
        [t]
    );

    const advantages: Array<ListItem & { title: string; description: string; icon: ReactElement; color: string }> =
        useMemo(
            () =>
                [
                    {
                        key: 'performance',
                        icon: <RocketIcon size={18} />,
                        color: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
                    },
                    {
                        key: 'design',
                        icon: <ShieldIcon size={18} />,
                        color: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
                    },
                    {
                        key: 'automation',
                        icon: <BullhornIcon size={18} />,
                        color: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                    },
                    {
                        key: 'support',
                        icon: <HandshakeIcon size={18} />,
                        color: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
                    },
                ].map((item) => ({
                    ...item,
                    title: t(`advantages.items.${item.key}.title`),
                    description: t(`advantages.items.${item.key}.description`),
                })),
            [t]
        );

    const reviews: Array<ListItem & { name: string; text: string }> = useMemo(
        () =>
            ['first', 'second', 'third'].map((key) => ({
                key,
                name: t(`reviews.items.${key}.name`),
                text: t(`reviews.items.${key}.text`),
            })),
        [t]
    );

    const faqs: Array<ListItem & { question: string; answer: string }> = useMemo(
        () =>
            ['coverage', 'deployment', 'integrations', 'analytics'].map((key) => ({
                key,
                question: t(`faq.items.${key}.question`),
                answer: t(`faq.items.${key}.answer`),
            })),
        [t]
    );

    const ratingScore = useMemo(() => Number(t('reviews.score')), [t]);
    const ratingCount = useMemo(() => t('reviews.total'), [t]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            return;
        }

        success(t('contact.success'));
        setFormData({
            name: '',
            email: '',
            message: '',
        });
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-10 space-y-14">
                <HeroSection t={t} heroPoints={heroPoints} heroHighlights={heroHighlights} />

                <HowItWorksSection t={t} steps={steps} />

                <PostsSection
                    t={t}
                    tAdminPosts={tAdminPosts}
                    postsLoading={postsLoading}
                    landingPosts={landingPosts}
                />

                <ProductsSection
                    t={t}
                    tAdminProducts={tAdminProducts}
                    productsLoading={productsLoading}
                    landingProducts={landingProducts}
                />

                <AdvantagesSection t={t} advantages={advantages} />

                <ReviewsSection t={t} ratingScore={ratingScore} ratingCount={ratingCount} reviews={reviews} />

                <ContactSection
                    t={t}
                    tContact={tContact}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                />

                <AboutSection t={t} />

                <FaqSection t={t} faqs={faqs} />
            </div>
        </div>
    );
}

type TFunction = ReturnType<typeof useTranslations>;

type ContactFormData = {
    name: string;
    email: string;
    message: string;
};

function HeroSection({
    t,
    heroPoints,
    heroHighlights,
}: {
    t: TFunction;
    heroPoints: string[];
    heroHighlights: Array<HighlightItem & { label: string; value: string }>;
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<RocketIcon size={24} />}
                iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                title={t('hero.title')}
                description={t('hero.subtitle')}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <IconButton asChild variant="success" icon={<RocketIcon size={16} />} responsive>
                            <Link href="/catalog">{t('hero.primaryCta')}</Link>
                        </IconButton>
                        <IconButton asChild variant="outline" icon={<BookIcon size={16} />} responsive>
                            <Link href="/posts">{t('hero.secondaryCta')}</Link>
                        </IconButton>
                    </div>
                }
            />
            <Box className="bg-gradient-to-br from-primary/10 via-background to-background">
                <div className="grid lg:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-[0.75rem] bg-green-500/15 text-green-700 dark:text-green-300 dark:bg-green-500/20 px-3 py-1 text-xs font-semibold w-fit">
                            <CheckCircleIcon size={14} />
                            {t('hero.badge')}
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground">
                                {t('hero.heading')}
                            </h2>
                            <p className="text-muted-foreground text-base sm:text-lg">{t('hero.body')}</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {heroPoints.map((bullet) => (
                                <div
                                    key={bullet}
                                    className="flex items-start gap-3 rounded-[1rem] bg-muted/50 p-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                                >
                                    <div className="w-10 h-10 rounded-[0.75rem] bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                        <ChevronRightIcon size={14} />
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed">{bullet}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Box
                            variant="muted"
                            className="space-y-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-[0.75rem] bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
                                        <BullhornIcon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('hero.snapshot.title')}</p>
                                        <p className="text-lg font-semibold text-foreground">
                                            {t('hero.snapshot.value')}
                                        </p>
                                    </div>
                                </div>
                                <IconButton
                                    asChild
                                    variant="ghost"
                                    size="sm"
                                    icon={<TrendingIcon size={14} />}
                                    responsive
                                >
                                    <Link href="/hub">{t('hero.snapshot.cta')}</Link>
                                </IconButton>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {heroHighlights.map((item) => (
                                    <div
                                        key={item.key}
                                        className="rounded-[1rem] bg-background/80 p-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] space-y-2"
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-[0.75rem] flex items-center justify-center ${item.color}`}
                                        >
                                            {item.icon}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{item.label}</p>
                                        <p className="text-lg font-semibold text-foreground">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </Box>
                    </div>
                </div>
            </Box>
        </section>
    );
}

function HowItWorksSection({
    t,
    steps,
}: {
    t: TFunction;
    steps: Array<StepItem & { title: string; description: string; badge: string }>;
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<BookIcon size={24} />}
                iconClassName="bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                title={t('howItWorks.title')}
                description={t('howItWorks.description')}
                actions={
                    <IconButton asChild variant="outline" icon={<ChevronRightIcon size={14} />} responsive>
                        <Link href="/space">{t('howItWorks.cta')}</Link>
                    </IconButton>
                }
            />
            <div className="grid md:grid-cols-3 gap-4">
                {steps.map((step) => (
                    <Box
                        key={step.key}
                        variant="muted"
                        className="space-y-3 hover:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-10 h-10 rounded-[0.75rem] flex items-center justify-center ${step.color}`}
                            >
                                {step.icon}
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {step.badge}
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </Box>
                ))}
            </div>
        </section>
    );
}

function PostsSection({
    t,
    tAdminPosts,
    postsLoading,
    landingPosts,
}: {
    t: TFunction;
    tAdminPosts: TFunction;
    postsLoading: boolean;
    landingPosts: Post[];
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<PostsIcon size={24} />}
                iconClassName="bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                title={t('posts.title')}
                description={t('posts.description')}
                actions={
                    <IconButton asChild variant="outline" icon={<ChevronRightIcon size={14} />} responsive>
                        <Link href="/posts">{t('posts.viewAll')}</Link>
                    </IconButton>
                }
            />
            {postsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-64 rounded-[1rem] bg-muted animate-pulse" />
                    ))}
                </div>
            ) : landingPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {landingPosts.map((post, index) => (
                        <PostCard key={post.id} post={post} imageLoading={index === 0 ? 'eager' : 'lazy'} />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{tAdminPosts('empty')}</p>
            )}
        </section>
    );
}

function ProductsSection({
    t,
    tAdminProducts,
    productsLoading,
    landingProducts,
}: {
    t: TFunction;
    tAdminProducts: TFunction;
    productsLoading: boolean;
    landingProducts: Product[];
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<ShoppingIcon size={24} />}
                iconClassName="bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                title={t('products.title')}
                description={t('products.description')}
                actions={
                    <IconButton asChild variant="outline" icon={<ChevronRightIcon size={14} />} responsive>
                        <Link href="/catalog">{t('products.viewAll')}</Link>
                    </IconButton>
                }
            />
            {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-64 rounded-[1rem] bg-muted animate-pulse" />
                    ))}
                </div>
            ) : landingProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {landingProducts.map((product, index) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            imageLoading={index === 0 ? 'eager' : 'lazy'}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{tAdminProducts('empty')}</p>
            )}
        </section>
    );
}

function AdvantagesSection({
    t,
    advantages,
}: {
    t: TFunction;
    advantages: Array<ListItem & { title: string; description: string; icon: ReactElement; color: string }>;
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<ShieldIcon size={24} />}
                iconClassName="bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                title={t('advantages.title')}
                description={t('advantages.description')}
            />
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {advantages.map((advantage) => (
                    <Box
                        key={advantage.key}
                        variant="muted"
                        className="space-y-3 hover:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                    >
                        <div
                            className={`w-10 h-10 rounded-[0.75rem] flex items-center justify-center ${advantage.color}`}
                        >
                            {advantage.icon}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{advantage.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{advantage.description}</p>
                    </Box>
                ))}
            </div>
        </section>
    );
}

function ReviewsSection({
    t,
    ratingScore,
    ratingCount,
    reviews,
}: {
    t: TFunction;
    ratingScore: number;
    ratingCount: string;
    reviews: Array<ListItem & { name: string; text: string }>;
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<ReviewsIcon size={24} />}
                iconClassName="bg-pink-500/15 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400"
                title={t('reviews.title')}
                description={t('reviews.description')}
            />
            <div className="grid lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-1 space-y-3 rounded-[1rem] bg-muted/50 p-5 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[0.75rem] bg-pink-500/15 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 flex items-center justify-center">
                            <StarIcon size={18} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('reviews.highlight')}</p>
                            <p className="text-3xl font-bold text-foreground">{ratingScore.toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <StarIcon
                                key={index}
                                size={16}
                                className={index < Math.round(ratingScore) ? 'text-yellow-500' : 'text-muted-foreground'}
                            />
                        ))}
                        <span className="text-sm text-muted-foreground">{ratingCount}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t('reviews.body')}</p>
                </div>
                <div className="lg:col-span-2 grid gap-4">
                    {reviews.map((review) => (
                        <div
                            key={review.key}
                            className="rounded-[1rem] bg-background p-5 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] hover:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)]"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-[0.75rem] bg-primary/15 text-primary flex items-center justify-center">
                                    <UsersIcon size={16} />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">{review.name}</p>
                                    <p className="text-xs text-muted-foreground">{t('reviews.role')}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ContactSection({
    t,
    tContact,
    formData,
    setFormData,
    onSubmit,
}: {
    t: TFunction;
    tContact: TFunction;
    formData: ContactFormData;
    setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<MailIcon size={24} />}
                iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                title={t('contact.title')}
                description={t('contact.description')}
            />
            <div className="grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-foreground">{t('contact.pitch')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t('contact.hint')}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-[1rem] bg-muted/50 p-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] space-y-2">
                            <div className="w-10 h-10 rounded-[0.75rem] bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400 flex items-center justify-center">
                                <ShieldIcon size={16} />
                            </div>
                            <p className="text-sm text-foreground font-semibold">{t('contact.cards.first.title')}</p>
                            <p className="text-xs text-muted-foreground">{t('contact.cards.first.text')}</p>
                        </div>
                        <div className="rounded-[1rem] bg-muted/50 p-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] space-y-2">
                            <div className="w-10 h-10 rounded-[0.75rem] bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center">
                                <ClockIcon size={16} />
                            </div>
                            <p className="text-sm text-foreground font-semibold">{t('contact.cards.second.title')}</p>
                            <p className="text-xs text-muted-foreground">{t('contact.cards.second.text')}</p>
                        </div>
                    </div>
                </div>
                <Box variant="muted" className="w-full">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="landing-name" className="text-sm font-medium text-foreground">
                                {t('contact.fields.name')}
                            </label>
                            <Input
                                id="landing-name"
                                placeholder={t('contact.fields.namePlaceholder')}
                                value={formData.name}
                                onChange={(event) =>
                                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="landing-email" className="text-sm font-medium text-foreground">
                                {tContact('email')}
                            </label>
                            <Input
                                id="landing-email"
                                type="email"
                                placeholder={t('contact.fields.emailPlaceholder')}
                                value={formData.email}
                                onChange={(event) =>
                                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="landing-message" className="text-sm font-medium text-foreground">
                                {tContact('message')}
                            </label>
                            <Textarea
                                id="landing-message"
                                placeholder={t('contact.fields.messagePlaceholder')}
                                value={formData.message}
                                onChange={(event) =>
                                    setFormData((prev) => ({ ...prev, message: event.target.value }))
                                }
                                rows={4}
                                required
                            />
                        </div>
                        <IconButton
                            type="submit"
                            icon={<SendIcon size={16} />}
                            variant="success"
                            className="w-full"
                            responsive
                        >
                            {t('contact.cta')}
                        </IconButton>
                    </form>
                </Box>
            </div>
        </section>
    );
}

function AboutSection({ t }: { t: TFunction }) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<QuestionIcon size={24} />}
                iconClassName="bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400"
                title={t('about.title')}
                description={t('about.description')}
            />
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                    <h3 className="text-xl font-semibold text-foreground">{t('about.heading')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t('about.body')}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-[1rem] bg-muted/50 p-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] space-y-2">
                            <div className="w-10 h-10 rounded-[0.75rem] bg-primary/15 text-primary flex items-center justify-center">
                                <RocketIcon size={16} />
                            </div>
                            <p className="text-sm text-foreground font-semibold">{t('about.cards.delivery')}</p>
                            <p className="text-xs text-muted-foreground">{t('about.cards.deliveryText')}</p>
                        </div>
                        <div className="rounded-[1rem] bg-muted/50 p-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] space-y-2">
                            <div className="w-10 h-10 rounded-[0.75rem] bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400 flex items-center justify-center">
                                <HandshakeIcon size={16} />
                            </div>
                            <p className="text-sm text-foreground font-semibold">{t('about.cards.partners')}</p>
                            <p className="text-xs text-muted-foreground">{t('about.cards.partnersText')}</p>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 rounded-[1rem] bg-muted/50 p-5 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[0.75rem] bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center">
                            <ShieldIcon size={16} />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{t('about.mission.title')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t('about.mission.text')}</p>
                </div>
            </div>
        </section>
    );
}

function FaqSection({
    t,
    faqs,
}: {
    t: TFunction;
    faqs: Array<ListItem & { question: string; answer: string }>;
}) {
    return (
        <section className="space-y-4">
            <PageHeader
                icon={<QuestionIcon size={24} />}
                iconClassName="bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                title={t('faq.title')}
                description={t('faq.description')}
            />
            <div className="space-y-3">
                {faqs.map((faq, index) => (
                    <Collapsible key={faq.key} defaultOpen={index === 0}>
                        <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 rounded-[1rem] bg-muted/60 px-4 py-3 text-left text-sm font-semibold text-foreground shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] cursor-pointer data-[state=open]:bg-muted/80">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-[0.75rem] bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                    <QuestionIcon size={14} />
                                </div>
                                <span className="text-left">{faq.question}</span>
                            </div>
                            <div className="w-8 h-8 rounded-[0.75rem] bg-primary/15 text-primary flex items-center justify-center shrink-0 transition-transform duration-300 data-[state=open]:rotate-180">
                                <ChevronDownIcon size={14} />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">
                            {faq.answer}
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        </section>
    );
}
