import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
//admin.initializeApp();

admin.initializeApp({  serviceAccountId: 'service-687988996136@cloud-filer.iam.gserviceaccount.com',

});

const db = admin.firestore();

export const createUserRecord = functions.auth
  .user()
  .onCreate((user, context) => {
    const userRef = db.doc(`users/profile/${user.uid}`);

    return userRef.set({
      name: user.displayName,
      createdAt: context.timestamp,
      nickname: user.displayName
    });
  });
