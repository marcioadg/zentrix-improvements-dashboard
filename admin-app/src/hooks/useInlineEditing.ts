import { useState, useCallback } from 'react';

export interface InlineEditItem {
  id: string;
  text: string;
}

export const useInlineEditing = (
  items: InlineEditItem[],
  onUpdate: (id: string, text: string) => void,
  onDelete: (id: string) => void
) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = useCallback((id: string, currentText: string) => {
    setEditingId(id);
    setEditValue(currentText);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      onUpdate(editingId, editValue.trim());
      setEditingId(null);
      setEditValue('');
    }
  }, [editingId, editValue, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const deleteItem = useCallback((id: string) => {
    onDelete(id);
    if (editingId === id) {
      cancelEdit();
    }
  }, [editingId, onDelete, cancelEdit]);

  return {
    editingId,
    editValue,
    setEditValue,
    startEditing,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    deleteItem,
  };
};