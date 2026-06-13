import { db } from "@workspace/db";
import {
  usersTable,
  userSettingsTable,
  locationsTable,
  activityTemplatesTable,
  routinePrescriptionsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const SEED_EMAIL = "sharan@ghost.coach";

export async function seedIfEmpty(): Promise<void> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, SEED_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    logger.info("Seed already applied, skipping.");
    return;
  }

  logger.info("Seeding initial data...");

  const [user] = await db
    .insert(usersTable)
    .values({
      email: SEED_EMAIL,
      displayName: "Sharan",
      timezone: "Asia/Kolkata",
    })
    .returning();

  if (!user) throw new Error("Failed to insert user");

  await db.insert(userSettingsTable).values({
    userId: user.id,
    morningBriefLocalTime: "07:30",
    dayStartLocalTime: "07:00",
    dayEndLocalTime: "21:30",
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    targetActiveDaysPerWeek: 4,
    minimumFreeWindowMinutes: 10,
    transitionBufferMinutes: 10,
    coachingIntensity: 3,
    maxNudgesPerDay: 4,
    calendarWriteEnabled: true,
    weatherHeatThresholdC: 35,
    weatherRainProbabilityLimit: 60,
    weatherWindLimitKph: 40,
    preferCompletionOverProgression: true,
    weeklyReviewDay: "Sunday",
    weeklyReviewLocalTime: "20:30",
  });

  const [goaHome] = await db
    .insert(locationsTable)
    .values({
      userId: user.id,
      label: "Goa – Home",
      latitude: 15.2993,
      longitude: 74.124,
      timezone: "Asia/Kolkata",
      locationType: "home",
      hasFloorSpace: true,
      hasPool: false,
      hasStairs: false,
      hasIndoorWalk: false,
      hasShower: true,
      publicPrivacyLevel: "private",
      typicalTravelOverheadMinutes: 0,
      isDefault: true,
    })
    .returning();

  await db.insert(locationsTable).values({
    userId: user.id,
    label: "Mumbai – Hotel",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    locationType: "hotel",
    hasFloorSpace: true,
    hasPool: true,
    hasStairs: false,
    hasIndoorWalk: true,
    hasShower: true,
    publicPrivacyLevel: "semi_public",
    typicalTravelOverheadMinutes: 10,
    isDefault: false,
  });

  await db.insert(locationsTable).values({
    userId: user.id,
    label: "Mumbai Airport – Terminal 2",
    latitude: 19.0896,
    longitude: 72.8656,
    timezone: "Asia/Kolkata",
    locationType: "airport",
    hasFloorSpace: false,
    hasPool: false,
    hasStairs: true,
    hasIndoorWalk: true,
    hasShower: false,
    publicPrivacyLevel: "public",
    typicalTravelOverheadMinutes: 20,
    isDefault: false,
  });

  await db.insert(locationsTable).values({
    userId: user.id,
    label: "Coffee Shop",
    latitude: 15.4909,
    longitude: 73.8278,
    timezone: "Asia/Kolkata",
    locationType: "coffee_shop",
    hasFloorSpace: false,
    hasPool: false,
    hasStairs: false,
    hasIndoorWalk: false,
    hasShower: false,
    publicPrivacyLevel: "public",
    typicalTravelOverheadMinutes: 5,
    isDefault: false,
  });

  const [walkTemplate] = await db
    .insert(activityTemplatesTable)
    .values({
      userId: user.id,
      name: "Morning Walk",
      category: "walk",
      goalTags: ["movement", "consistency", "outdoor"],
      minimumMinutes: 15,
      preferredMinutes: 30,
      maximumMinutes: 60,
      intensity: "low",
      requiresFloorSpace: false,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "public",
      publicSuitability: "visible",
      weatherMode: "outdoor",
      allowedLocationTypes: [],
      preferenceScore: 80,
      active: true,
      isPhysioApproved: false,
    })
    .returning();

  await db.insert(activityTemplatesTable).values({
    userId: user.id,
    name: "Indoor Walk",
    category: "walk",
    goalTags: ["movement", "consistency"],
    minimumMinutes: 10,
    preferredMinutes: 20,
    maximumMinutes: 45,
    intensity: "low",
    requiresFloorSpace: false,
    requiresPool: false,
    requiresStairs: false,
    requiresShower: false,
    requiresEquipment: [],
    minimumPrivacy: "public",
    publicSuitability: "visible",
    weatherMode: "either",
    allowedLocationTypes: ["hotel", "airport", "mall", "coworking"],
    preferenceScore: 60,
    active: true,
    isPhysioApproved: false,
  });

  await db.insert(activityTemplatesTable).values({
    userId: user.id,
    name: "Desk Stretches",
    category: "stretch",
    goalTags: ["mobility", "recovery"],
    minimumMinutes: 5,
    preferredMinutes: 10,
    maximumMinutes: 20,
    intensity: "low",
    requiresFloorSpace: false,
    requiresPool: false,
    requiresStairs: false,
    requiresShower: false,
    requiresEquipment: [],
    minimumPrivacy: "semi_public",
    publicSuitability: "discreet",
    weatherMode: "either",
    allowedLocationTypes: [],
    preferenceScore: 55,
    active: true,
    isPhysioApproved: false,
  });

  const [physioTemplate] = await db
    .insert(activityTemplatesTable)
    .values({
      userId: user.id,
      name: "Physio Routine",
      category: "physio",
      goalTags: ["rehab", "physio"],
      minimumMinutes: 15,
      preferredMinutes: 25,
      maximumMinutes: 40,
      intensity: "moderate",
      requiresFloorSpace: true,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "private",
      publicSuitability: "not_suitable",
      weatherMode: "either",
      allowedLocationTypes: [],
      preferenceScore: 90,
      active: true,
      isPhysioApproved: false,
      instructionsMarkdown: null,
    })
    .returning();

  await db.insert(activityTemplatesTable).values({
    userId: user.id,
    name: "Swimming",
    category: "swim",
    goalTags: ["movement", "cardio"],
    minimumMinutes: 20,
    preferredMinutes: 30,
    maximumMinutes: 60,
    intensity: "moderate",
    requiresFloorSpace: false,
    requiresPool: true,
    requiresStairs: false,
    requiresShower: true,
    requiresEquipment: ["swimwear", "goggles"],
    minimumPrivacy: "semi_public",
    publicSuitability: "visible",
    weatherMode: "either",
    allowedLocationTypes: [],
    preferenceScore: 75,
    active: true,
    isPhysioApproved: false,
  });

  await db.insert(activityTemplatesTable).values([
    {
      userId: user.id,
      name: "Short Yoga",
      category: "yoga",
      goalTags: ["mobility", "recovery"],
      minimumMinutes: 10,
      preferredMinutes: 20,
      maximumMinutes: 30,
      intensity: "low",
      requiresFloorSpace: true,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "private",
      publicSuitability: "private_only",
      weatherMode: "indoor",
      allowedLocationTypes: ["home", "hotel", "friend_house"],
      preferenceScore: 70,
      active: true,
      isPhysioApproved: false,
    },
    {
      userId: user.id,
      name: "Free Body-Weight Session",
      category: "strength",
      goalTags: ["movement", "strength"],
      minimumMinutes: 8,
      preferredMinutes: 15,
      maximumMinutes: 25,
      intensity: "moderate",
      requiresFloorSpace: true,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "private",
      publicSuitability: "private_only",
      weatherMode: "indoor",
      allowedLocationTypes: ["home", "hotel", "gym", "friend_house"],
      preferenceScore: 55,
      active: true,
      isPhysioApproved: false,
    },
    {
      userId: user.id,
      name: "Stairs",
      category: "stairs",
      goalTags: ["movement", "cardio"],
      minimumMinutes: 5,
      preferredMinutes: 10,
      maximumMinutes: 15,
      intensity: "moderate",
      requiresFloorSpace: false,
      requiresPool: false,
      requiresStairs: true,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "public",
      publicSuitability: "visible",
      weatherMode: "either",
      allowedLocationTypes: [],
      preferenceScore: 50,
      active: true,
      isPhysioApproved: false,
    },
    {
      userId: user.id,
      name: "Recovery Movement",
      category: "recovery",
      goalTags: ["movement", "recovery"],
      minimumMinutes: 5,
      preferredMinutes: 10,
      maximumMinutes: 20,
      intensity: "low",
      requiresFloorSpace: false,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "public",
      publicSuitability: "discreet",
      weatherMode: "either",
      allowedLocationTypes: [],
      preferenceScore: 60,
      active: true,
      isPhysioApproved: false,
    },
  ]);

  if (physioTemplate) {
    await db.insert(routinePrescriptionsTable).values({
      userId: user.id,
      activityTemplateId: physioTemplate.id,
      sourceLabel: "Physiotherapist — enter your actual exercises",
      approvedOrPrescribedBy: null,
      targetFrequencyPerWeek: 3,
      minimumGapHours: 24,
      validFrom: new Date(),
      reviewAfter: null,
      notes:
        "IMPORTANT: Instructions not set. Please edit this routine to add your actual physiotherapist exercises before activating.",
      active: false,
    });
  }

  logger.info({ userId: user.id }, "Seed complete");
}
