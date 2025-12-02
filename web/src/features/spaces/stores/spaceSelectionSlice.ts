import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SelectedSpace {
  link: string | null;
  margin?: number | null;
}

export interface SpaceSelectionState {
  selectedSpace: SelectedSpace | null;
}

const STORAGE_KEY = 'spaceSelection.selectedSpace';

const isValidLink = (link: unknown): link is string => {
  if (typeof link !== 'string') return false;
  if (!link.trim()) return false;
  if (link.includes('[') || link.includes(']')) return false;
  return true;
};

const readStoredSelection = (): SelectedSpace | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SelectedSpace | null;
    if (!parsed || !isValidLink(parsed.link)) return null;

    return {
      link: parsed.link,
      margin:
        typeof parsed.margin === 'number'
          ? parsed.margin
          : parsed.margin === null
            ? null
            : undefined,
    };
  } catch (error) {
    console.warn('Failed to parse stored space selection', error);
    return null;
  }
};

const persistSelection = (selection: SelectedSpace | null) => {
  if (typeof window === 'undefined') return;
  if (selection && isValidLink(selection.link)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const initialState: SpaceSelectionState = {
  selectedSpace: readStoredSelection(),
};

export const spaceSelectionSlice = createSlice({
  name: 'spaceSelection',
  initialState,
  reducers: {
    setSelectedSpace(state, action: PayloadAction<SelectedSpace | null>) {
      const nextSelection =
        action.payload && isValidLink(action.payload.link) ? action.payload : null;

      state.selectedSpace = nextSelection;
      persistSelection(nextSelection);
    },
  },
});

export const { setSelectedSpace } = spaceSelectionSlice.actions;
export const selectSelectedSpace = (state: { spaceSelection: SpaceSelectionState }) =>
  state.spaceSelection.selectedSpace;

export default spaceSelectionSlice.reducer;
