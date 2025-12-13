import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { Button } from '@/shared/ui/button';
import { BullhornIcon, ChevronRightIcon, LightningIcon, RocketIcon } from '@/shared/ui/icons';
import { getTasks } from '@/entities/tasks/api/getTasks';
import { type Task } from '@/entities/tasks/model/types';
import { resolveTaskAccent, resolveTaskIcon } from '@/entities/tasks/lib/iconMap';
import ReferralCard, { type ReferralCardProps } from './ReferralCard';

type Translator = (key: string, values?: Record<string, unknown>) => string;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('tasksPage');

    return {
        title: t('meta.title'),
        description: t('meta.description'),
    };
}

export default async function TasksPage({ params }: { params: { locale: string } }) {
    const t = await getTranslations('tasksPage');
    const referralAnchorId = 'referral-actions';
    const { tasks } = await getTasks({ status: 1, locale: params.locale });

    const referralCardProps: ReferralCardProps = {
        title: t('referral.title'),
        description: t('referral.description'),
        linkLabel: t('referral.linkLabel'),
        linkValue: t('referral.linkValue'),
        copyLabel: t('referral.copy'),
        copiedLabel: t('referral.copied'),
        copyError: t('referral.copyError'),
        shareText: t('referral.shareText'),
        shareSuccess: t('referral.shareSuccess'),
        statsTitle: t('referral.statsTitle'),
        stats: [
            { label: t('referral.stats.sent'), value: t('referral.statsValues.sent') },
            { label: t('referral.stats.joined'), value: t('referral.statsValues.joined') },
            { label: t('referral.stats.bonus'), value: t('referral.statsValues.bonus') },
        ],
        primaryCta: t('cta.primary'),
        secondaryCta: t('cta.secondary'),
        anchorId: referralAnchorId,
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <PageHeader
                        icon={<BullhornIcon size={24} />}
                        iconClassName="bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                        title={t('header.title')}
                        description={t('header.subtitle')}
                    />

                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-2">
                            <TasksSection
                                t={t}
                                tasks={tasks}
                                anchorId={referralAnchorId}
                                title={t('tasks.title')}
                                subtitle={t('tasks.subtitle')}
                            />
                        </div>
                        <ReferralCard {...referralCardProps} />
                    </div>

                    <BoostersSection
                        title={t('boosters.title')}
                        subtitle={t('boosters.subtitle')}
                        headings={{
                            timing: t('boosters.items.timing.title'),
                            assets: t('boosters.items.assets.title'),
                            followUp: t('boosters.items.followUp.title'),
                        }}
                        descriptions={{
                            timing: t('boosters.items.timing.description'),
                            assets: t('boosters.items.assets.description'),
                            followUp: t('boosters.items.followUp.description'),
                        }}
                        ctas={{
                            timing: t('boosters.items.timing.cta'),
                            assets: t('boosters.items.assets.cta'),
                            followUp: t('boosters.items.followUp.cta'),
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function TasksSection({
    t,
    tasks,
    anchorId,
    title,
    subtitle,
}: {
    t: Translator;
    tasks: Task[];
    anchorId?: string;
    title: string;
    subtitle: string;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-[0.75rem] bg-primary/15 text-primary dark:bg-primary/20">
                    <LightningIcon size={18} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold leading-6">{title}</h2>
                    <p className="text-sm text-muted-foreground leading-6">{subtitle}</p>
                </div>
            </div>

            {tasks.length === 0 ? (
                <Box size="lg" className="flex flex-col gap-2 bg-muted/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <LightningIcon size={16} className="text-current" />
                        {t('empty.title')}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('empty.subtitle')}</p>
                </Box>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} t={t} anchorId={anchorId} />
                    ))}
                </div>
            )}
        </div>
    );
}

function TaskCard({ task, t, anchorId }: { task: Task; t: Translator; anchorId?: string }) {
    const iconAccent = resolveTaskAccent(task.icon);
    const icon = resolveTaskIcon(task.icon);
    const progressPercent = Math.min(
        100,
        Math.round((task.progressCurrent / Math.max(task.progressTarget, 1)) * 100)
    );
    const rewardLabel = task.rewardLabel || t('rewards.default');
    const categoryLabel = t(`categories.${task.category}`, { defaultMessage: task.category });
    const stateLabel =
        task.state === 'ready'
            ? t('states.ready')
            : task.state === 'claimed'
                ? t('states.claimed')
                : t('states.in_progress');
    const ctaLabel =
        task.action === 'claim' || task.state === 'ready'
            ? t('actions.claim')
            : t('actions.start');
    const targetHref = task.link || (anchorId ? `#${anchorId}` : undefined);

    const stateTone =
        task.state === 'ready'
            ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground';

    return (
        <Box
            size="lg"
            className={`flex h-full flex-col gap-4 transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] ${
                task.state === 'ready' ? 'shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] hover:scale-[1.01]' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[0.75rem] ${iconAccent}`}>
                        {icon}
                    </div>
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {categoryLabel}
                        </div>
                        <h3 className="text-lg font-semibold leading-6">{task.title}</h3>
                        {task.description ? (
                            <p className="text-sm text-muted-foreground leading-6">{task.description}</p>
                        ) : null}
                    </div>
                </div>
                <span className={`rounded-[0.75rem] px-3 py-1 text-xs font-semibold ${stateTone}`}>{stateLabel}</span>
            </div>

            {task.progressTarget > 1 ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <span>
                            {t('progress.counter', { current: task.progressCurrent, target: task.progressTarget })}
                        </span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-[0.75rem] bg-muted">
                        <div
                            className="h-full rounded-[0.75rem] bg-primary transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            ) : (
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t('progress.single')}
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                    <LightningIcon size={14} className="text-current" />
                    {rewardLabel}
                </span>
                {targetHref ? (
                    <Button asChild variant={task.state === 'ready' ? 'default' : 'outline'} size="sm" className="cursor-pointer">
                        <a href={targetHref}>
                            <RocketIcon size={14} className="text-current" />
                            {ctaLabel}
                        </a>
                    </Button>
                ) : (
                    <Button type="button" variant={task.state === 'ready' ? 'default' : 'outline'} size="sm" className="cursor-pointer">
                        <RocketIcon size={14} className="text-current" />
                        {ctaLabel}
                    </Button>
                )}
            </div>
        </Box>
    );
}

function BoostersSection({
    title,
    subtitle,
    headings,
    descriptions,
    ctas,
}: {
    title: string;
    subtitle: string;
    headings: Record<'timing' | 'assets' | 'followUp', string>;
    descriptions: Record<'timing' | 'assets' | 'followUp', string>;
    ctas: Record<'timing' | 'assets' | 'followUp', string>;
}) {
    return (
        <Box size="lg" className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-[0.75rem] bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <RocketIcon size={18} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold leading-6">{title}</h2>
                    <p className="text-sm text-muted-foreground leading-6">{subtitle}</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {(['timing', 'assets', 'followUp'] as const).map((key) => (
                    <Box key={key} className="flex h-full flex-col gap-3" size="default">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-[0.75rem] bg-muted text-muted-foreground">
                                <ChevronRightIcon size={14} className="text-current" />
                            </div>
                            <h3 className="text-base font-semibold leading-6">{headings[key]}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-6">{descriptions[key]}</p>
                        <Button type="button" variant="ghost" size="sm" className="justify-start px-0 text-sm font-semibold cursor-pointer">
                            <ChevronRightIcon size={14} className="text-current" />
                            {ctas[key]}
                        </Button>
                    </Box>
                ))}
            </div>
        </Box>
    );
}
