import { create } from 'zustand';

/**
 * Which city, if any, the Footprints stage is showing.
 *
 * `selectedPhoto` used to live here too — it was the index of the photo the
 * old carousel was parked on, and it doubled as the flag for "the visitor has
 * clicked past the story into the gallery". Both the carousel and the two-tier
 * split are gone: the city panel now shows the story with the whole roll
 * stacked underneath it, so there is no current photo to track and no second
 * tier to be on. One city, open or not, is the entire state.
 */
interface FootprintsStore {
  activeCity: string | null;
  setActiveCity: (cityId: string | null) => void;
  closeAll: () => void;
}

export const useFootprintsStore = create<FootprintsStore>((set) => ({
  activeCity: null,
  setActiveCity: (cityId) => set({ activeCity: cityId }),
  closeAll: () => set({ activeCity: null }),
}));
