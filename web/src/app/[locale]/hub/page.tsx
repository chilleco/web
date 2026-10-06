import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Box } from '@/shared/ui/box';
import { PageHeader } from '@/shared/ui/page-header';
import { ConstructionIcon, HubIcon, MessageIcon, UsersIcon, VideoIcon, WhiteboardIcon } from '@/shared/ui/icons';

export async function generateMetadata(): Promise<Metadata> {
    const [tNavigation, tHub] = await Promise.all([
        getTranslations('navigation'),
        getTranslations('hub'),
    ]);

    return {
        title: tNavigation('hub'),
        description: tHub('description'),
    };
}

export default async function HubPage() {
    const [tNavigation, tHub] = await Promise.all([
        getTranslations('navigation'),
        getTranslations('hub'),
    ]);

    const modes = [
        {
            key: 'rooms',
            icon: UsersIcon,
            title: tHub('modes.rooms.title'),
            description: tHub('modes.rooms.description'),
            className: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        },
        {
            key: 'chat',
            icon: MessageIcon,
            title: tHub('modes.chat.title'),
            description: tHub('modes.chat.description'),
            className: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        },
        {
            key: 'calls',
            icon: VideoIcon,
            title: tHub('modes.calls.title'),
            description: tHub('modes.calls.description'),
            className: 'bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
        },
        {
            key: 'boards',
            icon: WhiteboardIcon,
            title: tHub('modes.boards.title'),
            description: tHub('modes.boards.description'),
            className: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        }
    ];

    const principles = [
        tHub('principles.realtime'),
        tHub('principles.lowNoise'),
        tHub('principles.realStates'),
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mx-auto max-w-6xl">
                    <PageHeader
                        icon={<HubIcon size={24} />}
                        iconClassName="bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                        title={tNavigation('hub')}
                        description={tHub('description')}
                    />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <div className="space-y-6">
                            <Box size="lg" className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                        <UsersIcon size={18} />
                                    </div>
                                    <h2 className="text-xl font-semibold">{tHub('intro.title')}</h2>
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {tHub('intro.body')}
                                </p>
                            </Box>

                            <Box size="lg" className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                        <MessageIcon size={18} />
                                    </div>
                                    <h2 className="text-xl font-semibold">{tHub('modes.title')}</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {modes.map(({ key, icon: Icon, title, description, className }) => (
                                        <div
                                            key={key}
                                            className="rounded-[1rem] bg-muted/40 px-4 py-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-[0.75rem] ${className}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-medium">{title}</div>
                                                    <p className="text-sm text-muted-foreground">{description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Box>
                        </div>

                        <div className="space-y-6">
                            <Box size="lg" className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                                        <ConstructionIcon size={18} />
                                    </div>
                                    <h2 className="text-xl font-semibold">{tHub('principles.title')}</h2>
                                </div>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    {principles.map((item) => (
                                        <li key={item} className="rounded-[0.75rem] bg-muted/40 px-4 py-3">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </Box>

                            <Box size="lg" className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                        <VideoIcon size={18} />
                                    </div>
                                    <h2 className="text-xl font-semibold">{tHub('activation.title')}</h2>
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {tHub('activation.body')}
                                </p>
                            </Box>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
