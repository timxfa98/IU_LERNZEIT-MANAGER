import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { createUser } from '../functions/create-user/resource';
import { deleteUser } from '../functions/delete-user/resource';
import { listUsers } from '../functions/list-users/resource';
import { updateUserRole } from '../functions/update-user-role/resource';

/**
 * Datenmodell des Lernzeit-Managers.
 *
 * Jedes Modell ist mit `allow.owner()` geschützt: AppSync ergänzt beim Anlegen
 * automatisch ein `owner`-Feld mit der Cognito-Identität und filtert alle Lese-
 * und Schreibzugriffe serverseitig darauf. Ein Fehler im Frontend kann damit
 * keine fremden Daten offenlegen.
 *
 * Monats- und Uhrzeitangaben sind bewusst als String modelliert (YYYY-MM bzw.
 * HH:MM), weil die Anwendung sie durchgängig lexikografisch vergleicht und
 * sortiert. Echte Datumsangaben nutzen AWSDate/AWSDateTime.
 */
const schema = a.schema({
  Goal: a
    .model({
      title: a.string().required(),
      // Modul, das dieses Ziel betrifft. Bewusst optional: Ziele aus der Zeit
      // vor dieser Erweiterung haben den Wert nicht.
      subject: a.string(),
      description: a.string(),
      targetDate: a.date(),
      status: a.enum(['offen', 'erreicht', 'verfehlt']),
      category: a.enum(['klausur', 'hausarbeit', 'projektarbeit', 'bachelorarbeit']),
    })
    .authorization((allow) => [allow.owner()]),

  SixMonthPlan: a
    .model({
      startMonth: a.string().required(), // YYYY-MM
      subject: a.string().required(),
      targetHours: a.integer().required(),
      note: a.string(),
      // Bewusst optional: Plaene aus der Zeit vor dieser Erweiterung haben
      // keinen Status und werden als offen gelesen.
      status: a.enum(['offen', 'erreicht', 'verfehlt']),
    })
    .authorization((allow) => [allow.owner()]),

  MonthPlan: a
    .model({
      month: a.string().required(), // YYYY-MM
      subject: a.string().required(),
      targetHours: a.integer().required(),
      note: a.string(), // Zwischenziel
      milestoneStatus: a.enum(['offen', 'erreicht', 'verfehlt']),
    })
    .authorization((allow) => [allow.owner()]),

  TimerSession: a
    .model({
      date: a.date().required(),
      subject: a.string().required(),
      durationMinutes: a.integer().required(),
      startedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.owner()]),

  /**
   * Legt eine neue Person im User Pool an. Die Berechtigungsprüfung übernimmt
   * AppSync anhand der Gruppen im JWT – die Lambda muss sie nicht wiederholen.
   */
  createUser: a
    .mutation()
    .arguments({
      email: a.string().required(),
      isAdmin: a.boolean(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMIN')])
    .handler(a.handler.function(createUser)),

  /** Listet die vorhandenen Personen für die Übersicht im Admin-Bereich auf. */
  listUsers: a
    .query()
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMIN')])
    .handler(a.handler.function(listUsers)),

  /**
   * Setzt oder entzieht Administrationsrechte. Adressiert wird über die interne
   * Cognito-Kennung aus `listUsers`, nicht über die E-Mail-Adresse.
   */
  updateUserRole: a
    .mutation()
    .arguments({
      username: a.string().required(),
      isAdmin: a.boolean().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMIN')])
    .handler(a.handler.function(updateUserRole)),

  /** Löscht eine Person endgültig aus dem User Pool. */
  deleteUser: a
    .mutation()
    .arguments({
      username: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMIN')])
    .handler(a.handler.function(deleteUser)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
