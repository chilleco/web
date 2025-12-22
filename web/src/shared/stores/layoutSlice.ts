import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isApp } from '@/shared/lib/telegram'

export type LayoutState = {
    isApp: boolean
}

const initialState: LayoutState = {
    isApp: isApp(),
}

export const layoutSlice = createSlice({
    name: 'layout',
    initialState,
    reducers: {
        setIsApp: (state, action: PayloadAction<boolean>) => {
            state.isApp = action.payload
        },
        toggleIsApp: (state) => {
            state.isApp = !state.isApp
        },
    },
})

export const { setIsApp, toggleIsApp } = layoutSlice.actions

export const selectIsApp = (state: { layout: LayoutState }) =>
    state.layout.isApp

export default layoutSlice.reducer
