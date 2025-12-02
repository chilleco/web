import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SelectedSpace {
  link: string | null;
  margin?: number | null;
}

export interface SpaceSelectionState {
  selectedSpace: SelectedSpace | null;
}

const initialState: SpaceSelectionState = {
  selectedSpace: null,
};

export const spaceSelectionSlice = createSlice({
  name: 'spaceSelection',
  initialState,
  reducers: {
    setSelectedSpace(state, action: PayloadAction<SelectedSpace | null>) {
      state.selectedSpace = action.payload;
    },
  },
});

export const { setSelectedSpace } = spaceSelectionSlice.actions;
export const selectSelectedSpace = (state: { spaceSelection: SpaceSelectionState }) =>
  state.spaceSelection.selectedSpace;

export default spaceSelectionSlice.reducer;
