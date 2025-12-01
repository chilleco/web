'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/shared/ui/page-header';
import { BreadcrumbDescription } from '@/shared/ui/breadcrumb-description';
import { ThreeColumnLayout } from '@/widgets/three-column-layout';
import { Box } from '@/shared/ui/box';
import { SidebarCard } from '@/shared/ui/sidebar-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { FileUpload, FileData } from '@/shared/ui/file-upload';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Editor } from '@/shared/ui/editor';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui/select';
import { IconButton } from '@/shared/ui/icon-button';
import { useToastActions } from '@/shared/hooks/useToast';
import { formatDate, formatDateTime } from '@/shared/lib/date';
import { getCategories } from '@/entities/category/api/categoryApi';
import type { Category } from '@/entities/category/model/category';
import { Post, updatePost, createPost } from '@/entities/post';
import { uploadFile } from '@/shared/services/api/upload';
import {
  PostsIcon,
  CalendarIcon,
  EyeIcon,
  MessageIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  RefreshIcon,
  SaveIcon,
  CloseIcon,
  LoadingIcon
} from '@/shared/ui/icons';
import { PostActions } from './PostActions';

interface BreadcrumbItem {
  id: number;
  title: string;
  url: string;
  position: number;
}

interface PostDetailClientProps {
  post: Post;
  relatedPosts: Post[];
  breadcrumbs: BreadcrumbItem[];
  locale: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  isNew?: boolean;
  startEditing?: boolean;
}

const locales: string[] = ['en', 'ru', 'zh', 'es', 'ar'];

const stripHtml = (content: string): string =>
  content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const calculateReadingTime = (content: string): number => {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
};

const flattenCategories = (categories: Category[]): Category[] => {
  const result: Category[] = [];
  categories.forEach((cat) => {
    result.push(cat);
    if (cat.categories && cat.categories.length) {
      result.push(...flattenCategories(cat.categories));
    }
  });
  return result;
};

export function PostDetailClient({
  post,
  relatedPosts,
  breadcrumbs,
  locale,
  summary,
  createdAt,
  updatedAt,
  isNew = false,
  startEditing = false
}: PostDetailClientProps) {
  const router = useRouter();
  const tPosts = useTranslations('posts');
  const tSystem = useTranslations('system');
  const { success, error: showError } = useToastActions();

  const [isEditing, setEditing] = useState(isNew || startEditing);
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description || summary);
  const [content, setContent] = useState(post.data);
  const [image, setImage] = useState(post.image || '');
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [postLocale, setPostLocale] = useState<string>(post.locale || locale);
  const [category, setCategory] = useState<string>(post.category ? String(post.category) : 'none');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const readTimeMinutes = useMemo(() => calculateReadingTime(content), [content]);
  const readTimeLabel = tPosts('detail.readTimeLabel');
  const readTimeValue = tPosts('detail.readTimeValue', {
    minutes: new Intl.NumberFormat(locale).format(readTimeMinutes)
  });

  const formattedViews = new Intl.NumberFormat(locale).format(post.views ?? 0);
  const commentsCount = new Intl.NumberFormat(locale).format(post.comments?.length ?? 0);
  const publishedAt = formatDateTime(createdAt);
  const updatedAtFormatted = formatDateTime(updatedAt);
  const showUpdated = updatedAt !== createdAt;

  useEffect(() => {
    getCategories({ status: 1, locale })
      .then((fetched) => setCategories(flattenCategories(fetched)))
      .catch((err) => {
        const message = err instanceof Error ? err.message : tSystem('error');
        showError(message);
      });
  }, [locale, showError, tSystem]);

  const handleFileChange = (file: File | null, preview: string | null, data: FileData | null) => {
    if (!file) {
      setFileData(null);
      setImage('');
      return;
    }

    setUploadingImage(true);
    setFileData(data);
    setImage(preview || imageValue);

    uploadFile(file)
      .then((url) => {
        setImage(url);
        setFileData(data ? { ...data, preview: url, type: 'image' } : null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : tSystem('error');
        showError(message);
      })
      .finally(() => setUploadingImage(false));
  };

  const handleFileRemove = () => {
    setFileData(null);
    setImage('');
  };

  const resetForm = () => {
    setTitle(post.title);
    setDescription(post.description || summary);
    setContent(post.data);
    setImage(post.image || '');
    setFileData(null);
    setPostLocale(post.locale || locale);
    setCategory(post.category ? String(post.category) : 'none');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createPost({
          title,
          description,
          data: content,
          image,
          locale: postLocale,
          category: category !== 'none' ? Number(category) : undefined
        });
        success(tSystem('saved'));
        startTransition(() => {
          router.push(locale ? `/${locale}/posts/${created.url}` : `/posts/${created.url}`);
          router.refresh();
        });
        return;
      }

      await updatePost(post.id, {
        title,
        description,
        data: content,
        image,
        locale: postLocale,
        category: category !== 'none' ? Number(category) : undefined
      });
      success(tSystem('saved'));
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    resetForm();
    setEditing(false);
  };

  const categoryLink = post.category_data ? `/posts/${post.category_data.url}` : undefined;
  const imageValue = image || post.image || '';
  const imageFileData = imageValue ? { ...fileData, type: 'image' as const } : fileData;
  const pageTitle = post.title || tPosts('add');

  const headerActions = isNew
    ? null
    : (
      <PostActions
        post={post}
        locale={locale}
        isEditing={isEditing}
        onToggleEdit={() => {
          if (isEditing) {
            setEditing(false);
          } else {
            resetForm();
            setEditing(true);
          }
        }}
      />
    );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-6">
        <PageHeader
          icon={<PostsIcon size={24} />}
          iconClassName="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          title={pageTitle}
          description={<BreadcrumbDescription breadcrumbs={breadcrumbs} />}
          actions={headerActions}
        />
      </div>

      <ThreeColumnLayout
        className="pb-10"
        rightSidebar={
          <>
            <SidebarCard contentSpacing="sm">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <Avatar className="size-12">
                    {post.author?.image && (
                      <AvatarImage src={post.author.image} alt={post.author.name || post.author.login} />
                    )}
                    <AvatarFallback>
                      <UserIcon size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <div className="font-semibold leading-none">
                      {post.author?.name || post.author?.login || tSystem('guest')}
                    </div>
                    {post.author?.title && <div className="text-sm text-muted-foreground">{post.author.title}</div>}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <CalendarIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{tPosts('detail.publishedAt')}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{publishedAt}</div>
                </div>

                {showUpdated && (
                  <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300">
                        <RefreshIcon size={16} />
                      </div>
                      <div className="text-sm text-muted-foreground">{tPosts('detail.updatedAt')}</div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{updatedAtFormatted}</div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                      <ClockIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{readTimeLabel}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{readTimeValue}</div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <EyeIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{tPosts('detail.views')}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{formattedViews}</div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                      <MessageIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{tPosts('comments')}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{commentsCount}</div>
                </div>

                {post.category_data && (
                  <Link
                    href={`/posts/${post.category_data.url}`}
                    className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2 transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                        <TagIcon size={16} />
                      </div>
                      <div className="text-sm text-muted-foreground">{tPosts('detail.category')}</div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{post.category_data.title}</div>
                  </Link>
                )}
              </div>
            </SidebarCard>

            {relatedPosts.length > 0 && (
              <SidebarCard
                title={tPosts('detail.related')}
                icon={
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                    <PostsIcon size={20} />
                  </div>
                }
                contentSpacing="sm"
              >
                <div className="space-y-3">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.id}
                      href={`/posts/${related.url}`}
                      className="flex gap-3 rounded-[0.75rem] bg-muted/60 p-3 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:scale-[1.01]"
                    >
                      {related.image && (
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[0.75rem]">
                          <Image
                            src={related.image}
                            alt={related.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                          {related.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(related.updated ?? related.created ?? createdAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SidebarCard>
            )}
          </>
        }
      >
        <div className="space-y-6">
          {isEditing ? (
            <Box className="space-y-6">
              <div className="space-y-3">
                <Input
                  id="post-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tPosts('title')}
                  className="bg-muted border-0 text-base font-normal text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 h-full">
                  <FileUpload
                    value={imageValue}
                    fileData={imageFileData}
                    onFileChange={handleFileChange}
                    onFileRemove={handleFileRemove}
                    fileTypes="images"
                    width="w-full h-full"
                  />
                </div>
                <div className="space-y-4 h-full">
                  <Select value={postLocale} onValueChange={setPostLocale}>
                    <SelectTrigger
                      id="post-locale"
                      className="bg-muted border-0 hover:cursor-pointer text-base font-normal text-foreground"
                    >
                      <div className="flex items-center gap-3 w-full text-left">
                        <span className="text-base font-normal text-foreground">{tSystem('locale')}</span>
                        <SelectValue placeholder={tSystem('locale')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger
                      id="post-category"
                      className="bg-muted border-0 hover:cursor-pointer text-base font-normal text-foreground"
                    >
                      <div className="flex items-center gap-3 w-full text-left">
                        <span className="text-base font-normal text-foreground">{tPosts('detail.category')}</span>
                        <SelectValue placeholder={tPosts('detail.category')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tSystem('none')}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Textarea
                    id="post-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={tPosts('description')}
                    rows={4}
                    className="bg-muted border-0 text-base"
                  />
                </div>
              </div>

              <Editor
                value={content}
                onChange={setContent}
                placeholder={tPosts('detail.actions.editDescription')}
                className="min-h-[24rem]"
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <IconButton
                  icon={<CloseIcon size={16} />}
                  variant="outline"
                  responsive
                  type="button"
                  onClick={resetAndClose}
                  disabled={saving || isRefreshing}
                >
                  {tSystem('cancel')}
                </IconButton>
                <IconButton
                  icon={
                    saving || uploadingImage ? <LoadingIcon size={16} className="animate-spin" /> : <SaveIcon size={16} />
                  }
                  variant="default"
                  responsive
                  type="button"
                  onClick={handleSave}
                  disabled={saving || isRefreshing || uploadingImage}
                >
                  {saving || uploadingImage ? tSystem('saving') : tSystem('save')}
                </IconButton>
              </div>
            </Box>
          ) : (
            <Box className="overflow-hidden p-0">
              {post.image && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[1rem]">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 900px"
                  />
                </div>
              )}

              <div className="space-y-6 px-6 pb-6 pt-4">
                {categoryLink && post.category_data && (
                  <Link
                    href={categoryLink}
                    className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted/60 px-3 py-2 transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:scale-[1.01]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      <TagIcon size={14} />
                    </div>
                    <span className="font-medium text-foreground">{post.category_data.title}</span>
                  </Link>
                )}

                {summary && <p className="text-lg font-semibold leading-relaxed text-foreground">{summary}</p>}

                <div className="space-y-4 text-base leading-relaxed text-foreground [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_img]:rounded-[1rem] [&_img]:shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]">
                  <div dangerouslySetInnerHTML={{ __html: post.data }} />
                </div>
              </div>
            </Box>
          )}
        </div>
      </ThreeColumnLayout>
    </div>
  );
}
