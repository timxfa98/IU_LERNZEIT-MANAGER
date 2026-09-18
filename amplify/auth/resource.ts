import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito User Pool des Lernzeit-Managers.
 *
 * Die Selbstregistrierung ist im Frontend über <Authenticator hideSignUp>
 * ausgeblendet. Neue Nutzende legt ausschließlich ein Mitglied der Gruppe
 * ADMIN über die Mutation `createUser` an.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['ADMIN'],
});
