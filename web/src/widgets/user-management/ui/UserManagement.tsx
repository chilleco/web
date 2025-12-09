'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { getUsers, saveUser } from '@/entities/user/api/userApi';
import type { User } from '@/entities/user';
import { UserListItem } from './UserListItem';
import { UserForm } from './UserForm';
import { getUserDisplayName } from '../lib/userFormUtils';

interface UserManagementProps {
  triggerRefresh?: number;
}

export function UserManagement({ triggerRefresh }: UserManagementProps = {}) {
  const t = useTranslations('admin.users');
  const { success, error: showError } = useToastActions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const inFlightRef = useRef(false);

  const loadUsers = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers({ limit: 100 });
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('loadError');
      setError(message);
      showError(message);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (triggerRefresh) {
      loadUsers();
    }
  }, [triggerRefresh, loadUsers]);

  const handleFormSuccess = async () => {
    setEditingUser(null);
    await loadUsers();
  };

  const handleToggleBlock = async (user: User) => {
    try {
      await saveUser({
        id: user.id,
        status: user.status === 1 ? 3 : 1,
      });
      await loadUsers();
      const displayName = getUserDisplayName(user, t('titleFallback', { id: user.id }));
      success(user.status === 1 ? t('toasts.unbanned', { name: displayName }) : t('toasts.banned', { name: displayName }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveError');
      showError(message);
    }
  };

  const dialogTitle = useMemo(() => {
    if (!editingUser) return '';
    const name = getUserDisplayName(editingUser, t('titleFallback', { id: editingUser.id }));
    return t('editTitle', { name });
  }, [editingUser, t]);

  return (
    <EntityManagement
      loading={loading}
      error={error}
      isEmpty={users.length === 0}
      loadingLabel={t('loading')}
      emptyLabel={t('empty')}
      renderList={() => (
        <div className="space-y-3">
          {users.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              onEdit={(item) => setEditingUser(item)}
              onToggleBlock={handleToggleBlock}
            />
          ))}
        </div>
      )}
      editModal={
        editingUser ? (
          <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{dialogTitle}</DialogTitle>
              </DialogHeader>
              <UserForm
                user={editingUser}
                onSuccess={handleFormSuccess}
                onCancel={() => setEditingUser(null)}
              />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    />
  );
}
