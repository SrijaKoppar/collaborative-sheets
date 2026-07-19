import { auth } from "./firebase"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth"

const provider = new GoogleAuthProvider()

export async function loginWithGoogle() {

  const result = await signInWithPopup(auth, provider)

  return result.user
}

export async function logout() {
  await signOut(auth)
}