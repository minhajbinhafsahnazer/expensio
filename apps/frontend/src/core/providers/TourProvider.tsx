import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export interface TourStepConfig {
  id: string;
  route: string;
}

const TOUR_STEPS: TourStepConfig[] = [
  { id: "monthly-overview", route: "/" },
  { id: "recent-transactions", route: "/" },
  { id: "analytics-insights", route: "/analytics" },
  { id: "portfolio-goals", route: "/portfolio" },
];

interface TourContextType {
  isActive: boolean;
  currentStepId: string | null;
  isLastStep: boolean;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const tourStorageKey = user ? `expencio_tour_seen_${user.id}` : "expencio_tour_seen_guest";

  const startTour = () => {
    setIsActive(true);
    setCurrentIndex(0);
    navigate("/");
  };

  const skipTour = () => {
    setIsActive(false);
    localStorage.setItem(tourStorageKey, "true");
  };

  const nextStep = () => {
    if (currentIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentIndex + 1;
      const currentRoute = TOUR_STEPS[currentIndex].route;
      const nextRoute = TOUR_STEPS[nextIdx].route;
      
      setCurrentIndex(nextIdx);
      
      if (currentRoute !== nextRoute) {
        navigate(nextRoute);
      }
    } else {
      skipTour(); // Finish tour
    }
  };

  const currentStepId = isActive ? TOUR_STEPS[currentIndex].id : null;
  const isLastStep = isActive && currentIndex === TOUR_STEPS.length - 1;

  return (
    <TourContext.Provider value={{ isActive, currentStepId, isLastStep, startTour, nextStep, skipTour }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};
