import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const defaultState = {
  dateFilter: 'today',
  fromDate: '',
  toDate: ''
};

export const useDateFilterStore = create(
  persist(
    (set) => ({
      ...defaultState,
      setDateFilterValue: (value) =>
        set((state) => ({
          dateFilter: value,
          ...(value === 'custom'
            ? {}
            : {
                fromDate: '',
                toDate: ''
              })
        })),
      setFromDateValue: (fromDate) => set({ fromDate }),
      setToDateValue: (toDate) => set({ toDate }),
      applyCustomRange: (fromDate, toDate) =>
        set({
          dateFilter: 'custom',
          fromDate: fromDate || '',
          toDate: toDate || ''
        }),
      applyFilterParams: ({ dateFilter, fromDate, toDate }) =>
        set(() => {
          if (dateFilter === 'custom') {
            return {
              dateFilter,
              fromDate: fromDate || '',
              toDate: toDate || ''
            };
          }
          if (dateFilter) {
            return {
              dateFilter,
              fromDate: '',
              toDate: ''
            };
          }
          return { ...defaultState };
        }),
      resetDateFilter: () => set({ ...defaultState })
    }),
    {
      name: 'global-date-filter',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

