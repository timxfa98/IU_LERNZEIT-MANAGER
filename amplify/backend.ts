import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { createUser } from './functions/create-user/resource';
import { deleteUser } from './functions/delete-user/resource';
import { listUsers } from './functions/list-users/resource';
import { updateUserRole } from './functions/update-user-role/resource';

const backend = defineBackend({
  auth,
  data,
  createUser,
  listUsers,
  updateUserRole,
  deleteUser,
});

const userPool = backend.auth.resources.userPool;

// Alle Funktionen brauchen die ID des User Pools zur Laufzeit.
backend.createUser.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.listUsers.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.updateUserRole.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.deleteUser.addEnvironment('USER_POOL_ID', userPool.userPoolId);

// Rechte bewusst eng gefasst: nur die tatsächlich benötigten Aktionen und
// ausschließlich auf dem eigenen User Pool.
backend.createUser.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminAddUserToGroup'],
    resources: [userPool.userPoolArn],
  })
);

// ListUsersInGroup liefert die Mitglieder der Gruppe ADMIN und damit die Rolle
// jeder Person in der Übersicht.
backend.listUsers.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:ListUsers', 'cognito-idp:ListUsersInGroup'],
    resources: [userPool.userPoolArn],
  })
);

// ListUsersInGroup dient hier der Sperre, die die letzte verbliebene
// Administration schützt.
backend.updateUserRole.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminRemoveUserFromGroup',
      'cognito-idp:ListUsersInGroup',
    ],
    resources: [userPool.userPoolArn],
  })
);

backend.deleteUser.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:AdminDeleteUser', 'cognito-idp:ListUsersInGroup'],
    resources: [userPool.userPoolArn],
  })
);
