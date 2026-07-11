import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all profiles
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await prisma.substanceProfile.findMany({
      include: {
        items: {
          include: {
            masterSubstance: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
};

// Create a new profile
export const createProfile = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    // Check if name exists
    const existing = await prisma.substanceProfile.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Ein Profil mit diesem Namen existiert bereits.' });
    }

    const profile = await prisma.substanceProfile.create({
      data: { name, description }
    });
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create profile' });
  }
};

// Update profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const profile = await prisma.substanceProfile.update({
      where: { id },
      data: { name, description }
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Delete profile
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.substanceProfile.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete profile' });
  }
};

// Add item to profile
export const addProfileItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isBiological, masterSubstanceId, bioName, bioRiskGroup, bioTargeted } = req.body;

    const item = await prisma.substanceProfileItem.create({
      data: {
        profileId: id,
        isBiological,
        masterSubstanceId: isBiological ? null : masterSubstanceId,
        bioName: isBiological ? bioName : null,
        bioRiskGroup: isBiological ? bioRiskGroup : null,
        bioTargeted: isBiological ? bioTargeted : false
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item to profile' });
  }
};

// Remove item from profile
export const removeProfileItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    await prisma.substanceProfileItem.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
};

// Apply profile to a work area
export const applyProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workAreaId } = req.body;

    // Load profile with items
    const profile = await prisma.substanceProfile.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!profile) return res.status(404).json({ error: 'Profil nicht gefunden' });

    // Load existing items in the work area to prevent/handle duplicates
    const existingHazardous = await prisma.localSubstanceInventory.findMany({
      where: { workAreaId },
      include: { masterSubstance: true }
    });
    
    const existingBiological = await prisma.biologicalSubstance.findMany({
      where: { workAreaId }
    });

    const existingMasterIds = existingHazardous.map(h => h.masterSubstanceId);
    const existingBioNames = existingBiological.map(b => b.name);

    for (const item of profile.items) {
      if (item.isBiological && item.bioName) {
        // Skip if exists (simplification for now, we can ask user in UI)
        if (!existingBioNames.includes(item.bioName)) {
          await prisma.biologicalSubstance.create({
            data: {
              workAreaId,
              name: item.bioName,
              riskGroup: item.bioRiskGroup || 1,
              protectionLevel: item.bioRiskGroup || 1,
              isTargetedActivity: item.bioTargeted
            }
          });
        }
      } else if (!item.isBiological && item.masterSubstanceId) {
        if (!existingMasterIds.includes(item.masterSubstanceId)) {
          // wir müssen product name aus Master holen
          const master = await prisma.hazardousSubstanceMaster.findUnique({
            where: { id: item.masterSubstanceId }
          });
          if (master) {
            await prisma.localSubstanceInventory.create({
              data: {
                workAreaId,
                masterSubstanceId: item.masterSubstanceId
              }
            });
          }
        }
      }
    }

    res.json({ success: true, message: 'Profil erfolgreich angewendet' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply profile' });
  }
};

// Export profile to JSON
export const exportProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await prisma.substanceProfile.findUnique({
      where: { id },
      include: { 
        items: {
          include: { masterSubstance: true }
        }
      }
    });

    if (!profile) return res.status(404).json({ error: 'Profil nicht gefunden' });

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export profile' });
  }
};

// Import profile from JSON
export const importProfile = async (req: Request, res: Response) => {
  try {
    const profileData = req.body;
    if (!profileData || !profileData.name || !profileData.items) {
      return res.status(400).json({ error: 'Ungültige Import-Daten' });
    }

    // Append (Imported) to name if it already exists
    let newName = profileData.name;
    let existing = await prisma.substanceProfile.findUnique({ where: { name: newName } });
    let counter = 1;
    while (existing) {
      newName = `${profileData.name} (Import ${counter})`;
      existing = await prisma.substanceProfile.findUnique({ where: { name: newName } });
      counter++;
    }

    // Step 1: Identify missing master substances
    const missingSubstances = [];
    const validItemsToCreate = [];

    for (const item of profileData.items) {
      if (item.isBiological) {
        // Bio substances are just saved by name
        validItemsToCreate.push({
          isBiological: true,
          bioName: item.bioName,
          bioRiskGroup: item.bioRiskGroup,
          bioTargeted: item.bioTargeted
        });
      } else if (item.masterSubstance) {
        // Check if master substance exists by name and manufacturer
        const master = await prisma.hazardousSubstanceMaster.findFirst({
          where: {
            productName: item.masterSubstance.productName,
            manufacturer: item.masterSubstance.manufacturer || null
          }
        });

        if (master) {
          validItemsToCreate.push({
            isBiological: false,
            masterSubstanceId: master.id
          });
        } else {
          // Missing! We need to return this to the frontend so the user can create it
          missingSubstances.push(item.masterSubstance);
        }
      }
    }

    if (missingSubstances.length > 0) {
      return res.status(400).json({ 
        error: 'Fehlende Stoffe im Zentralkatalog', 
        missingSubstances,
        profileData // Return the original data so frontend can re-submit after creation
      });
    }

    // All substances exist (or none are missing), create profile!
    const newProfile = await prisma.substanceProfile.create({
      data: {
        name: newName,
        description: profileData.description,
        items: {
          create: validItemsToCreate
        }
      }
    });

    res.status(201).json(newProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import profile' });
  }
};
