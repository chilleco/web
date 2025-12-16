import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TasksPage } from '@/widgets/tasks';

export async function generateMetadata(): Promise<Metadata> {
    const tNavigation = await getTranslations('navigation');
    const tTasks = await getTranslations('tasks');

    return {
        title: tNavigation('tasks'),
        description: tTasks('description'),
    };
}

export default function TasksRoutePage() {
    return <TasksPage />;
}

