import type { Request } from "express";
import { db } from "@workspace/db";
import {
  activityTemplatesTable,
  locationsTable,
  routinePrescriptionsTable,
  userSettingsTable,
  usersTable,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { getRequestUser } from "./request-context";

const DEFAULT_EMAIL = "sharan@ghost.coach";

export function requireRequestUser(req: Request) {
  const user = getRequestUser(req);
  if (!user) {
    throw new Error("Authenticated user missing from request context");
  }
  return user;
}

async function seedUserDefaults(userId: string): Promise<void> {
  const existingSettings = await db
    .select({ id: userSettingsTable.id })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);

  if (existingSettings.length > 0) {
    return;
  }

  await db.insert(userSettingsTable).values({
    userId,
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

  await db
    .insert(locationsTable)
    .values({
      userId,
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
    });

  await db.insert(locationsTable).values([
    {
      userId,
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
    },
    {
      userId,
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
    },
    {
      userId,
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
    },
  ]);

  await db.insert(activityTemplatesTable).values([
    {
      userId,
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
      isPhysioApproved: false,
      active: true,
    },
    {
      userId,
      name: "Indoor Walk",
      category: "walk",
      goalTags: ["movement", "travel"],
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
      allowedLocationTypes: ["hotel", "airport", "coworking", "mall"],
      preferenceScore: 65,
      isPhysioApproved: false,
      active: true,
    },
    {
      userId,
      name: "Desk Stretches",
      category: "stretch",
      goalTags: ["mobility"],
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
      preferenceScore: 55,
      isPhysioApproved: false,
      active: true,
    },
    {
      userId,
      name: "Short Yoga",
      category: "yoga",
      goalTags: ["mobility", "recovery"],
      minimumMinutes: 10,
      preferredMinutes: 20,
      maximumMinutes: 40,
      intensity: "low",
      requiresFloorSpace: true,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
      requiresEquipment: [],
      minimumPrivacy: "private",
      publicSuitability: "not_suitable",
      weatherMode: "either",
      allowedLocationTypes: [],
      preferenceScore: 60,
      isPhysioApproved: false,
      active: true,
    },
    {
      userId,
      name: "Physio Routine",
      category: "physio",
      goalTags: ["rehab"],
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
      isPhysioApproved: false,
      active: true,
    },
  ]);

  const [physioTemplate] = await db
    .select({ id: activityTemplatesTable.id })
    .from(activityTemplatesTable)
    .where(
      and(
        eq(activityTemplatesTable.userId, userId),
        eq(activityTemplatesTable.category, "physio"),
        eq(activityTemplatesTable.name, "Physio Routine"),
      ),
    );

  if (physioTemplate) {
    await db.insert(routinePrescriptionsTable).values({
      userId,
      activityTemplateId: physioTemplate.id,
      sourceLabel: "Seed",
      targetFrequencyPerWeek: 3,
      minimumGapHours: 18,
      validFrom: new Date(),
      active: false,
    });
  }
}

export async function ensureGhostCoachUser(params: {
  email: string;
  displayName: string;
  timezone?: string;
}) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, params.email))
    .limit(1);

  let user = existing[0];

  if (!user) {
    const fallback = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, DEFAULT_EMAIL))
      .limit(1);

    if (fallback[0]) {
      const rows = await db
        .update(usersTable)
        .set({
          email: params.email,
          displayName: params.displayName,
          timezone: params.timezone ?? fallback[0].timezone,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, fallback[0].id))
        .returning();
      user = rows[0];
    } else {
      const rows = await db
        .insert(usersTable)
        .values({
          email: params.email,
          displayName: params.displayName,
          timezone: params.timezone ?? "Asia/Kolkata",
        })
        .returning();
      user = rows[0];
    }
  }

  if (!user) {
    throw new Error("Failed to create or load authenticated user");
  }

  await seedUserDefaults(user.id);
  return user;
}
