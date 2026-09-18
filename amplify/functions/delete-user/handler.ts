import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  ListUsersInGroupCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../../data/resource';

const client = new CognitoIdentityProviderClient({});

/**
 * Löscht eine Person endgültig aus dem User Pool.
 *
 * Cognito kennt keinen Papierkorb – der Zugang ist danach unwiderruflich weg.
 * Die bereits erfassten Lernzeiten, Pläne und Ziele bleiben in der Datenbank
 * zurück und sind für niemanden mehr erreichbar, auch nicht für eine später
 * mit derselben E-Mail angelegte Person: die Datensätze hängen an der
 * Cognito-Identität, die neu vergeben wird.
 *
 * Die Sperren entsprechen denen von update-user-role.
 */
export const handler: Schema['deleteUser']['functionHandler'] = async (event) => {
  const { username } = event.arguments;
  const UserPoolId = process.env.USER_POOL_ID;
  const aufrufer = event.identity as { sub?: string; username?: string } | null;

  if (username === aufrufer?.sub || username === aufrufer?.username) {
    return { ok: false, message: 'Das eigene Konto kann nicht gelöscht werden.' };
  }

  try {
    const admins = await client.send(
      new ListUsersInGroupCommand({ UserPoolId, GroupName: 'ADMIN', Limit: 60 })
    );
    const adminListe = admins.Users ?? [];
    const istAdmin = adminListe.some((u) => u.Username === username);

    if (istAdmin && adminListe.length <= 1) {
      return { ok: false, message: 'Die letzte Administration kann nicht gelöscht werden.' };
    }

    await client.send(new AdminDeleteUserCommand({ UserPoolId, Username: username }));

    return { ok: true };
  } catch (e) {
    if (e instanceof UserNotFoundException) {
      return { ok: false, message: 'Diese Person existiert nicht mehr.' };
    }
    return { ok: false, message: e instanceof Error ? e.message : 'Unbekannter Fehler' };
  }
};
