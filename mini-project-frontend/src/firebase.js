//Import the function used to initialize a Firebase app
import {initializeApp} from 'firebase/app';

//Import Firebase Authentication tools
//getAuth -> connects our app to Firebase Authentication
//GoogleAuthProvider -> allows users to sign in with their Google accounts
import {getAuth, GoogleAuthProvider} from 'firebase/auth';
/*
This configuration object connects our React app to our Firebase Project.

These values are generated from the Firebase Console when we register our web app. They uniquely
identify our Firebase project and allow our app to use Firebase services like Authentication and Firestore.


NOTE: 
    - This is not a secret key
    - It's safe to include this in our frontend code because it only allows access to Firebase services that we have configured (like Authentication). It does not give full access to our Firebase project or database.
*/
const firebaseConfig = {
  apiKey: "AIzaSyBzCrZUXZ4QIFTGhlJPE7rCoK4fTbpDXRs", //Unique API key for this Firebase Project
  authDomain: "peerinterview-fe3d3.firebaseapp.com", // Domain used for authentication
  projectId: "peerinterview-fe3d3", //Firebase project ID
  storageBucket: "peerinterview-fe3d3.firebasestorage.app", // Storage service bucket
  messagingSenderId: "542899865989", // ID for Firebase Cloud Messaging services
  appId: "1:542899865989:web:636e74b27e42779eb19cec" //Unique app identifier
};

/*
Step 1: Initialize Firebase App
This connects our react application to our Firebase project using the configuration object defined above. After this step, we can use Firebase services like Authentication and Firestore in our app.
*/
const app = initializeApp(firebaseConfig);
/*
Step 2: Setup Authentication

auth:
-Main Firebase Authentication object
-Used for login,logout,signup etc.

provider:
- Google authentication provider
-Used when user clicks "Sign in with Google" button to trigger the Google sign-in flow.
*/
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

/*
After this setup, we can use:
signInWithPopup(auth, provider) to trigger the Google sign-in flow when the user clicks the "Sign in with Google" button in our app. This will allow users to authenticate using their Google accounts.
*/