'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Post, updatePost, deletePost } from '@/entities/post';
import { useToastActions } from '@/shared/hooks/useToast';
import {
  DeleteIcon,
  EditIcon,
  EyeIcon,
  HideIcon,
  LoadingIcon,
  CloseIcon
} from '@/shared/ui/icons';

interface PostActionsProps {
  post: Post;
  isEditing: boolean;
  onToggleEdit: () => void;
}

export function PostActions({ post, isEditing, onToggleEdit }: PostActionsProps) {
  const router = useRouter();
  const tSystem = useTranslations('system');
  const tPosts = useTranslations('posts');
  const { success, error: showError } = useToastActions();

  const [status, setStatus] = useState<number>(post.status ?? 1);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<'toggle' | 'delete' | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const isBlocked = status !== 1;
  const toggleLabel = isBlocked ? tSystem('unblocked') : tPosts('detail.actions.hide');
  const editLabel = isEditing ? tPosts('detail.view') : tSystem('edit');

  const handleToggleStatus = async () => {
    if (actionInProgress) return;
    setActionInProgress('toggle');

    try {
      const nextStatus = isBlocked ? 1 : 0;
      await updatePost(post.id, { status: nextStatus });
      setStatus(nextStatus);
      success(isBlocked ? tSystem('unblocked') : tSystem('blocked'));
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (actionInProgress === 'delete') return;
    setActionInProgress('delete');

    try {
      await deletePost(post.id);
      success(tSystem('deleted'));
      setDeleteOpen(false);
      startTransition(() => {
        router.push('/posts');
        router.refresh();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setActionInProgress(null);
    }
  };

  const isBusy = actionInProgress !== null || isRefreshing;

  return (
    <>
      <ButtonGroup>
        <IconButton
          icon={isEditing ? <EyeIcon size={16} /> : <EditIcon size={16} />}
          variant="info"
          responsive
          aria-label={editLabel}
          title={editLabel}
          type="button"
          onClick={onToggleEdit}
          disabled={isBusy}
        >
          {editLabel}
        </IconButton>
        <IconButton
          icon={isBlocked ? <EyeIcon size={16} /> : <HideIcon size={16} />}
          variant={isBlocked ? 'success' : 'warning'}
          responsive
          aria-label={toggleLabel}
          title={toggleLabel}
          type="button"
          onClick={handleToggleStatus}
          disabled={isBusy}
        >
          {toggleLabel}
        </IconButton>
        <IconButton
          icon={
            actionInProgress === 'delete' ? (
              <LoadingIcon size={16} className="animate-spin" />
            ) : (
              <DeleteIcon size={16} />
            )
          }
          variant="destructive"
          responsive
          aria-label={tSystem('delete')}
          title={tSystem('delete')}
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={isBusy}
        >
          {tSystem('delete')}
        </IconButton>
      </ButtonGroup>

      <Dialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSystem('delete')}</DialogTitle>
            <DialogDescription>
              {tPosts('detail.actions.deleteConfirm', { title: post.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-end gap-3 sm:flex-row">
            <IconButton
              icon={<CloseIcon size={16} />}
              variant="outline"
              responsive
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={actionInProgress === 'delete'}
            >
              {tSystem('cancel')}
            </IconButton>
            <IconButton
              icon={
                actionInProgress === 'delete' ? (
                  <LoadingIcon size={16} className="animate-spin" />
                ) : (
                  <DeleteIcon size={16} />
                )
              }
              variant="destructive"
              responsive
              type="button"
              onClick={handleDelete}
              disabled={actionInProgress === 'delete'}
            >
              {tSystem('delete')}
            </IconButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
