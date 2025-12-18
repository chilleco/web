'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { SidebarCard } from '@/shared/ui/sidebar-card';
import { Button } from '@/shared/ui/button';
import { EyeIcon, CategoriesIcon, PostsIcon, UsersIcon, ShoppingIcon, BuildingIcon, TasksIcon, FeedbackIcon } from '@/shared/ui/icons';

interface AdminSidebarProps {
  className?: string;
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const t = useTranslations('system');
  const tNav = useTranslations('navigation');
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      key: 'dashboard',
      label: t('dashboard'),
      href: '/admin' as const,
      icon: <EyeIcon size={20} />
    },
    {
      key: 'categories',
      label: t('categories'),
      href: '/admin/categories' as const,
      icon: <CategoriesIcon size={20} />
    },
    {
      key: 'posts',
      label: tNav('posts'),
      href: '/admin/posts' as const, 
      icon: <PostsIcon size={20} />
    },
    {
      key: 'products',
      label: tNav('products'),
      href: '/admin/products' as const,
      icon: <ShoppingIcon size={20} />
    },
    {
      key: 'tasks',
      label: tNav('tasks'),
      href: '/admin/tasks' as const,
      icon: <TasksIcon size={20} />
    },
    {
      key: 'feedback',
      label: tNav('feedback'),
      href: '/admin/feedback' as const,
      icon: <FeedbackIcon size={20} />
    },
    {
      key: 'spaces',
      label: t('spaces'),
      href: '/admin/spaces' as const,
      icon: <BuildingIcon size={20} />
    },
    {
      key: 'users',
      label: t('users'),
      href: '/admin/users' as const,
      icon: <UsersIcon size={20} />
    }
  ] as const;

  const handleNavigation = (href: '/admin' | '/admin/categories' | '/admin/posts' | '/admin/products' | '/admin/tasks' | '/admin/feedback' | '/admin/spaces' | '/admin/users') => {
    router.push(href);
  };

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <SidebarCard className={className} contentSpacing="sm">
      <div className="space-y-1">
        {menuItems.map((item) => (
          <Button
            key={item.key}
            variant={isActive(item.href) ? 'default' : 'ghost'}
            className={`w-full justify-start gap-3 ${
              isActive(item.href) 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
            onClick={() => handleNavigation(item.href)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
    </SidebarCard>
  );
}
