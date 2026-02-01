import OpenAI from "openai";
import type { Profile } from "@shared/schema";
import {
  filterProfileMeasurements,
  getMeasurementLabel,
  getPrimaryMeasurements,
} from "./contextual-measurements";
import { calculateSmartRecommendation, type SizeChartData } from "./smart-recommendation";

// Validate OpenAI API key is set
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  console.error("⚠️  WARNING: AI_INTEGRATIONS_OPENAI_API_KEY is not set in environment variables!");
  console.error("   Please add AI_INTEGRATIONS_OPENAI_API_KEY to your secrets");
  console.error("   Size recommendations will use Smart Recommendation Algorithm without AI image analysis.");
} else {
  console.log("✅ OpenAI API key found in environment variables");
  console.log("   Using standard OpenAI API endpoint: https://api.openai.com/v1");
}

// Using OpenAI API directly with API key only
const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      timeout: 24 * 60 * 60 * 1000,
      maxRetries: 2,
    })
  : null;

interface SizeChartAnalysis {
  extractedSizes: {
    [size: string]: {
      chest?: number;
      waist?: number;
      hip?: number;
      shoulder?: number;
      armLength?: number;
      legLength?: number;
      [key: string]: number | undefined;
    };
  };
  recommendedSize: string;
  confidence: "Perfect" | "Good" | "Loose";
  matchScore: number;
  analysis: string;
}

export async function analyzeSizeChart(
  imageBase64: string,
  profile: Profile,
  clothingType: string,
  fabricType: string
): Promise<SizeChartAnalysis> {
  // Check if OpenAI API key is configured
  if (!openai || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const errorMessage = "OpenAI API key (AI_INTEGRATIONS_OPENAI_API_KEY) is not configured. Please add it to your secrets to enable AI-powered size recommendations.";
    console.error("❌", errorMessage);
    throw new Error(errorMessage);
  }

  try {
    console.log("🤖 Starting AI-powered size chart analysis...");
    console.log(`   Clothing Type: ${clothingType}, Fabric Type: ${fabricType}`);
    
    // Extract base64 data if it includes the data URL prefix
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    // Filter measurements based on clothing type
    const relevantMeasurements = filterProfileMeasurements(profile, clothingType);
    const primaryMeasurements = getPrimaryMeasurements(clothingType);

    // Build measurement list for prompt
    const measurementList = Object.entries(relevantMeasurements)
      .map(([key, value]) => `- ${getMeasurementLabel(key)}: ${value} ${key === 'weight' ? 'kg' : 'cm'}${primaryMeasurements.includes(key) ? ' (Primary)' : ''}`)
      .join('\n');

    // Determine garment category for specialized instructions
    const isBottomGarment = ['pants', 'skirt', 'shorts', 'jeans', 'trousers'].includes(clothingType.toLowerCase());
    const isTopGarment = ['shirt', 't-shirt', 'tshirt', 'dress', 'jacket', 'blouse', 'sweater', 'top', 'formal shirt'].includes(clothingType.toLowerCase());
    
    const garmentSpecificInstructions = isBottomGarment 
      ? `
GARMENT TYPE: BOTTOM (${clothingType})
CRITICAL FOR BOTTOMS - Header Mapping Rules:
- "حزام بطول" (belt length) should be mapped to "waist" - this is a common Arabic term for waist measurement in size charts
- "قياس الخصر" or "محيط الخصر" = "waist" 
- "حجم الورك" or "محيط الورك" = "hip"
- "طول الساق" or "طول البنطلون" = "legLength" or "inseam"
- "محيط الفخذ" = "thighCircumference"
PRIORITY MEASUREMENTS FOR BOTTOMS: waist, hip, inseam, thighCircumference
`
      : isTopGarment 
        ? `
GARMENT TYPE: TOP (${clothingType})
PRIORITY MEASUREMENTS FOR TOPS: chest, shoulder, armLength, waist (for fitted tops)
`
        : `
GARMENT TYPE: ${clothingType}
Extract all available measurements.
`;

    const prompt = `You are a professional clothing size recommendation expert with advanced OCR capabilities for both English and Arabic text. Analyze this size chart image carefully and extract ALL measurements precisely.

Customer Profile:
${measurementList}
- Gender: ${profile.gender}

Clothing Type: ${clothingType}
Fabric Type: ${fabricType}
${garmentSpecificInstructions}

CRITICAL OCR INSTRUCTIONS - STRICT MAPPING ENFORCEMENT:

**RULE 1 - STRICT COLUMN MAPPING (ABSOLUTELY NO GUESSING):**
- ONLY extract measurements that are EXPLICITLY present as column headers in the image
- If a column header is NOT in the image, that measurement key MUST be omitted from the JSON output entirely
- NEVER assign the value of one column to another column's key
- Example: If the image has "waist" column but NO "chest" column, output waist values only - DO NOT include chest at all

**RULE 2 - COLUMN HEADER IDENTIFICATION:**
Map ONLY these Arabic/English headers to standardized keys:
   - "chest" ONLY for: صدر, chest, محيط الصدر, bust, قياس الصدر
   - "waist" ONLY for: خصر, محيط الخصر, قياس الخصر, حزام بطول, حزام, طول الحزام
   - "hip" ONLY for: ورك, hip, محيط الورك, hips, حجم الورك, قياس الورك
   - "shoulder" ONLY for: كتف, shoulder, عرض الكتف, قياس الكتف
   - "armLength" ONLY for: طول الذراع, arm length, طول الكم, طول الأكمام, sleeve length
   - "garmentLength" ONLY for: الطول, length, total length, body length (THIS IS GARMENT LENGTH, NOT WAIST!)
   - "inseam" ONLY for: طول الساق الداخلي, طول الرجل الداخلي, inseam, inside leg
   - "thighCircumference" ONLY for: محيط الفخذ, thigh, فخذ, قياس الفخذ
   - "legLength" ONLY for: طول البنطلون, طول الساق, leg length

**RULE 3 - HANDLE VALUE RANGES:**
- If the table shows a range (e.g., "83.8 - 86.4" or "83.8-86.4"), extract the MAXIMUM value (86.4)
- The garment must fit the largest part of the body, so always use the higher number

**RULE 4 - DO NOT CONFUSE SIMILAR TERMS:**
- "الطول" (Length) = garmentLength - THIS IS NOT WAIST!
- "محيط الخصر" or "خصر" = waist
- If a header is just "الطول" or "Length", it is garmentLength, NOT waist
- Only map to "waist" if header explicitly contains خصر (waist) or حزام (belt)

**RULE 5 - DATA INTEGRITY:**
- Sizes MUST be in logical order: XS < S < M < L < XL < XXL
- All values must be in CENTIMETERS (cm) as numbers only
- If a measurement is unclear or unreadable, OMIT it entirely rather than guess
- If the image is blurry or contains no size chart, return an error

**FINAL VALIDATION BEFORE RESPONDING:**
- Verify each size key in output corresponds to an actual column header in the image
- Confirm you have NOT invented any measurement columns
- Confirm ranges have been converted to maximum values

IMPORTANT - Contextual Measurement Focus:
${primaryMeasurements.length > 0 ? `For ${clothingType}, prioritize: ${primaryMeasurements.map(m => getMeasurementLabel(m)).join(', ')}` : ''}

Fabric Considerations:
- Stretchy: 5-8% tolerance (smaller sizes acceptable)
- Normal: 2-3% tolerance
- Rigid: 0% tolerance (may need size up)

VALIDATION: Before responding, verify:
- Each size has progressively larger measurements than the previous size
- All numbers are realistic (e.g., waist 60-120cm, chest 80-140cm)
- No duplicate or missing sizes
- Headers are correctly mapped (especially Arabic text like "حزام بطول" → waist)

Return ONLY valid JSON:
{
  "extractedSizes": {
    "S": { "chest": 85, "waist": 70, "hip": 90 },
    "M": { "chest": 90, "waist": 75, "hip": 95 },
    "L": { "chest": 95, "waist": 80, "hip": 100 }
  },
  "recommendedSize": "M",
  "confidence": "Perfect",
  "matchScore": 95,
  "analysis": "Detailed explanation...",
  "imageQuality": "good"
}

If the image cannot be read or contains no valid size chart, return:
{
  "extractedSizes": {},
  "recommendedSize": "",
  "confidence": "Loose",
  "matchScore": 0,
  "analysis": "ERROR: [specific reason why image could not be processed]",
  "imageQuality": "poor"
}`;

    console.log("📤 Sending request to OpenAI API...");
    console.log(`   Model: gpt-4o-mini (optimized for speed)`);
    console.log(`   Image detail: auto (adaptive processing)`);
    
    // Helper function to make OpenAI vision request
    const makeVisionRequest = async (model: string, detail: "low" | "high" | "auto") => {
      return await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2048,
      });
    };

    let response;
    let aiResult: SizeChartAnalysis;
    let usedFallback = false;

    try {
      // First attempt: gpt-4o-mini with auto detail (faster)
      response = await makeVisionRequest("gpt-4o-mini", "auto");
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("No response from AI");
      }
      
      aiResult = JSON.parse(content) as SizeChartAnalysis;
      
      // Check if extraction failed or returned empty - trigger fallback
      const imageQuality = (aiResult as any).imageQuality;
      if (imageQuality === 'poor' || 
          aiResult.analysis?.startsWith('ERROR:') || 
          !aiResult.extractedSizes || 
          Object.keys(aiResult.extractedSizes).length === 0) {
        throw new Error("gpt-4o-mini extraction failed, trying fallback");
      }
      
      console.log("✅ Received response from OpenAI API (gpt-4o-mini)");
    } catch (miniError: any) {
      // Fallback: gpt-4o with high detail for difficult images
      console.log("⚠️ gpt-4o-mini failed, trying gpt-4o with high detail...");
      console.log(`   Reason: ${miniError.message}`);
      usedFallback = true;
      
      try {
        response = await makeVisionRequest("gpt-4o", "high");
        const content = response.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error("No response from AI (fallback)");
        }
        
        aiResult = JSON.parse(content) as SizeChartAnalysis;
        console.log("✅ Received response from OpenAI API (gpt-4o fallback)");
      } catch (fallbackError: any) {
        console.error("❌ Both models failed:", fallbackError.message);
        throw new Error("Unable to analyze the size chart image. Please ensure the image is clear, well-lit, and contains a readable size chart table.");
      }
    }

    // Check if AI indicated image quality issues
    const imageQuality = (aiResult as any).imageQuality;
    if (imageQuality === 'poor' || aiResult.analysis?.startsWith('ERROR:')) {
      const errorReason = aiResult.analysis?.replace('ERROR:', '').trim() || 'Image could not be processed';
      console.error("❌ AI reported poor image quality:", errorReason);
      throw new Error(`Image processing failed: ${errorReason}. Please upload a clearer image of the size chart.`);
    }

    // Validate the response has extracted sizes
    if (!aiResult.extractedSizes || Object.keys(aiResult.extractedSizes).length === 0) {
      throw new Error("Could not extract size information from the image. Please ensure the image contains a clear, readable size chart with measurements.");
    }

    // Normalize measurement keys (handle Arabic/English variations including skirt/pants headers)
    const normalizedSizes: SizeChartData = {};
    const keyNormalization: Record<string, string> = {
      // Chest measurements
      'صدر': 'chest', 'محيط الصدر': 'chest', 'bust': 'chest', 'قياس الصدر': 'chest',
      // Waist measurements - including "حزام بطول" which is commonly used for skirts/pants
      'خصر': 'waist', 'محيط الخصر': 'waist', 'قياس الخصر': 'waist',
      'حزام بطول': 'waist', 'حزام': 'waist', 'طول الحزام': 'waist', 'belt length': 'waist',
      // Hip measurements
      'ورك': 'hip', 'محيط الورك': 'hip', 'hips': 'hip', 'حجم الورك': 'hip', 'قياس الورك': 'hip',
      // Shoulder measurements
      'كتف': 'shoulder', 'عرض الكتف': 'shoulder', 'قياس الكتف': 'shoulder',
      // Arm/sleeve measurements
      'طول الذراع': 'armLength', 'sleeve': 'armLength', 'طول الكم': 'armLength', 'طول الأكمام': 'armLength',
      // Garment/body length - NOT WAIST!
      'الطول': 'garmentLength', 'length': 'garmentLength', 'total length': 'garmentLength', 'body length': 'garmentLength',
      // Inseam/leg measurements
      'طول الساق الداخلي': 'inseam', 'طول الرجل الداخلي': 'inseam', 'inside leg': 'inseam',
      'طول الساق': 'legLength', 'طول البنطلون': 'legLength', 'leg length': 'legLength',
      // Thigh measurements
      'محيط الفخذ': 'thighCircumference', 'thigh': 'thighCircumference', 'فخذ': 'thighCircumference', 'قياس الفخذ': 'thighCircumference',
    };

    for (const [size, measurements] of Object.entries(aiResult.extractedSizes)) {
      normalizedSizes[size] = {};
      for (const [key, value] of Object.entries(measurements)) {
        const normalizedKey = keyNormalization[key.toLowerCase()] || key;
        if (typeof value === 'number' && value > 0) {
          normalizedSizes[size][normalizedKey] = value;
        }
      }
    }

    // Validate logical size progression
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL'];
    const extractedSizeNames = Object.keys(normalizedSizes);
    const sortedSizes = extractedSizeNames.sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase());
      const bIndex = sizeOrder.indexOf(b.toUpperCase());
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    let isLogicalProgression = true;
    for (let i = 1; i < sortedSizes.length; i++) {
      const prevSize = normalizedSizes[sortedSizes[i - 1]];
      const currSize = normalizedSizes[sortedSizes[i]];
      
      // Check if at least one key measurement increases
      const keyMeasurements = ['chest', 'waist', 'hip'];
      let hasProgression = false;
      for (const key of keyMeasurements) {
        if (prevSize[key] && currSize[key] && currSize[key]! > prevSize[key]!) {
          hasProgression = true;
          break;
        }
      }
      if (Object.keys(currSize).length > 0 && !hasProgression) {
        isLogicalProgression = false;
        console.warn(`⚠️ Size progression issue: ${sortedSizes[i-1]} -> ${sortedSizes[i]}`);
      }
    }

    if (!isLogicalProgression) {
      console.warn("⚠️ Size chart may have OCR errors - progression is not strictly increasing");
    }

    // Use normalized sizes
    aiResult.extractedSizes = normalizedSizes;

    console.log(`📊 AI extracted ${Object.keys(aiResult.extractedSizes).length} sizes from the image`);

    // Use Smart Recommendation Algorithm to calculate the best size
    // This ensures consistent recommendation logic regardless of input method
    console.log("🧮 Applying Smart Recommendation Algorithm to extracted size chart data...");
    const smartRecommendation = calculateSmartRecommendation(
      profile,
      aiResult.extractedSizes,
      clothingType,
      fabricType
    );

    // Combine AI-extracted size chart with smart recommendation results
    const result: SizeChartAnalysis = {
      extractedSizes: smartRecommendation.extractedSizes,
      recommendedSize: smartRecommendation.recommendedSize,
      confidence: smartRecommendation.confidence,
      matchScore: smartRecommendation.matchScore,
      // Include AI's analysis insights along with smart recommendation analysis
      analysis: `**AI-Extracted Size Chart Analysis:**\n\n${aiResult.analysis || 'Size chart data successfully extracted from image.'}\n\n---\n\n**Smart Recommendation Calculation:**\n\n${smartRecommendation.analysis}`,
    };

    console.log(`✨ AI + Smart Recommendation Complete: Recommended Size ${result.recommendedSize} (${result.confidence} fit, ${result.matchScore}% match)`);
    return result;
  } catch (error: any) {
    console.error("❌ Error analyzing size chart with AI:", error);
    console.error("   Error details:", {
      code: error.code,
      cause: error.cause?.code,
      message: error.message,
      type: error.type,
    });
    
    // Handle connection errors - check multiple ways the error might be structured
    const isConnectionError = 
      error.code === 'ECONNREFUSED' || 
      error.cause?.code === 'ECONNREFUSED' ||
      error.type === 'connection_error' ||
      error.message?.includes("Connection error") ||
      error.message?.includes("ECONNREFUSED") ||
      (error.cause && error.cause.code === 'ECONNREFUSED');
    
    if (isConnectionError) {
      const connectionError = new Error("Cannot connect to OpenAI API. Please check your network connection and ensure AI_INTEGRATIONS_OPENAI_API_KEY is correctly set. Alternatively, you can provide size chart data manually instead of uploading an image.");
      (connectionError as any).code = 'ECONNREFUSED';
      throw connectionError;
    }
    
    // If it's an API key error, throw it directly
    if (error.message?.includes("API key") || error.message?.includes("authentication") || error.status === 401) {
      throw new Error("OpenAI API authentication failed. Please check that AI_INTEGRATIONS_OPENAI_API_KEY is correctly set.");
    }
    
    // Handle timeout errors
    if (error.message?.includes("timeout") || error.code === 'ETIMEDOUT') {
      throw new Error("OpenAI API request timed out. Please try again or provide size chart data manually.");
    }
    
    // For other errors, throw with context
    throw new Error(`AI analysis failed: ${error.message || "Unknown error"}. Please ensure the size chart image is clear and the OpenAI API key is valid. Alternatively, you can provide size chart data manually.`);
  }
}
