import { useState } from "react"

export interface RowEdit<T> {
  editingKey: number | null
  draft: T | null
  startEdit: (key: number, value: T) => void
  patchDraft: (patch: Partial<T>) => void
  cancelEdit: () => void
  isEditing: (key: number) => boolean
}

export function useRowEdit<T extends object>(): RowEdit<T> {
  const [editingKey, setEditingKey] = useState<number | null>(null)
  const [draft, setDraft] = useState<T | null>(null)

  function startEdit(key: number, value: T) {
    setEditingKey(key)
    setDraft({ ...value })
  }

  function patchDraft(patch: Partial<T>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function cancelEdit() {
    setEditingKey(null)
    setDraft(null)
  }

  function isEditing(key: number) {
    return editingKey === key && draft !== null
  }

  return { editingKey, draft, startEdit, patchDraft, cancelEdit, isEditing }
}
