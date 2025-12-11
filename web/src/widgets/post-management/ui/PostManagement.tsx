'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { getPosts, deletePost, Post } from '@/entities/post';
import { PostListItem } from './PostListItem';

interface PostManagementProps {
  triggerRefresh?: number;
}

export function PostManagement({
  triggerRefresh,
}: PostManagementProps = {}) {
  const tAdmin = useTranslations('admin.posts');
  const tSystem = useTranslations('system');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        <div className="divide-y divide-border/50 px-2">
          {posts.map((post) => (
            <div key={post.id} className="py-3">
              <PostListItem
                post={post}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
    />
  );
}
