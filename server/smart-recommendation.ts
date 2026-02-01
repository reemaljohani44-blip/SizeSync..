import type { Profile } from "@shared/schema";
import {
  filterProfileMeasurements,
  getPrimaryMeasurements,
  getMeasurementLabel,
} from "./contextual-measurements";

export interface SizeChartData {
  [size: string]: {
    chest?: number;
    waist?: number;
    hip?: number;
    shoulder?: number;
    armLength?: number;
    legLength?: number;
    [key: string]: number | undefined;
  };
}

export interface RecommendationResult {
  extractedSizes: SizeChartData;
  recommendedSize: string;
  confidence: "Perfect" | "Good" | "Loose";
  matchScore: number;
  analysis: string;
}

interface SizeScore {
  size: string;
  score: number;
  matches: Record<string, { user: number; chart: number; difference: number; match: boolean }>;
  primaryMatches: number;
  totalMatches: number;
  allCriticalFit: boolean;
}

interface ExceededMeasurement {
  name: string;
  userValue: number;
  chartValue: number;
  excess: number;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

function getSizeIndex(size: string): number {
  const normalized = size.toUpperCase().trim();
  const index = SIZE_ORDER.indexOf(normalized);
  return index === -1 ? 999 : index;
}

export function calculateSmartRecommendation(
  userProfile: Profile,
  sizeChartData: SizeChartData,
  clothingType: string,
  fabricType: string
): RecommendationResult {
  const userMeasurements = filterProfileMeasurements(userProfile, clothingType);
  const primaryMeasurements = getPrimaryMeasurements(clothingType);

  const fabricTolerances: Record<string, { 
    tightPrimary: number;
    tightSecondary: number;
    loosePrimary: number;
    looseSecondary: number;
  }> = {
    stretchy: { tightPrimary: 0.08, tightSecondary: 0.10, loosePrimary: 0.03, looseSecondary: 0.05 },
    normal: { tightPrimary: 0.03, tightSecondary: 0.05, loosePrimary: 0.03, looseSecondary: 0.05 },
    rigid: { tightPrimary: 0.02, tightSecondary: 0.02, loosePrimary: 0.05, looseSecondary: 0.05 },
  };

  const tolerance = fabricTolerances[fabricType] || fabricTolerances.normal;

  // CRITICAL FIX: Determine which measurements are actually available in the size chart
  // Only compare measurements that exist in the extracted size chart data
  const sizeChartEntries = Object.values(sizeChartData);
  const availableMeasurementsInChart = new Set<string>();
  
  for (const sizeData of sizeChartEntries) {
    for (const [key, value] of Object.entries(sizeData)) {
      if (value !== undefined && value !== null && typeof value === 'number' && value > 0) {
        availableMeasurementsInChart.add(key);
      }
    }
  }
  
  // Filter primary measurements to only those actually present in the size chart
  const availablePrimaryMeasurements = primaryMeasurements.filter(m => availableMeasurementsInChart.has(m));
  
  console.log(`📊 Size chart contains measurements: [${Array.from(availableMeasurementsInChart).join(', ')}]`);
  console.log(`🎯 Available primary measurements for ${clothingType}: [${availablePrimaryMeasurements.join(', ')}]`);
  
  // Warn if expected primary measurements are missing from the chart
  const missingPrimary = primaryMeasurements.filter(m => !availableMeasurementsInChart.has(m));
  if (missingPrimary.length > 0) {
    console.warn(`⚠️ Size chart is missing primary measurements: [${missingPrimary.join(', ')}] - these will be skipped in comparison`);
  }

  const sizeScores: SizeScore[] = [];

  for (const [size, chartMeasurements] of Object.entries(sizeChartData)) {
    const matches: Record<string, { user: number; chart: number; difference: number; match: boolean }> = {};
    let primaryMatchCount = 0;
    let totalMatchCount = 0;
    let totalScore = 0;
    let measurementCount = 0;
    let allCriticalFit = true;

    for (const [measurement, userValue] of Object.entries(userMeasurements)) {
      const chartValue = chartMeasurements[measurement];
      
      // STRICT NULL CHECK: Only proceed if:
      // 1. chartValue exists in the size chart
      // 2. chartValue is a valid number > 0
      // 3. The measurement exists in our availableMeasurementsInChart set
      if (
        chartValue === undefined || 
        chartValue === null || 
        typeof chartValue !== 'number' || 
        chartValue <= 0 ||
        !availableMeasurementsInChart.has(measurement)
      ) {
        // Skip this measurement - size chart doesn't have valid data for it
        continue;
      }

      measurementCount++;
      
      const signedDiff = chartValue - userValue;
      const signedPercentDiff = (signedDiff / userValue) * 100;
      const absPercentDiff = Math.abs(signedPercentDiff);
      
      const isPrimary = availablePrimaryMeasurements.includes(measurement);
      
      let maxTolerancePercent: number;
      if (signedDiff < 0) {
        maxTolerancePercent = (isPrimary ? tolerance.tightPrimary : tolerance.tightSecondary) * 100;
      } else {
        maxTolerancePercent = (isPrimary ? tolerance.loosePrimary : tolerance.looseSecondary) * 100;
      }

      const isGoodFit = absPercentDiff <= maxTolerancePercent;

      if (isPrimary && !isGoodFit) {
        allCriticalFit = false;
      }

      matches[measurement] = {
        user: userValue,
        chart: chartValue,
        difference: signedDiff,
        match: isGoodFit,
      };

      let measurementScore = 0;
      if (absPercentDiff === 0) {
        measurementScore = 100;
      } else if (absPercentDiff <= maxTolerancePercent) {
        measurementScore = 100 - (absPercentDiff / maxTolerancePercent) * 20;
        
        if (fabricType === "stretchy" && signedDiff < 0) {
          measurementScore = Math.min(100, measurementScore + 10);
        }
      } else {
        const excessDiff = absPercentDiff - maxTolerancePercent;
        measurementScore = Math.max(0, 80 - (excessDiff / 10) * 20);
      }

      const weight = isPrimary ? 2 : 1;
      totalScore += measurementScore * weight;

      if (isGoodFit) {
        totalMatchCount++;
        if (isPrimary) {
          primaryMatchCount++;
        }
      }
    }

    const weightedScore = measurementCount > 0 ? totalScore / (measurementCount * 1.5) : 0;

    sizeScores.push({
      size,
      score: weightedScore,
      matches,
      primaryMatches: primaryMatchCount,
      totalMatches: totalMatchCount,
      allCriticalFit,
    });
  }

  sizeScores.sort((a, b) => getSizeIndex(a.size) - getSizeIndex(b.size));

  const availableSizes = sizeScores.map(s => s.size);
  console.log(`📏 Available sizes from chart: [${availableSizes.join(', ')}]`);
  console.log(`👤 User measurements:`, userMeasurements);
  console.log(`🎯 Using available primary measurements for comparison: [${availablePrimaryMeasurements.join(', ')}]`);

  let bestMatch: SizeScore | null = null;
  let exceededMeasurements: ExceededMeasurement[] = [];
  let isLargestSizeFallback = false;

  for (const sizeScore of sizeScores) {
    let allMeasurementsAccommodated = true;
    
    // CRITICAL: Only iterate over measurements that exist in the chart
    for (const measurement of availablePrimaryMeasurements) {
      const match = sizeScore.matches[measurement];
      if (!match) continue;
      
      const chartValue = match.chart;
      const userValue = match.user;
      
      const looseTolerance = tolerance.loosePrimary * userValue;
      const maxUserValue = chartValue + looseTolerance;
      
      if (userValue > maxUserValue) {
        allMeasurementsAccommodated = false;
        break;
      }
    }
    
    if (allMeasurementsAccommodated) {
      bestMatch = sizeScore;
      break;
    }
  }

  if (!bestMatch) {
    isLargestSizeFallback = true;
    const largestSize = sizeScores[sizeScores.length - 1];
    bestMatch = largestSize;
    console.log(`⚠️ No size fits all measurements. Falling back to largest available size: ${bestMatch?.size}`);
    
    if (bestMatch) {
      // Only check measurements that exist in the chart
      for (const measurement of availablePrimaryMeasurements) {
        const match = bestMatch.matches[measurement];
        if (!match) continue;
        
        const chartValue = match.chart;
        const userValue = match.user;
        
        if (userValue > chartValue) {
          exceededMeasurements.push({
            name: measurement,
            userValue,
            chartValue,
            excess: userValue - chartValue,
          });
          console.log(`   ❌ ${measurement}: User ${userValue}cm exceeds Size ${bestMatch.size} (${chartValue}cm) by ${(userValue - chartValue).toFixed(1)}cm`);
        }
      }
    }
  } else {
    console.log(`✅ Found fitting size: ${bestMatch.size}`);
  }

  if (!bestMatch) {
    throw new Error("No size chart data available for comparison");
  }

  let confidence: "Perfect" | "Good" | "Loose";
  // CRITICAL: Compare against available primary measurements, not all theoretical ones
  const allPrimaryMatch = availablePrimaryMeasurements.length > 0 && 
    bestMatch.primaryMatches === availablePrimaryMeasurements.length;
  const highScore = bestMatch.score >= 85;

  if (isLargestSizeFallback) {
    confidence = "Loose";
  } else if (allPrimaryMatch && highScore && bestMatch.score >= 95) {
    confidence = "Perfect";
  } else if (allPrimaryMatch && bestMatch.score >= 75) {
    confidence = "Good";
  } else {
    confidence = "Loose";
  }

  const matchScore = Math.round(bestMatch.score);

  const allScoresSorted = [...sizeScores].sort((a, b) => b.score - a.score);
  
  const analysis = generateAnalysis(
    bestMatch,
    userMeasurements,
    availablePrimaryMeasurements, // Only pass measurements that exist in chart
    clothingType,
    fabricType,
    allScoresSorted,
    isLargestSizeFallback,
    exceededMeasurements,
    missingPrimary // Pass missing measurements for user awareness
  );

  return {
    extractedSizes: sizeChartData,
    recommendedSize: bestMatch.size,
    confidence,
    matchScore,
    analysis,
  };
}

function generateAnalysis(
  bestMatch: SizeScore,
  userMeasurements: Record<string, number>,
  primaryMeasurements: string[],
  clothingType: string,
  fabricType: string,
  allScores: SizeScore[],
  isLargestSizeFallback: boolean = false,
  exceededMeasurements: ExceededMeasurement[] = [],
  missingMeasurements: string[] = []
): string {
  const lines: string[] = [];
  
  if (isLargestSizeFallback && exceededMeasurements.length > 0) {
    lines.push(`⚠️ **Important Notice:** Your measurements exceed the largest available size in this size chart.`);
    lines.push("");
    lines.push(`We recommend **Size ${bestMatch.size}** as it is the largest available size, but please note:`);
    lines.push("");
    lines.push("**Measurements that exceed the largest size:**");
    exceededMeasurements.forEach((exceeded) => {
      lines.push(`- **${getMeasurementLabel(exceeded.name)}**: Your ${exceeded.userValue}cm exceeds Size ${bestMatch.size} (${exceeded.chartValue}cm) by ${exceeded.excess.toFixed(1)}cm`);
    });
    lines.push("");
    lines.push("*Consider looking for this item in a store with larger size options, or check if the brand offers extended sizes.*");
    lines.push("");
  } else {
    lines.push(`Based on your measurements and the size chart, we recommend **Size ${bestMatch.size}** for this ${clothingType}.`);
    lines.push("");
  }

  if (primaryMeasurements.length > 0) {
    lines.push("**Primary Measurements Analysis:**");
    primaryMeasurements.forEach((measurement) => {
      const match = bestMatch.matches[measurement];
      if (match) {
        const isExceeded = exceededMeasurements.some(e => e.name === measurement);
        const status = isExceeded ? "❌" : (match.match ? "✓" : "⚠");
        const diffText = match.difference > 0 
          ? `${match.difference.toFixed(1)}cm larger`
          : match.difference < 0 
            ? `${Math.abs(match.difference).toFixed(1)}cm smaller`
            : "perfect match";
        lines.push(`- ${getMeasurementLabel(measurement)}: ${status} Your ${match.user}cm vs Size ${bestMatch.size} ${match.chart}cm (${diffText})`);
      }
    });
    lines.push("");
  }
  
  // Note about measurements that were expected but not in the size chart
  if (missingMeasurements.length > 0) {
    lines.push("**Note:** The following measurements were not available in this size chart:");
    missingMeasurements.forEach((measurement) => {
      lines.push(`- ${getMeasurementLabel(measurement)} (not included in size chart)`);
    });
    lines.push("");
  }

  lines.push(`**Fabric Type: ${fabricType.charAt(0).toUpperCase() + fabricType.slice(1)}**`);
  if (fabricType === "stretchy") {
    lines.push("- Stretchy fabrics can accommodate slightly tighter measurements (up to 8% tolerance)");
  } else if (fabricType === "normal") {
    lines.push("- Normal fabrics have standard fit with moderate tolerance (3% for primary measurements)");
  } else if (fabricType === "rigid") {
    lines.push("- Rigid fabrics have minimal stretch, so we recommend a size that fits comfortably without being too tight");
  }
  lines.push("");

  if (!isLargestSizeFallback) {
    lines.push(`**Overall Match Score: ${Math.round(bestMatch.score)}%**`);
    if (bestMatch.score >= 95) {
      lines.push("This size provides an excellent fit with all critical measurements matching well.");
    } else if (bestMatch.score >= 85) {
      lines.push("This size provides a good fit with most measurements matching within acceptable tolerance.");
    } else if (bestMatch.score >= 75) {
      lines.push("This size provides a reasonable fit, though some measurements may be slightly off.");
    } else {
      lines.push("This is the closest available size, but you may want to consider trying it on or checking if other sizes are available.");
    }
  }

  if (allScores.length > 1 && !isLargestSizeFallback) {
    const alternatives = allScores.slice(1, 3).filter((s: SizeScore) => s.score >= 70);
    if (alternatives.length > 0) {
      lines.push("");
      lines.push("**Alternative Sizes to Consider:**");
      alternatives.forEach((alt: SizeScore) => {
        lines.push(`- Size ${alt.size}: ${Math.round(alt.score)}% match`);
      });
    }
  }

  return lines.join("\n");
}
