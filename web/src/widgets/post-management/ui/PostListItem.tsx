'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EditIcon, DeleteIcon, ImageIcon } from '@/shared/ui/icons';
import { EntityRow } from '@/shared/ui/entity-management';
import { Post } from '@/entities/post';

interface PostListItemProps {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}

export function PostListItem({ post, onEdit, onDelete }: PostListItemProps) {
  const tSystem = useTranslations('system');
  const tAdmin = useTranslations('admin.posts');

  return (
    <EntityRow
      id={post.id}
      title={post.title}
      url={post.url}
      badges={
        post.status !== undefined
          ? [
              <Badge key="status" variant={post.status === 1 ? 'success' : 'secondary'}>
                {post.status === 1 ? tSystem('saved') : tSystem('blocked')}
              </Badge>,
            ]
          : []
      }
      secondRowItems={[post.category || null].filter(Boolean)}
      leftSlot={
        <div className="w-12 h-12 rounded-[0.75rem] bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {post.image ? (
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageIcon size={16} className="text-muted-foreground" />
          )}
        </div>
      }
      rightActions={
        <ButtonGroup>
          <IconButton
            variant="outline"
            size="sm"
            icon={<EditIcon size={12} />}
            onClick={() => onEdit(post)}
            responsive
          >
            {tSystem('edit')}
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
