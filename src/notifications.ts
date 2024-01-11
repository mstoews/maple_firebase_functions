import {EVENTS, FOLLOW_EVENT, PRIV_USER_DATA, POSTS} from "./constants";
import * as admin from "firebase-admin";

const firestoreInstance = admin.firestore();

const fieldValue = admin.firestore.FieldValue;
const messagingAdmin = admin.messaging();

export async function sendNewFollowerNotification(snap: any, context: any) {
    const userId = context.params.followedId;
    const authorId = context.params.followerId; 
    const authorUsername = snap.data().username;
    const authorPhotoUrl = snap.data().profileImageUrl;

    console.log('sendNewFollowerNotification: ' + userId);
      
    if (userId === authorId) {
        console.log('User does not recieve their own notifications!');
        return 
    }
    try {

        //Retrieve the events filtering by the author of the interaction and the kind of event
        const eventAlreadyExist = await userEventExist(userId, FOLLOW_EVENT, "");
        //If the event exist, means that a notification was already sent for such event and user
        console.log('An event for this action have been sent already');
        if (eventAlreadyExist) return 

        //Retrieve the user data and check if the user exist
        const userData = await getUserPrivateData(userId);
        
        if (!userData.exists) {
            console.log('User doc doesnt exists');
            return 
        }
    
        //Get the tokens from the retrieved user
        // noinspection TypeScriptUnresolvedVariable
        const tokens = userData?.data()?.messagingTokens;

        //Generate the payload
        const payload = {
            notification: {
                title: 'New Follower!',
                body: `${authorUsername}`
            },
            data: {
                "kind": FOLLOW_EVENT,
                "authorId": `${authorId}`,
                "authorUsername": `${authorUsername}`,
                "authorPhotoUrl": `${authorPhotoUrl}`,
                "referenceId": `${authorId}`,
            }
        };

        //Generate the POJO of information that we are going to set for this event
        const data = {
            deleted: false,
            kind: FOLLOW_EVENT,
            interactionUserUsername: authorUsername,
            interactionUserProfilePicture: authorPhotoUrl,
            interactionUser: authorId,
            interactionRef: authorId,
            timestamp: fieldValue.serverTimestamp()
        };

        //Send the messages
        const response = await messagingAdmin.sendToDevice(tokens, payload);

        //Check the response to see if any notification failed and delete deprecated tokens if necessary
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', tokens[index], error);
                // Cleanup the tokens who are not registered anymore.
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    tokens.remove(index)
                }
            }
        });

        //Generate a new promise for set the new event data and another one for update the tokens
        const privateUserDataDoc = firestoreInstance.collection('users').doc(userId);
        const newEventPromise = privateUserDataDoc.collection(EVENTS).doc().set(data);
        const updateTokensPromise = privateUserDataDoc.update('messagingTokens', tokens);
        //Execute them
        await Promise.all([newEventPromise, updateTokensPromise]);
        console.log('The process of send a new follow notification for the user ', userId, ' has finished successfully')
    } catch (err) {
        console.error('Failed sending a follow notification to user', userId, 'with error', err);
    }
}




export async function sendCommentNotication(snap: any, context: any, kind: any) {
   
    // Parameters   
    const commentId = context.params.commentId
    const postId = context.params.postId;
    // comment data
    const commentUserId = snap.data().uid;
    const postUid = snap.data().postUid;

    console.log('commentId: ' + commentId + '  postId: ' +  postId);
    console.log('PostUid : ' + postUid);
    console.log('commentAutherUid : ' + commentUserId);
    
    //An user can't send notifications to himself
    // if (commentAuthorId === postAuthorId) {
    //     console.log('User should not receive their own notifications');
    //     return
    // }

    
    try {
        //Retrieve the events filtering by the author of the interaction, the ref and the kind of event
        const eventAlreadyExist = await userEventExist(commentUserId, kind, commentId);
        //If the event exist, means that a notification was already sent for such event and user
    
    if (eventAlreadyExist) {
         console.log('An event for this action have been sent already');
         return
    }
 
        //Retrieve the user data and check if the user exist
    const userData = await getUserPrivateData(commentUserId);
    if (!userData.exists) {
        console.log('User doc doesnt exists');
        return 
    }
        
        //Get the tokens from the retrieved user
        // noinspection TypeScriptUnresolvedVariable
        const tokens = userData?.data()?.token;
        console.log("Token : " + tokens)

        //Generate the payload
        const payload = {
            notification: {
                title: kind,
                body: `${userData.data()?.username}`
            },
            data: {
                "kind": kind,
                "authorId": `${commentUserId}`,
                "authorUsername": `${userData.data()?.username}`,
                "authorPhotoUrl": `${userData.data()?.profileImageUrl}`,
                "referenceId": `${postId}`,
            }
        };

        //Generate the POJO of information that we are going to set for this event
        const data = {
            deleted: false,
            kind: kind,
            interactionUserUsername: userData.data()?.username,
            interactionUserProfilePicture: userData.data()?.profileImageUrl,
            interactionUser: commentUserId,
            interactionRef: postId,
            timestamp: fieldValue.serverTimestamp()
        };

        //Send the messages
        const response = await messagingAdmin.sendToDevice(tokens, payload);

        //Check the response to see if any notification failed and delete deprecated tokens if necessary
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', tokens[index], error);
                // Cleanup the tokens who are not registered anymore.
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    tokens.remove(index)
                }
            }
        });

        const currentCommentCount = await getCommentCount(postId);
       
        if (!currentCommentCount.exists) {
            console.log('Post document does not exist for :' + postId); 
            return
        }
        
        let commentCount = currentCommentCount.data()?.numberOfComments;
        commentCount = commentCount + 1;
        
        console.log('Number of Comments: ' + commentCount);
        
        //Generate a new promise for set the new event data and another one for update the tokens
        const postCommentCountUpdate = firestoreInstance.collection("posts").doc(postId);
        const updateCommentCount = postCommentCountUpdate.update('numberOfComments', commentCount);
        const privateUserDataDoc = firestoreInstance.collection('users').doc(postUid);
        const newEventPromise = privateUserDataDoc.collection(EVENTS).doc().set(data);
        
        //const updateTokensPromise = privateUserDataDoc.update('messagingTokens', tokens);
       
        //Execute them
        await Promise.all([newEventPromise, updateCommentCount]);
        console.log('The process of send a new follow notification for the user ', postId, ' has finished successfully')
    } catch (err) {
        console.error('Failed sending a follow notification to user', postId, 'with error', err);
    }
};


export async function sendLikeNotication(snap: any, context: any, kind: any) {
    // posts/{postId}/likes/{likedId}
    console.log('Likes notification has started ...');
    
    const newValue = snap.after.data();
    const likedPost = newValue.Liked 

    if (likedPost === false) {
        console.log('Post is unliked and user is not notified')
        return
    }
    const likerId = context.params.likedId;
    const postId = context.params.postId;


    const postData = await getPostData(postId) as FirebaseFirestore.DocumentSnapshot;
    if (!postData.exists) {
        console.log('Post doc doesnt exists');
        return 
    }
    
    const postUid = postData.data()?.uid;
    console.log('commenterUid : ' + postUid)

    //An user can't send notifications to himself
    if (likerId === postUid) {
        console.log('User should not receive their own notifications');
        return
    }
    try {
        //Retrieve the events filtering by the author of the interaction, the ref and the kind of event
    
    const eventAlreadyExist = await userEventExist(likerId, kind, postId);
        //If the event exist, means that a notification was already sent for such event and user
    
    if (eventAlreadyExist) {
         console.log('An event for this action have been sent already');
         return
    }
 
        //Retrieve the user data and check if the user exist
    const userData = await getUserPrivateData(postUid);
    
    if (!userData.exists) {
        console.log('User doc doesnt exists');
        return 
    }
        
        //Get the tokens from the retrieved user
        // noinspection TypeScriptUnresolvedVariable
        const tokens = userData?.data()?.token;
        console.log("Token : " + tokens)

        //Generate the payload
        const payload = {
            notification: {
                title: kind,
                body: `${userData?.data()?.username}`
            },
            data: {
                "kind": kind,
                "authorId": `${likerId}`,
                "authorUsername": `${userData?.data()?.username}`,
                "authorPhotoUrl": `${userData?.data()?.profileImageUrl}`,
                "referenceId": `${postId}`,
            }
        };

        //Generate the POJO of information that we are going to set for this event
        const data = {
            deleted: false,
            kind: kind,
            interactionUserUsername: userData?.data()?.username,
            interactionUserProfilePicture: userData?.data()?.profileImageUrl,
            interactionUser: likerId,
            interactionRef: postId,
            timestamp: fieldValue.serverTimestamp()
        };

        //Send the messages
        const response = await messagingAdmin.sendToDevice(tokens, payload);

        //Check the response to see if any notification failed and delete deprecated tokens if necessary
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', tokens[index], error);
                // Cleanup the tokens who are not registered anymore.
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    tokens.remove(index)
                }
            }
        });

        const currentLikeCount = await getCommentCount(postId) ;
        if (!currentLikeCount.exists) {
            console.log('Post document does not exist for :' + postId); 
            return
        }
        
        let likeCount = currentLikeCount.data()?.numberOfComments;
        likeCount = likeCount + 1;  
        
        console.log('Number of Comments: ' + likeCount);

        //Generate a new promise for set the new event data and another one for update the tokens
        const postLikeCountUpdate = firestoreInstance.collection("posts").doc(postId);
        const privateUserDataDoc = firestoreInstance.collection('users').doc(postUid);
        const newEventPromise = privateUserDataDoc.collection(EVENTS).doc().set(data);
        const updateTokensPromise = privateUserDataDoc.collection("profile").doc(postUid).update('messagingTokens', tokens);
        const updateLikeCount = postLikeCountUpdate.update('numberOfLikes', likeCount);

        //Execute them
        await Promise.all([newEventPromise, updateTokensPromise,updateLikeCount]);
        console.log('The process of send a new follow notification for the user ', postUid, ' has finished successfully')
    } catch (err) {
        console.error('Failed sending a follow notification to user', postUid, 'with error', err);
    }
}

export async function sendPostNotications(snapshot: FirebaseFirestore.DocumentSnapshot, context: any)
{
    console.log('sendPostNotification')
    return
}

export async function getUserPrivateData(userId: string): Promise<FirebaseFirestore.DocumentSnapshot> {
    return await firestoreInstance.collection(PRIV_USER_DATA).doc(userId).collection("profile").doc(userId).get()
}

export async function getPostAuthor(postId: string): Promise<FirebaseFirestore.DocumentSnapshot> {
     return await firestoreInstance.collection("posts").doc(postId).get()
}

export async function getUserToken(userId: string) : Promise<FirebaseFirestore.DocumentSnapshot> {
    return await firestoreInstance.collection(PRIV_USER_DATA).doc(userId).collection("profile").doc(userId).get()
}

export async function getCommentCount(postId: string ) : Promise<FirebaseFirestore.DocumentSnapshot> {
    return await firestoreInstance.collection(POSTS).doc(postId).get()
}


export async function getPostData(postId: string) : Promise<FirebaseFirestore.DocumentSnapshot> {
    return await firestoreInstance.collection('posts').doc(postId).get()
}

export async function userEventExist(userId: string, kind: string, interactionRef: string): Promise<boolean> {
    let ref;
    if (interactionRef === null) {
        ref = firestoreInstance.collection('users')
            .doc(userId).collection(EVENTS)
            .where('interactionUser', '==', userId)
            .where('kind', '==', kind)
    } else {
        ref = firestoreInstance.collection('users')
            .doc(userId).collection(EVENTS)
            .where('interactionUser', '==', userId)
            .where('interactionRef', '==', interactionRef)
            .where('kind', '==', kind);
    }
    const userEvent = await ref.get();
    return !userEvent.empty
}



/*
The behavior for Date objects stored in Firestore is going to change
AND YOUR APP MAY BREAK.
To hide this warning and ensure your app does not break, you need to add the
following code to your app before calling any other Cloud Firestore methods:

  const firestore = new Firestore();

  const settings = {timestampsInSnapshots: true};
  firestore.settings(settings);

With this change, timestamps stored in Cloud Firestore will be read back as
Firebase Timestamp objects instead of as system Date objects. So you will also
need to update code expecting a Date to instead expect a Timestamp. For example:

  // Old:
  const date = snapshot.get('created_at');
  // New:
  const timestamp = snapshot.get('created_at');
  const date = timestamp.toDate();

Please audit all existing usages of Date when you enable the new behavior. In a
future release, the behavior will change to the new behavior, so if you do not
follow these steps, YOUR APP MAY BREAK.
*/

