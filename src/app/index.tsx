import { Redirect } from 'expo-router';
import React from 'react';

const index = () => {
  
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

  // const signIn = async () => {
  //   try {
  //     const user = await signInWithEmailAndPassword(auth, email, password);
  //     if (user) router.replace('/(tabs)/favorites')
  //   }
  //   catch (error: any) {
  //     console.error("Error signing in:", error);
  //     alert('Sign in failed: ' + error.message);
  //   }
  // }
  // const signUp = async () => {
  //   try {
  //     const user = await createUserWithEmailAndPassword(auth, email, password);
  //     if (user) router.replace('/(tabs)/favorites');
  //   }
  //   catch (error: any) {
  //     console.error("Error signing up:", error);
  //     alert('Sign up failed: ' + error.message);
  //   }
  // }
  return (
    <Redirect href="/(tabs)/favorites" />
    // <SafeAreaView>
    //   <Text>Login</Text>
    //   <TextInput placeholder="email" value={email} onChangeText={setEmail} />
    //   <TextInput placeholder="password" value={password} onChangeText={setPassword} />
    //   <TouchableOpacity onPress={signIn}>
    //     <Text>Login</Text>
    //   </TouchableOpacity>
    //   <TouchableOpacity onPress={signUp}>
    //     <Text>Sign Up</Text>
    //   </TouchableOpacity>
    // </SafeAreaView>
  );
}

export default index