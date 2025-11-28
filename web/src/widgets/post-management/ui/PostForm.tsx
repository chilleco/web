'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { IconButton } from '@/shared/ui/icon-button';
import { AddIcon, LoadingIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { Post, createPost, updatePost } from '@/entities/post';

interface PostFormState {
  title: string;
  description: string;
  content: string;
  image: string;
}

interface PostFormProps {
  post?: Post;
  onSuccess: () => void;
  onCancel: () => void;
}

const defaultState: PostFormState = {
  title: '',
  description: '',
  content: '',
  image: '',
};

export function PostForm({ post, onSuccess, onCancel }: PostFormProps) {
  const t = useTranslations('admin.posts');
  const tSystem = useTranslations('system');
  const { success, error } = useToastActions();
  const [form, setForm] = useState<PostFormState>(defaultState);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!post) {
      setForm(defaultState);
      return;
    }

    setForm({
      title: post.title || '',
      description: post.description || '',
      content: post.data || '',
      image: post.image || '',
    });
  }, [post]);

  const handleChange = (field: keyof PostFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (post?.id) {
        await updatePost(post.id, {
          title: form.title,
          description: form.description,
          data: form.content,
          image: form.image,
        });
      } else {
        await createPost({
          title: form.title,
          description: form.description,
          data: form.content,
          image: form.image,
        });
      }

      success(tSystem('saved'));
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t('titleLabel')}</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={t('titleLabel')}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">{t('image')}</Label>
          <Input
            id="image"
            value={form.image}
            onChange={(e) => handleChange('image', e.target.value)}
            placeholder={t('image')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t('descriptionLabel')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">{t('content')}</Label>
        <Textarea
          id="content"
          value={form.content}
          onChange={(e) => handleChange('content', e.target.value)}
          placeholder={t('content')}
          rows={6}
        />
      </div>

      <div className="flex items-center justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {tSystem('cancel')}
        </Button>
        <IconButton
          type="submit"
          variant="default"
          disabled={saving}
          icon={saving ? <LoadingIcon size={16} className="animate-spin" /> : <AddIcon size={16} />}
          responsive
          className="min-w-[10rem]"
        >
          {saving ? tSystem('saving') : tSystem('save')}
        </IconButton>
      </div>
    </form>
  );
}
