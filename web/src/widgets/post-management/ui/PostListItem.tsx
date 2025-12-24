'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EditIcon, DeleteIcon, ImageIcon, CategoriesIcon } from '@/shared/ui/icons';
import { EntityRow } from '@/shared/ui/entity-management';
import { Post } from '@/entities/post';
import { Link } from '@/i18n/routing';

interface PostListItemProps {
  post: Post;
  onDelete: (post: Post) => void;
}

export function PostListItem({ post, onDelete }: PostListItemProps) {
  const tSystem = useTranslations('system');
  const tAdmin = useTranslations('admin.posts');
  const postHref = {
    pathname: '/posts/[categoryUrl]',
    params: { categoryUrl: post.url },
  } as const;

  return (
    <EntityRow
      id={post.id}
      title={post.title}
      url={`posts/${post.url}`}
      urlHref={postHref}
      badges={
        post.status !== undefined
          ? [
            <Badge key="status" variant={post.status === 1 ? 'success' : 'secondary'}>
              {post.status === 1 ? tSystem('saved') : tSystem('blocked')}
            </Badge>,
          ]
          : []
      }
      secondRowItems={
        [
          post.category
            ? {
                icon: <CategoriesIcon size={12} />,
                keyLabel: tAdmin('categoryLabel'),
                value: post.category,
              }
            : null,
        ].filter(Boolean) as {
          icon: React.ReactNode;
          keyLabel?: string;
          value: React.ReactNode;
        }[]
      }
      leftSlot={
        <div className="relative w-12 h-12 rounded-[0.75rem] bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {post.image ? (
            <Image
              src={post.image}
              alt={post.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <ImageIcon size={16} className="text-muted-foreground" />
          )}
        </div>
      }
      rightActions={
        <ButtonGroup>
          <IconButton asChild variant="outline" size="sm" icon={<EditIcon size={12} />} responsive>
            <Link
              href={{
                pathname: '/posts/[categoryUrl]',
                params: { categoryUrl: post.url },
                query: { edit: '1' }
              }}
            >
              {tSystem('edit')}
            </Link>
          </IconButton>
          <IconButton
            variant="destructive"
            size="sm"
            icon={<DeleteIcon size={12} />}
            onClick={() => onDelete(post)}
            responsive
          >
            {tSystem('delete')}
          </IconButton>
        </ButtonGroup>
      }
    />
  );
}
