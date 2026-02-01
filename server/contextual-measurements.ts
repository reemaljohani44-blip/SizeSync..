// Contextual measurement filtering based on clothing type
// Different clothing types require different measurements for accurate sizing

export interface MeasurementContext {
  primary: string[];  // Critical measurements for this clothing type
  secondary: string[]; // Nice to have, but not essential
}

export const clothingMeasurementContext: Record<string, MeasurementContext> = {
  "t-shirt": {
    primary: ["chest", "waist", "shoulder"],
    secondary: ["armLength"],
  },
  "pants": {
    primary: ["waist", "hip", "inseam"],
    secondary: ["thighCircumference"],
  },
  "dress": {
    primary: ["chest", "waist", "hip"],
    secondary: ["shoulder", "thighCircumference"],
  },
  "jacket": {
    primary: ["chest", "shoulder", "armLength"],
    secondary: ["waist"],
  },
  "formal-shirt": {
    primary: ["chest", "shoulder", "armLength"],
    secondary: ["waist"],
  },
  "shorts": {
    primary: ["waist", "hip"],
    secondary: ["thighCircumference"],
  },
  "skirt": {
    primary: ["waist", "hip"],
    secondary: ["thighCircumference"],
  },
};

export function getRelevantMeasurements(clothingType: string): string[] {
  const context = clothingMeasurementContext[clothingType.toLowerCase()];
  if (!context) {
    // Fallback to all measurements if clothing type not found
    return ["chest", "waist", "hip", "shoulder", "armLength", "inseam", "thighCircumference"];
  }
  return [...context.primary, ...context.secondary];
}

export function getPrimaryMeasurements(clothingType: string): string[] {
  const context = clothingMeasurementContext[clothingType.toLowerCase()];
  if (!context) {
    return ["chest", "waist", "hip"];
  }
  return context.primary;
}

export function filterProfileMeasurements(
  profile: any,
  clothingType: string
): Record<string, number> {
  const relevantMeasurements = getRelevantMeasurements(clothingType);
  const filtered: Record<string, number> = {};
  
  // Always include height and weight as they're universally relevant
  filtered.height = profile.height;
  filtered.weight = profile.weight;
  
  // Add only relevant measurements for this clothing type
  relevantMeasurements.forEach((measurement) => {
    if (profile[measurement] !== undefined) {
      filtered[measurement] = profile[measurement];
    }
  });
  
  return filtered;
}

export function getMeasurementLabel(measurement: string): string {
  const labels: Record<string, string> = {
    height: "Height",
    weight: "Weight",
    chest: "Chest Circumference",
    waist: "Waist Circumference",
    hip: "Hip Circumference",
    shoulder: "Shoulder Width",
    armLength: "Arm Length",
    legLength: "Leg Length",
    inseam: "Inseam",
    thighCircumference: "Thigh Circumference",
    garmentLength: "Garment Length",
  };
  return labels[measurement] || measurement;
}

export function getMeasurementUnit(measurement: string): string {
  if (measurement === "weight") {
    return "kg";
  }
  return "cm";
}
