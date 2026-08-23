import fs from 'fs';
import { google } from 'googleapis';

const TRIAGE_LABELS = ['InboxTriage/Ahora', 'InboxTriage/Despues', 'InboxTriage/NoResponder'];

export function getOAuth2Client() {
  const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

export function getGmail() {
  return google.gmail({ version: 'v1', auth: getOAuth2Client() });
}

export async function getTriageLabelIds(gmail) {
  const { data } = await gmail.users.labels.list({ userId: 'me' });
  const ids = {};
  for (const name of TRIAGE_LABELS) {
    const found = (data.labels || []).find((l) => l.name === name);
    if (found) ids[name] = found.id;
  }
  return ids;
}

export async function applyTriageLabel(gmail, messageId, labelName, labelIds) {
  const addId = labelIds[labelName];
  if (!addId) {
    console.warn(`[Gmail] Label no encontrada: ${labelName}. Corre: npm run gmail:labels`);
    return;
  }
  const removeLabelIds = Object.entries(labelIds)
    .filter(([name]) => name !== labelName)
    .map(([, id]) => id);
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [addId],
      removeLabelIds,
    },
  });
}
