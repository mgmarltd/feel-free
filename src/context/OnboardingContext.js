import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const [data, setData] = useState({
    age: null,
    gender: null,
    dailyRoutine: null,
    feeling: null,
    knowsEFT: null,
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
