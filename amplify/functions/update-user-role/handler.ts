import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersInGroupCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../../data/resource';

const client = new CognitoIdentityProviderClient({});

/**
 * Setzt oder entzieht die Administrationsrechte einer Person.
 *
 * Die Rolle "Benutzer" ist bewusst als Abwesenheit der Gruppe ADMIN modelliert.
 * Eine zweite Gruppe brächte keinen Erkenntnisgewinn, könnte aber mit der
 * ersten auseinanderlaufen.
 *
 * Die beiden Sperren werden hier serverseitig geprüft und nicht nur in der
 * Oberfläche: Wer die eigene Rolle ändern oder die letzte verbliebene
 * Administration entziehen könnte, sperrte den Nutzerkreis dauerhaft aus –
 * reparabel dann nur noch über die AWS-Konsole.
 */
export const handler: Schema['updateUserRole']['functionHandler'] = async (event) => {
  const { username, isAdmin } = event.arguments;
  const UserPoolId = process.env.USER_POOL_ID;
  const aufrufer = event.identity as { sub?: string; username?: string } | null;

  if (username === aufrufer?.sub || username === aufrufer?.username) {
    return { ok: false, message: 'Die eigene Rolle kann nicht geändert werden.' };
  }

  try {
    if (isAdmin) {
      await client.send(
        new AdminAddUserToGroupCommand({ UserPoolId, Username: username, GroupName: 'ADMIN' })
      );
    } else {
      const admins = await client.send(
        new ListUsersInGroupCommand({ UserPoolId, GroupName: 'ADMIN', Limit: 60 })
      );
      if ((admins.Users ?? []).length <= 1) {
        return { ok: false, message: 'Die letzte Administration kann nicht entzogen werden.' };
      }
      await client.send(
        new AdminRemoveUserFromGroupCommand({ UserPoolId, Username: username, GroupName: 'ADMIN' })
      );
    }

    return { ok: true };
  } catch (e) {
    if (e instanceof UserNotFoundException) {
      return { ok: false, message: 'Diese Person existiert nicht mehr.' };
    }
    return { ok: false, message: e instanceof Error ? e.message : 'Unbekannter Fehler' };
  }
};
