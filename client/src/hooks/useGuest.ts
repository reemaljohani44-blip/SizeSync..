import { useState, useEffect, useCallback } from "react";

const GUEST_STORAGE_KEY = "sizesync_guest_session";
const GUEST_PROFILE_KEY = "sizesync_guest_profile";
const GUEST_RECOMMENDATION_KEY = "sizesync_guest_recommendation";

export interface GuestProfile {
  name: string;
  age?: number;
  gender: "male" | "female" | "other";
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder?: number;
  armLength?: number;
  inseam?: number;
}

export interface GuestRecommendation {
  clothingType: string;
  fabricType: string;
  recommendedSize: string;
  confidence: string;
  overallScore: number;
  analysis: any;
  sizeChartData?: Record<string, Record<string, number>>;
  createdAt: string;
}

export function useGuest() {
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [guestProfile, setGuestProfileState] = useState<GuestProfile | null>(null);
  const [guestRecommendation, setGuestRecommendationState] = useState<GuestRecommendation | null>(null);

  useEffect(() => {
    const guestSession = sessionStorage.getItem(GUEST_STORAGE_KEY);
    setIsGuest(guestSession === "true");

    const savedProfile = sessionStorage.getItem(GUEST_PROFILE_KEY);
    if (savedProfile) {
      try {
        setGuestProfileState(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse guest profile:", e);
      }
    }

    const savedRec = sessionStorage.getItem(GUEST_RECOMMENDATION_KEY);
    if (savedRec) {
      try {
        setGuestRecommendationState(JSON.parse(savedRec));
      } catch (e) {
        console.error("Failed to parse guest recommendation:", e);
      }
    }
  }, []);

  const startGuestSession = useCallback(() => {
    sessionStorage.setItem(GUEST_STORAGE_KEY, "true");
    setIsGuest(true);
  }, []);

  const endGuestSession = useCallback(() => {
    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    sessionStorage.removeItem(GUEST_PROFILE_KEY);
    sessionStorage.removeItem(GUEST_RECOMMENDATION_KEY);
    sessionStorage.removeItem("sizesync_guest_clothing_type");
    setIsGuest(false);
    setGuestProfileState(null);
    setGuestRecommendationState(null);
  }, []);

  const setGuestProfile = useCallback((profile: GuestProfile) => {
    sessionStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
    setGuestProfileState(profile);
  }, []);

  const setGuestRecommendation = useCallback((recommendation: GuestRecommendation) => {
    sessionStorage.setItem(GUEST_RECOMMENDATION_KEY, JSON.stringify(recommendation));
    setGuestRecommendationState(recommendation);
  }, []);

  const clearGuestData = useCallback(() => {
    sessionStorage.removeItem(GUEST_PROFILE_KEY);
    sessionStorage.removeItem(GUEST_RECOMMENDATION_KEY);
    setGuestProfileState(null);
    setGuestRecommendationState(null);
  }, []);

  return {
    isGuest,
    guestProfile,
    guestRecommendation,
    startGuestSession,
    endGuestSession,
    setGuestProfile,
    setGuestRecommendation,
    clearGuestData,
  };
}
