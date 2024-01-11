import functions = require('firebase-functions');
import * as notificationFunctions from './notifications';
import * as atomicFunctions from './atomicFunctions';
import {LIKE_EVENT, COMMENT_EVENT, BOOKMARK_EVENT} from "./constants";

export const newFollowerNotification = functions.firestore
  .document('users/{followedId}/followed/{followerId}')
  .onCreate((snap: any, context: any) => {
    return notificationFunctions.sendNewFollowerNotification(snap, context);
  });

  export const newPostImage = functions.firestore 
.document('posts/{postId}/thumbImages/{id}')
  .onCreate((snap: any, context: any) => {
    return atomicFunctions.newPostImage({ snap, context });
});

export const updateAlgoliaPost = functions.firestore
  .document('posts/{postId}')
  .onCreate((snap: any, context: any) => {
    return atomicFunctions.newAlgoliaPost(snap, context);
  }); 

  export const newAlgoliaPost = functions.firestore
  .document('posts/{postId}')
  .onCreate((snap: any, context: any) => {
    return atomicFunctions.newAlgoliaPost(snap, context);
  }); 

export const updateAlgoliaUsers = functions.firestore
  .document('users/{userId}/profile/{userID}')
  .onUpdate((snap: any, context: any) => {
    return atomicFunctions.updateAlgoliaUsers(snap, context);
  });

export const newAlgoliaLocation = functions.firestore
  .document('location/{locationId}')
  .onCreate((snap: any, context: any) => {
    return atomicFunctions.newAlgoliaLocation(snap, context);
  });


export const updateFeedAfterFollow = functions.firestore
  .document('users/{followerId}/following/{followedId}')
  .onCreate((snap: any, context: any) => {
    return atomicFunctions.updateFeedAfterUserAction(snap, context);
  });

export const updateFeedAfterUserPost = functions.firestore
  .document('posts/{postId}')
  .onCreate((snap: any, context: any) => {
    return atomicFunctions.updateFeedAfterUserAction(snap, context);
  });

export const updateFeedAfterUnFollow = functions.firestore
  .document('user/{followerId}/following/{followedId}')
  .onDelete((snap: any, context: any) => {
    return atomicFunctions.updateFeedAfterUserAction(snap, context);
  });

export const newCommentNotification = functions.firestore
  .document('posts/{postId}/comments/{commentId}')
  .onCreate((snap: any, context: any) => {
    return notificationFunctions.sendCommentNotication(
      snap,
      context,
      COMMENT_EVENT
    );
  });

export const newLikeNotification = functions.firestore
  .document('posts/{postId}/likes/{likedId}')
  .onUpdate((snap: any, context: any) => {
    return notificationFunctions.sendLikeNotication(snap, context, LIKE_EVENT);
  });

export const newBookmarkNotification = functions.firestore
  .document('posts/{postId}/bookmark/{likedId}')
  .onUpdate((snap: any, context: any) => {
    return notificationFunctions.sendLikeNotication(
      snap,
      context,
      BOOKMARK_EVENT
    );
  });


export const postLikeChanged = functions.firestore
    .document('posts/{postId}/likes/{likedId}')
    .onWrite((snapshot: any, context: any ) => {
       console.log('Starting post like notification');
       return notificationFunctions.sendPostNotications(snapshot, context);
});
