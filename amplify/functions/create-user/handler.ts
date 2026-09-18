import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../../data/resource';

const client = new CognitoIdentityProviderClient({});

/**
 * Legt eine neue Person im Cognito User Pool an.
 *
 * Cognito verschickt dabei selbst eine Einladungsmail mit einem temporären
 * Passwort und erzwingt beim ersten Login einen Passwortwechsel. Die Anwendung
 * erzeugt, überträgt und speichert also zu keinem Zeitpunkt ein Passwort.
 */
export const handler: Schema['createUser']['functionHandler'] = async (event) => {
  const { email, isAdmin } = event.arguments;
  const UserPoolId = process.env.USER_POOL_ID;

  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        DesiredDeliveryMediums: ['EMAIL'],
      })
    );

    if (isAdmin) {
      await client.send(
        new AdminAddUserToGroupCommand({ UserPoolId, Username: email, GroupName: 'ADMIN' })
      );
    }

    return { ok: true, email };
  } catch (e) {
    if (e instanceof UsernameExistsException) {
      return { ok: false, message: 'Diese E-Mail-Adresse ist bereits vergeben.' };
    }
    return { ok: false, message: e instanceof Error ? e.message : 'Unbekannter Fehler' };
  }
};
