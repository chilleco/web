import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type LayoutState = {
    isMobileBottomBarEnabled: boolean
}

const initialState: LayoutState = {
    isMobileBottomBarEnabled: true,
}

export const layoutSlice = createSlice({
    name: 'layout',
    initialState,
    reducers: {
        setMobileBottomBarEnabled: (state, action: PayloadAction<boolean>) => {
            state.isMobileBottomBarEnabled = action.payload
        },
        toggleMobileBottomBarEnabled: (state) => {
            state.isMobileBottomBarEnabled = !state.isMobileBottomBarEnabled
        },
    },
})

export const { setMobileBottomBarEnabled, toggleMobileBottomBarEnabled } = layoutSlice.actions

export const selectIsMobileBottomBarEnabled = (state: { layout: LayoutState }) =>
    state.layout.isMobileBottomBarEnabled

export default layoutSlice.reducer
