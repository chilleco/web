'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { getTasks, saveTask } from '@/entities/task/api/tasks';
import type { Task } from '@/entities/task/model/task';
import { TaskForm } from './TaskForm';
import { TaskListItem } from './TaskListItem';

interface TaskManagementProps {
  isCreateModalOpen?: boolean;
  onCreateModalChange?: (open: boolean) => void;
  triggerRefresh?: number;
}

export function TaskManagement({
  isCreateModalOpen = false,
  onCreateModalChange,
  triggerRefresh,
}: TaskManagementProps = {}) {
  const locale = useLocale();
  const t = useTranslations('admin.tasks');
  const { success, error: showError } = useToastActions();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const orderedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });
  }, [tasks]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTasks({ admin: true, limit: 500 });
      setTasks(response.tasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.load');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (triggerRefresh) {
      loadTasks();
    }
  }, [triggerRefresh, loadTasks]);

  const handleFormSuccess = async () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingTask(null);
    await loadTasks();
  };

  const handleFormCancel = () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingTask(null);
  };

  const handleToggleStatus = async (task: Task) => {
    try {
      const nextStatus = task.status === 0 ? 1 : 0;
      await saveTask({ id: task.id, status: nextStatus });
      success(nextStatus === 0 ? t('actions.disabled') : t('actions.enabled'));
      await loadTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.toggle');
      showError(message);
    }
  };

  return (
    <EntityManagement
      loading={loading}
      error={error}
      isEmpty={orderedTasks.length === 0}
      loadingLabel={t('loading')}
      emptyLabel={t('empty')}
      renderList={() => (
        <div className="divide-y divide-border/50 px-2">
          {orderedTasks.map((task) => (
            <div key={task.id} className="py-3">
              <TaskListItem
                task={task}
                locale={locale}
                onEdit={(item) => setEditingTask(item)}
                onToggleStatus={handleToggleStatus}
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
                <DialogTitle>{t('createTitle')}</DialogTitle>
              </DialogHeader>
              <TaskForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
      editModal={
        editingTask ? (
          <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('editTitle', { id: editingTask.id })}</DialogTitle>
              </DialogHeader>
              <TaskForm task={editingTask} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    />
  );
}

