import {
    AUTHOR_OF_POSTS, 
    FEED, 
    FOLLOWERS, 
    MAX_BATCH_SIZE,
    PRIV_USER_DATA, 
    PUBLIC_USER_DATA
} from "./constants";

import * as _ from "lodash";
import * as algoliasearch from 'algoliasearch' 
import admin = require("firebase-admin");
const firestoreInstance = admin.firestore();


export async function updateThumbImages(snap: { data: () => { (): any; new(): any; thumbImages: any; }; }, context: { params: { postId: any; imgId: any; }; }) {
    const PostId = context.params.postId;
    const imgId = context.params.imgId;    
    const thumbImages = snap.data().thumbImages;

    try {
        console.log('Post ', PostId, ' imagage Id ',imgId,'\ndata:',thumbImages);
    } catch (err) {
        console.log('Post ', PostId, ' imagage Id ',imgId);
    }
}

const algolia = algoliasearch('TWU83H7FS8', '1beb1cb0de444f069abd9c6dddd245ec');

export async function newPostImage({ context }: { snap: any; context: any; })
{
    const url = context.params.id;
    console.log("URL : ", url);
      
    try {
        console.log('The updated the post :', url, ' has finished successfully')
    } catch (err) {
        console.error('Failed updating ', url, 'with error', err);
    }
}

export async function updateAlgoliaPost(change: { after: { exists: any; data: () => any; }; }, context: { params: { postId: any; }; }) {
    
    const index = algolia.initIndex('posts');
    const postId = context.params.postId;
    const data = change.after.exists ? change.after.data() : null;

    console.log('------- Update Algolia Posts ----------');

    // // const previousData = change.before.data();
    // // We'll only update if the name has changed.
    // // This is crucial to prevent infinite loops.

    // if (data.thumbImages.count === 0 ) 
    //    return null;
   
    console.log('--------- Starting ----------');

    if (!data) {
        index.deleteObject(postId, (err: any) => {
            if (err) throw err
            console.log('Posoved from Algolia Index', postId);
        })
    }
    console.log('--------- Updating ----------');

    data['objectID'] = postId;
    console.log('Updated data', data);

    index.saveObject(data, (err: any) => {
        if (err) throw err
        console.log('Posts updated in Algolia Index', data.objectID)
    })

}

export async function newAlgoliaPost(snap: { data: () => any; }, context: { params: { postId: any; }; }) {
    const index = algolia.initIndex('posts');
    const postId = context.params.postId;
    const data = snap.data();
    console.log ('------ New Alglolia Post -------');
   
    if (!data) {
        index.deleteObject(postId, (err: any) => {
            if (err) throw err
            console.log('Post removed from Algolia Index', postId);
        })
    }

    console.log ('------ Insert new Post -------');
    data['objectID'] = postId;
    console.log('Updated data', data);

    index.saveObject(data, (err: any) => {
        if (err) throw err
        console.log('Posts updated in Algolia Index', data.objectID)
    })

}


export async function updateAlgoliaLocations(change: { data: () => any; }, context: { params: { locationId: any; }; }) {
    const index = algolia.initIndex('locations');
    const locationId = context.params.locationId;
    
    const data = change.data();
   
    // We'll only update if the name has changed.
    // This is crucial to prevent infinite loops.

    if (!data) {
        index.deleteObject(locationId, (err: any) => {
            if (err) throw err
            console.log('User removed from Algolia index', locationId);
        })

    }
   
    data['objectID'] = locationId;
    console.log('Updated data', data);

    index.saveObject(data, (err: any) => {
        if (err) throw err
        console.log('Location updated in Algolia locations Index', data.objectID)
    })
    
}

export async function newAlgoliaLocation(change: { data: () => any; }, context: { params: { locationId: any; }; }) {
    const index = algolia.initIndex('locations');
    const locationId = context.params.locationId;
    
    const data = change.data();
   
    // We'll only update if the name has changed.
    // This is crucial to prevent infinite loops.

    if (!data) {
        index.deleteObject(locationId, (err: any) => {
            if (err) throw err
            console.log('User removed from Algolia index', locationId);
        })

    }
   
    data['objectID'] = locationId;
    console.log('Updated data', data);

    index.saveObject(data, (err: any) => {
        if (err) throw err
        console.log('Location updated in Algolia locations Index', data.objectID)
    })
    
}


export async function updateAlgoliaUsers(change: { after: { exists: any; data: () => any; }; }, context: { params: { userId: any; }; }) {
    const index = algolia.initIndex('users');
    const userId = context.params.userId;
    const data = change.after.exists ? change.after.data() : null;

    //const previousData = change.before.data();
    console.log(data);
    console.log('User ID :' , userId);

    // We'll only update if the name has changed.
    // This is crucial to prevent infinite loops.
   
    if (!data) {
        index.deleteObject(userId, (err: any) => {
            if (err) throw err
            console.log('User removed from Algolia index', userId);
        })

    }

    data['objectID'] = userId;
    console.log('Updated data', data);

    index.saveObject(data, (err: any) => {
        if (err) throw err
        console.log('post updated in Algolia Index', data.objectID)
    })
    
}

/********** 
 * After the user updates a feed item the feed must be changed to match the comments count, like counts etc.
*/

export async function updateFeedAfterUserAction(context: { params: { followerId: any; followedId: any; }; }, follow: boolean) {
    // noinspection TypeScriptUnresolvedVariable
    const followerId = context.params.followerId;
    // noinspection TypeScriptUnresolvedVariable
    const followedId = context.params.followedId;

    const followerFeedRef = firestoreInstance.collection(PRIV_USER_DATA).doc(followerId).collection(FEED);
    try {
        //Get the posts from the followed user
        const followedUserPosts = await getLastMonthUserPosts(followedId);
        // console.log('User ', followedId, ' have ', followedUserPosts.length, ' posts');
        //Check if the followed user have posts
        if (followedUserPosts.length === 0) {
            console.log('User ', followedId, ' doesnt have posts');
            return 
        }
        //Generate the right amount of batches
        const batches = _.chunk(followedUserPosts, MAX_BATCH_SIZE)
            .map(postSnapshots => {
                const writeBatch = firestoreInstance.batch();
                if (follow) {
                    postSnapshots.forEach(post => {
                        // console.log('Writing ', post.id, ' in feed ', followerId);
                        writeBatch.set(followerFeedRef.doc(post.id), post.data());
                    });
                } else {
                    postSnapshots.forEach(post => {
                        // console.log('Deleting ', post.id, ' in feed ', followerId);
                        writeBatch.delete(followerFeedRef.doc(post.id));
                    });
                }
                return writeBatch.commit();
            });

        await Promise.all(batches);
        console.log('Feed for user ', followerId, ' updated after follow, ', follow, ' user ', followedId)
    } catch (err) {
        console.error('Failed updating the feed of the user ', followerId, 'after follow user ', followerId, 'with error', err);
    }

}

export async function updateFollowersFeed(event: { params: { postId: any; }; data: { data: () => { (): any; new(): any; author: { (): any; new(): any; uid: any; }; }; }; }, isDeletion: boolean) {
    const postId = event.params.postId;
    const authorId = event.data.data().author.uid;

    const privateUserdataRef = firestoreInstance.collection(PRIV_USER_DATA);
    try {

        //Retrieve the Id's from all the followers of the post author
        const authorFollowers = await getUserFollowersIds(authorId);

        //Check if the user have followers
        if (authorFollowers.length === 0) {
            console.log('There are no followers to update feed.');
            return 
        }

        //Generate the right amount of batches
        const batches = _.chunk(authorFollowers, MAX_BATCH_SIZE)
            .map(userIds => {
                const writeBatch = firestoreInstance.batch();
                if (isDeletion) {
                    userIds.forEach(userId => {
                        // console.log('Deleting post ', postId, ' in user ', userId, ' feed');
                        writeBatch.delete(privateUserdataRef.doc(userId).collection(FEED).doc(postId));
                    });
                } else {
                    userIds.forEach(userId => {
                        // console.log('Writing post ', postId, ' in user ', userId, ' feed');
                        writeBatch.set(privateUserdataRef.doc(userId).collection(FEED).doc(postId), event.data.data());
                    });
                }
                return writeBatch.commit();
            });

        await Promise.all(batches);
        console.log('The feed of ', authorFollowers.length, ' have been update')
    } catch (err) {
        console.error('Failed updating the users feed after the user', authorId, ' posted ', postId, 'with error', err);
    }
}







async function getUserFollowersIds(userId: string): Promise<string[]> {
    const followers = await firestoreInstance.collection(PUBLIC_USER_DATA).doc(userId).collection(FOLLOWERS).get();
    return followers.docs.map((followerSnapshot: { id: any; }) => followerSnapshot.id)
}

async function getLastMonthUserPosts(userId: string): Promise<FirebaseFirestore.DocumentSnapshot[]> {
    const today = new Date();
    const priorDateTimeStamp = new Date().setDate(today.getDate() - 30);
    const priorDate = new Date(priorDateTimeStamp);

    const userPostsQuery = await firestoreInstance.collection(PRIV_USER_DATA).doc(userId).collection(AUTHOR_OF_POSTS)
        .where('creationDate', '>=', priorDate)
        .get();

    return userPostsQuery.docs;
}
