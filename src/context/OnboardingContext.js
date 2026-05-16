import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const [data, setData] = useState({
    gender: null,
    stress: null,
    dob: null,
    dailyRoutine: null,
    feeling: null,
    knowsEFT: null,
    source: null,
    triedOtherApps: null,
    selfAnalysis: null,
    hasEFTCoach: null,
    goal: null,
    blocker: null,
    meditates: null,
    dailyCheckin: null,
    wantsDailyRelief: null,
    notifications: null,
    notificationsGranted: null,
    referralCode: null,
  });

  const updateData = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
