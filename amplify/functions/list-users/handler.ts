import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersInGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../../data/resource';

const client = new CognitoIdentityProviderClient({});

/**
 * Liefert die Personen des User Pools für die Übersicht im Admin-Bereich.
 *
 * Die Gruppenzugehörigkeit steht nicht in der Antwort von ListUsers. Statt sie
 * für jede Person einzeln abzufragen, wird einmal die Mitgliederliste der
 * Gruppe ADMIN geholt und gegengeprüft – ein zusätzlicher Aufruf statt einer
 * pro Person.
 *
 * `username` ist die interne Cognito-Kennung. Sie geht mit an die Oberfläche,
 * weil Rollenwechsel und Löschung darüber adressiert werden: eindeutig und
 * stabil, auch wenn jemand später seine E-Mail-Adresse ändert.
 */
export const handler: Schema['listUsers']['functionHandler'] = async () => {
  const [alle, admins] = await Promise.all([
    client.send(new ListUsersCommand({ UserPoolId: process.env.USER_POOL_ID, Limit: 60 })),
    client.send(
      new ListUsersInGroupCommand({
        UserPoolId: process.env.USER_POOL_ID,
        GroupName: 'ADMIN',
        Limit: 60,
      })
    ),
  ]);

  const adminKennungen = new Set((admins.Users ?? []).map((u) => u.Username));

  return (alle.Users ?? []).map((u) => ({
    username: u.Username,
    email: u.Attributes?.find((attr) => attr.Name === 'email')?.Value ?? u.Username,
    isAdmin: adminKennungen.has(u.Username),
    status: u.UserStatus,
    enabled: u.Enabled,
    createdAt: u.UserCreateDate?.toISOString(),
  }));
};
