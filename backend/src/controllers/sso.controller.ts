import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { auditLogService } from '../services/auditLog.service';
import { encryptPassword, decryptPassword } from '../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

// ============================================================
// SSO Konfiguration (Admin)
// ============================================================

/** GET /api/auth/sso/config — SSO-Konfiguration laden */
export const getSsoConfig = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.legalSettings.findFirst({
      select: {
        ssoEnabled: true, ssoProvider: true, ssoClientId: true,
        ssoIssuerUrl: true, ssoCallbackUrl: true, ssoGroupMapping: true
      }
    });
    res.json(settings || { ssoEnabled: false });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der SSO-Konfiguration.' });
  }
};

/** PUT /api/auth/sso/config — SSO-Konfiguration speichern */
export const updateSsoConfig = async (req: Request, res: Response) => {
  try {
    const { ssoEnabled, ssoProvider, ssoClientId, ssoClientSecret, ssoIssuerUrl, ssoCallbackUrl, ssoGroupMapping } = req.body;
    
    const settings = await prisma.legalSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Keine Systemeinstellungen vorhanden.' });

    await prisma.legalSettings.update({
      where: { id: settings.id },
      data: {
        ssoEnabled: ssoEnabled || false,
        ssoProvider: ssoProvider || 'oidc',
        ssoClientId: ssoClientId || null,
        ssoClientSecret: ssoClientSecret ? encryptPassword(ssoClientSecret) : settings.ssoClientSecret,
        ssoIssuerUrl: ssoIssuerUrl || null,
        ssoCallbackUrl: ssoCallbackUrl || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/sso/callback`,
        ssoGroupMapping: typeof ssoGroupMapping === 'string' ? ssoGroupMapping : JSON.stringify(ssoGroupMapping || {}),
      }
    });

    await auditLogService.log('SSO_CONFIG_UPDATE', `SSO-Provider: ${ssoProvider}, Enabled: ${ssoEnabled}`);
    res.json({ success: true, message: 'SSO-Konfiguration gespeichert.' });
  } catch (error) {
    console.error('SSO Config Error:', error);
    res.status(500).json({ error: 'Fehler beim Speichern der SSO-Konfiguration.' });
  }
};

// ============================================================
// OIDC Login Flow
// ============================================================

/** GET /api/auth/sso/login — Redirect zum OIDC Provider */
export const ssoLogin = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.legalSettings.findFirst({
      select: { ssoEnabled: true, ssoProvider: true, ssoClientId: true, ssoIssuerUrl: true, ssoCallbackUrl: true }
    });

    if (!settings?.ssoEnabled || !settings.ssoClientId || !settings.ssoIssuerUrl) {
      return res.status(400).json({ error: 'SSO ist nicht konfiguriert.' });
    }

    // State-Token für CSRF-Schutz
    const state = crypto.randomBytes(32).toString('hex');
    // Speichere State temporär (in Production: Redis/Session)
    const nonce = crypto.randomBytes(16).toString('hex');

    const authUrl = new URL(`${settings.ssoIssuerUrl}/authorize`);
    authUrl.searchParams.set('client_id', settings.ssoClientId);
    authUrl.searchParams.set('redirect_uri', settings.ssoCallbackUrl || 'http://localhost:3000/api/auth/sso/callback');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('response_mode', 'query');

    res.json({ authUrl: authUrl.toString(), state });
  } catch (error) {
    console.error('SSO Login Error:', error);
    res.status(500).json({ error: 'Fehler beim SSO-Login.' });
  }
};

/** GET /api/auth/sso/callback — OIDC Callback Handler */
export const ssoCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'Authorization Code fehlt.' });

    const settings = await prisma.legalSettings.findFirst({
      select: { ssoClientId: true, ssoClientSecret: true, ssoIssuerUrl: true, ssoCallbackUrl: true, ssoGroupMapping: true }
    });
    if (!settings?.ssoClientId || !settings.ssoIssuerUrl) {
      return res.status(400).json({ error: 'SSO nicht konfiguriert.' });
    }

    const clientSecret = settings.ssoClientSecret ? decryptPassword(settings.ssoClientSecret) : '';

    // Token-Exchange: Authorization Code → Access Token + ID Token
    const tokenUrl = `${settings.ssoIssuerUrl}/token`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: settings.ssoClientId,
        client_secret: clientSecret,
        code: String(code),
        redirect_uri: settings.ssoCallbackUrl || 'http://localhost:3000/api/auth/sso/callback',
      }).toString()
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Token Exchange Error:', errBody);
      return res.status(401).json({ error: 'Token-Exchange fehlgeschlagen.' });
    }

    const tokenData = await tokenRes.json();
    
    // ID-Token dekodieren (ohne Verifikation — in Production: jwks-rsa verwenden!)
    const idToken = tokenData.id_token;
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    const email = payload.email || payload.preferred_username || payload.upn;
    const name = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim();
    const groups: string[] = payload.groups || [];

    if (!email) return res.status(400).json({ error: 'E-Mail konnte nicht aus dem ID-Token extrahiert werden.' });

    // AD-Gruppen → Rolle mappen
    let mappedRole = 'VIEWER'; // Default
    const groupMapping = settings.ssoGroupMapping ? JSON.parse(settings.ssoGroupMapping) : {};
    
    for (const [adGroup, role] of Object.entries(groupMapping)) {
      if (groups.some(g => g === adGroup || g.toLowerCase().includes(adGroup.toLowerCase()))) {
        mappedRole = role as string;
        break; // Höchste Priorität zuerst
      }
    }

    // User anlegen oder aktualisieren
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Neuen SSO-User anlegen — direkt ACTIVE (keine Freigabe nötig bei SSO)
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: crypto.randomBytes(64).toString('hex'), // Kein Login-Passwort nötig
          role: mappedRole,
          status: 'ACTIVE',
          firstName: payload.given_name || name.split(' ')[0] || '',
          lastName: payload.family_name || name.split(' ').slice(1).join(' ') || '',
        }
      });
      await auditLogService.log('SSO_USER_CREATED', `Neuer SSO-User: ${email}, Rolle: ${mappedRole}`);
    } else {
      // Rolle bei jedem Login aktualisieren (AD-Gruppen könnten sich geändert haben)
      await prisma.user.update({
        where: { id: user.id },
        data: { role: mappedRole, status: 'ACTIVE' }
      });
    }

    // JWT ausstellen
    const appToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, sso: true },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await auditLogService.log('SSO_LOGIN', `SSO-Login: ${email} (Rolle: ${mappedRole}, Provider: OIDC)`);

    // Redirect zum Frontend mit Token
    const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/sso-callback?token=${appToken}&email=${encodeURIComponent(email)}&role=${mappedRole}`);
  } catch (error) {
    console.error('SSO Callback Error:', error);
    res.status(500).json({ error: 'Fehler beim SSO-Callback.' });
  }
};

// ============================================================
// SSO Gruppen-Mapping (CRUD)
// ============================================================

/** GET /api/auth/sso/mappings */
export const getSsoMappings = async (req: Request, res: Response) => {
  try {
    const mappings = await prisma.ssoMapping.findMany({ orderBy: { adGroupName: 'asc' } });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der SSO-Mappings.' });
  }
};

/** POST /api/auth/sso/mappings */
export const createSsoMapping = async (req: Request, res: Response) => {
  try {
    const { adGroupName, systemRole, locationId } = req.body;
    if (!adGroupName || !systemRole) return res.status(400).json({ error: 'adGroupName und systemRole sind erforderlich.' });

    const mapping = await prisma.ssoMapping.create({
      data: { adGroupName, systemRole, locationId: locationId || null }
    });
    await auditLogService.log('SSO_MAPPING_CREATED', `AD-Gruppe "${adGroupName}" → Rolle "${systemRole}"`);
    res.status(201).json(mapping);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Diese AD-Gruppe ist bereits gemappt.' });
    res.status(500).json({ error: 'Fehler beim Erstellen des Mappings.' });
  }
};

/** DELETE /api/auth/sso/mappings/:id */
export const deleteSsoMapping = async (req: Request, res: Response) => {
  try {
    await prisma.ssoMapping.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Mappings.' });
  }
};

// ============================================================
// Stoff-Historisierung (Freeze-State)
// ============================================================

/** POST /api/substances/:id/snapshot — Erstellt einen unveränderlichen Snapshot */
export const createSubstanceSnapshot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const substance = await prisma.hazardousSubstanceMaster.findUnique({
      where: { id },
      include: { inventories: true }
    });
    if (!substance) return res.status(404).json({ error: 'Stoff nicht gefunden.' });

    const snapshotData = JSON.stringify(substance);
    const snapshotHash = crypto.createHash('sha256').update(snapshotData).digest('hex');

    const snapshot = await prisma.substanceSnapshot.create({
      data: {
        masterSubstanceId: id,
        snapshotData,
        reason: reason || 'MANUAL_FREEZE',
        createdBy: (req as any).user?.email || 'system',
        snapshotHash,
      }
    });

    await auditLogService.log('SUBSTANCE_SNAPSHOT', `Freeze-State für "${substance.productName}" erstellt (Grund: ${reason || 'MANUAL_FREEZE'}, Hash: ${snapshotHash.substring(0, 16)}…)`);

    res.status(201).json({ snapshot, hash: snapshotHash });
  } catch (error) {
    console.error('Snapshot Error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Snapshots.' });
  }
};

/** GET /api/substances/:id/snapshots — Alle Snapshots eines Stoffs */
export const getSubstanceSnapshots = async (req: Request, res: Response) => {
  try {
    const snapshots = await prisma.substanceSnapshot.findMany({
      where: { masterSubstanceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(snapshots);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Snapshots.' });
  }
};

// ============================================================
// SAML 2.0 Stub (Modul 22)
// ============================================================

/** GET /api/auth/sso/saml/login — SAML 2.0 AuthnRequest */
export const samlLogin = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.legalSettings.findFirst({
      select: { ssoEnabled: true, ssoProvider: true, ssoIssuerUrl: true, ssoClientId: true, ssoCallbackUrl: true }
    });

    if (!settings?.ssoEnabled || settings.ssoProvider !== 'saml' || !settings.ssoIssuerUrl) {
      return res.status(400).json({ error: 'SAML 2.0 ist nicht konfiguriert.' });
    }

    // SAML AuthnRequest generieren (Base64-encoded XML)
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();
    const callbackUrl = settings.ssoCallbackUrl || 'http://localhost:3000/api/auth/sso/saml/callback';
    
    const authnRequest = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}"
      Destination="${settings.ssoIssuerUrl}" AssertionConsumerServiceURL="${callbackUrl}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer>${settings.ssoClientId}</saml:Issuer>
      <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
    </samlp:AuthnRequest>`;

    const samlRequestB64 = Buffer.from(authnRequest).toString('base64');
    const redirectUrl = `${settings.ssoIssuerUrl}?SAMLRequest=${encodeURIComponent(samlRequestB64)}&RelayState=${encodeURIComponent(callbackUrl)}`;
    
    res.json({ authUrl: redirectUrl, requestId });
  } catch (error) {
    console.error('SAML Login Error:', error);
    res.status(500).json({ error: 'Fehler beim SAML-Login.' });
  }
};

/** POST /api/auth/sso/saml/callback — SAML 2.0 Assertion Consumer */
export const samlCallback = async (req: Request, res: Response) => {
  try {
    const { SAMLResponse, RelayState } = req.body;
    if (!SAMLResponse) return res.status(400).json({ error: 'SAMLResponse fehlt.' });

    // SAML Response dekodieren (Base64 → XML)
    const xml = Buffer.from(SAMLResponse, 'base64').toString('utf-8');
    
    // Minimal-Parsing: E-Mail + Name + Gruppen aus SAML Assertion extrahieren
    const emailMatch = xml.match(/NameID[^>]*>([^<]+)</);
    const email = emailMatch?.[1]?.trim();
    if (!email) return res.status(400).json({ error: 'E-Mail konnte nicht aus der SAML-Assertion extrahiert werden.' });

    const nameMatch = xml.match(/givenName[^>]*>([^<]+)<|DisplayName[^>]*>([^<]+)</);
    const name = nameMatch?.[1] || nameMatch?.[2] || email.split('@')[0];

    // Gruppen aus SAML Attributes extrahieren
    const groupMatches = [...xml.matchAll(/memberOf[^>]*>([^<]+)</g)];
    const groups = groupMatches.map(m => m[1]);

    // Rolle mappen (analog zu OIDC)
    let mappedRole = 'VIEWER';
    const mappings = await prisma.ssoMapping.findMany();
    for (const mapping of mappings) {
      if (groups.some(g => g.toLowerCase().includes(mapping.adGroupName.toLowerCase()))) {
        mappedRole = mapping.systemRole;
        break;
      }
    }

    // User anlegen/aktualisieren
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email, passwordHash: crypto.randomBytes(64).toString('hex'),
          role: mappedRole, status: 'ACTIVE',
          firstName: name.split(' ')[0] || '', lastName: name.split(' ').slice(1).join(' ') || '',
        }
      });
      await auditLogService.log('SSO_USER_CREATED', `SAML-User: ${email}, Rolle: ${mappedRole}`);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { role: mappedRole, status: 'ACTIVE' } });
    }

    const appToken = jwt.sign({ userId: user.id, email: user.email, role: user.role, sso: true }, JWT_SECRET, { expiresIn: '8h' });
    await auditLogService.log('SSO_LOGIN', `SAML-Login: ${email} (Rolle: ${mappedRole})`);

    const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/sso-callback?token=${appToken}&email=${encodeURIComponent(email)}&role=${mappedRole}`);
  } catch (error) {
    console.error('SAML Callback Error:', error);
    res.status(500).json({ error: 'Fehler beim SAML-Callback.' });
  }
};

// ============================================================
// Auto-Trigger: H-Sätze → Unterweisungsbedarf (Modul 10)
// ============================================================

const CMR_H_PHRASES = ['H340', 'H341', 'H350', 'H351', 'H360', 'H361', 'H362', 'H370', 'H372'];
const ACUTE_TOXIC = ['H300', 'H301', 'H310', 'H311', 'H330', 'H331'];

/** POST /api/substances/:id/auto-trigger-training — Prüft H-Sätze und legt TrainingNeeds an */
export const autoTriggerTraining = async (req: Request, res: Response) => {
  try {
    const substance = await prisma.hazardousSubstanceMaster.findUnique({
      where: { id: req.params.id },
      include: { inventories: { include: { workArea: true } } }
    });
    if (!substance) return res.status(404).json({ error: 'Stoff nicht gefunden.' });

    const hPhrases = (substance.hPhrases || '').split(',').map(h => h.trim().toUpperCase());
    const isCMR = hPhrases.some(h => CMR_H_PHRASES.includes(h));
    const isAcuteToxic = hPhrases.some(h => ACUTE_TOXIC.includes(h));
    const needs: string[] = [];

    if (isCMR || isAcuteToxic || substance.isKrebserzeugend) {
      // Für jeden zugewiesenen Arbeitsbereich einen TrainingNeed anlegen
      for (const inv of substance.inventories) {
        const existing = await prisma.trainingNeed.findFirst({
          where: { substanceName: substance.productName, workAreaName: inv.workArea.name, status: 'PENDING' }
        });
        if (!existing) {
          await prisma.trainingNeed.create({
            data: {
              substanceName: substance.productName,
              substanceType: substance.substanceType || 'GEFAHRSTOFF',
              workAreaName: inv.workArea.name,
              status: 'PENDING',
            }
          });
          needs.push(`${inv.workArea.name}: ${substance.productName}`);
        }
      }
    }

    if (needs.length > 0) {
      await auditLogService.log('TRAINING_AUTO_TRIGGER', `Auto-Trigger: ${needs.length} Unterweisungsbedarfe für "${substance.productName}" erzeugt.`);
    }

    res.json({
      substance: substance.productName,
      isCMR, isAcuteToxic,
      triggeredNeeds: needs.length,
      details: needs
    });
  } catch (error) {
    console.error('Auto-Trigger Error:', error);
    res.status(500).json({ error: 'Fehler beim Auto-Trigger.' });
  }
};

// ============================================================
// GBU ↔ Snapshot Rückverknüpfung (Modul 22)
// ============================================================
