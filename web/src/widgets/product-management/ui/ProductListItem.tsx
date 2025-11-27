'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EditIcon, TagIcon, StarIcon, ShoppingIcon, DeleteIcon, ImageIcon } from '@/shared/ui/icons';
import { Product } from '@/entities/product';

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductListItem({ product, onEdit, onDelete }: ProductListItemProps) {
  const t = useTranslations('admin.products');
  const previewImage = product.images?.[0];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-[1rem] bg-muted/50 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {previewImage ? (
              <div className="w-10 h-10 rounded-[0.75rem] overflow-hidden bg-muted">
                <img
                  src={previewImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-[0.75rem] bg-muted flex items-center justify-center">
                <ImageIcon size={16} className="text-muted-foreground" />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-semibold truncate">{product.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {product.category || t('noCategory')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-shrink-0">
            <span className="font-semibold text-foreground">
              {product.price} {product.currency || ''}
            </span>
            {product.originalPrice && (
              <span className="line-through opacity-70">
                {product.originalPrice} {product.currency || ''}
              </span>
            )}
            {product.rating && (
              <span className="flex items-center gap-1">
                <StarIcon size={12} className="text-amber-500" />
                {product.rating}
              </span>
            )}
            {product.ratingCount && (
              <span className="flex items-center gap-1">
                <TagIcon size={12} />
                {product.ratingCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
            {product.description || ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.inStock === false && (
              <Badge variant="destructive">{t('statusInactive')}</Badge>
            )}
            {product.inStock !== false && (
              <Badge variant="secondary">{t('inStock')}</Badge>
            )}
            {product.isNew && <Badge variant="success">{t('isNew')}</Badge>}
            {product.isFeatured && <Badge variant="warning">{t('isFeatured')}</Badge>}
            {product.discount ? <Badge variant="default">-{product.discount}%</Badge> : null}
          </div>
        </div>
      </div>

      <ButtonGroup>
        <IconButton
          variant="outline"
          size="sm"
          icon={<EditIcon size={12} />}
          onClick={() => onEdit(product)}
          responsive
        >
          {t('edit')}
        </IconButton>
        <IconButton
          variant="destructive"
          size="sm"
          icon={<DeleteIcon size={12} />}
          onClick={() => onDelete(product)}
          responsive
        >
          {t('delete')}
        </IconButton>
      </ButtonGroup>
    </div>
  );
}
