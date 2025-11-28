'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { getPosts, deletePost, Post } from '@/entities/post';
import { PostForm } from './PostForm';
import { PostListItem } from './PostListItem';

interface PostManagementProps {
  isCreateModalOpen?: boolean;
  onCreateModalChange?: (open: boolean) => void;
  triggerRefresh?: number;
}

export function PostManagement({
  isCreateModalOpen = false,
  onCreateModalChange,
  triggerRefresh,
}: PostManagementProps = {}) {
  const tAdmin = useTranslations('admin.posts');
  const tSystem = useTranslations('system');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const { success, error: showError } = useToastActions();

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPosts({ limit: 100 });
      setPosts(data.posts);
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, tSystem]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (triggerRefresh) {
      loadPosts();
    }
  }, [triggerRefresh, loadPosts]);

  const handleFormSuccess = async () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingPost(null);
    await loadPosts();
  };

  const handleFormCancel = () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingPost(null);
  };

  const handleDelete = async (post: Post) => {
    if (!confirm(tSystem('delete'))) return;
    try {
      await deletePost(post.id);
      await loadPosts();
      success(tSystem('deleted'));
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      setError(message);
      showError(message);
    }
  };

  return (
    <EntityManagement
      loading={loading}
      error={error}
      isEmpty={posts.length === 0}
      loadingLabel={tAdmin('loading')}
      emptyLabel={tAdmin('empty')}
      renderList={() => (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostListItem
              key={post.id}
              post={post}
              onEdit={(item) => setEditingPost(item)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      createModal={
        onCreateModalChange ? (
          <Dialog open={isCreateModalOpen} onOpenChange={onCreateModalChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tAdmin('title')}</DialogTitle>
              </DialogHeader>
              <PostForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
      editModal={
        editingPost ? (
          <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tAdmin('editTitle', { title: editingPost.title })}</DialogTitle>
              </DialogHeader>
              <PostForm post={editingPost} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    />
  );
}
