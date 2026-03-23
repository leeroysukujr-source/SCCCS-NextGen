import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBlaq0ruliGe_NjAEu2xmGEyQaomQiyoM",
  authDomain: "sccc-nextgen.firebaseapp.com",
  projectId: "sccc-nextgen",
  storageBucket: "sccc-nextgen.firebasestorage.app",
  messagingSenderId: "490488518672",
  appId: "1:490488518672:web:42eb6d7f68513edbf89295",
  measurementId: "G-PN1JV7N72D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
