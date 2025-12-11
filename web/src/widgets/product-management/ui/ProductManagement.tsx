'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { getProducts, Product, deleteProduct } from '@/entities/product';
import { ProductForm } from './ProductForm';
import { ProductListItem } from './ProductListItem';

interface ProductManagementProps {
  isCreateModalOpen?: boolean;
  onCreateModalChange?: (open: boolean) => void;
  triggerRefresh?: number;
}

export function ProductManagement({
  isCreateModalOpen = false,
  onCreateModalChange,
  triggerRefresh,
}: ProductManagementProps = {}) {
  const t = useTranslations('admin.products');
  const tSystem = useTranslations('system');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { success, error: showError } = useToastActions();

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts({ limit: 100 });
      setProducts(data.products);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (triggerRefresh) {
      loadProducts();
    }
  }, [triggerRefresh, loadProducts]);

  const handleFormSuccess = async () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingProduct(null);
    await loadProducts();
  };

  const handleFormCancel = () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingProduct(null);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(t('deleteConfirm', { title: product.title }))) return;
    try {
      await deleteProduct(product.id);
      await loadProducts();
      success(tSystem('deleted'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error');
      setError(message);
      showError(message);
    }
  };

  return (
    <EntityManagement
      loading={loading}
      error={error}
      isEmpty={products.length === 0}
      loadingLabel={t('loading')}
      emptyLabel={t('empty')}
      renderList={() => (
        <div className="divide-y divide-border/50 px-2">
          {products.map((product) => (
            <div key={product.id} className="py-3">
              <ProductListItem
                product={product}
                onEdit={(item) => setEditingProduct(item)}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
      createModal={
        onCreateModalChange ? (
          <Dialog open={isCreateModalOpen} onOpenChange={onCreateModalChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('add')}</DialogTitle>
              </DialogHeader>
              <ProductForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
      editModal={
        editingProduct ? (
          <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('editTitle', { title: editingProduct.title })}</DialogTitle>
              </DialogHeader>
              <ProductForm product={editingProduct} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    />
  );
}
