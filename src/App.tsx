/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Heart, MessageCircle, Share2, Music2, LogIn, User} from 'lucide-react';
import {useState, useEffect} from 'react';
import {auth} from './firebase';
import {signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged} from 'firebase/auth';
import type {User as FirebaseUser} from 'firebase/auth';

const videos = [
  {id: 1, url: 'https://www.w3schools.com/html/mov_bbb.mp4', username: '@nature_lover', caption: 'Beautiful sunset! #nature', likes: 1200},
  {id: 2, url: 'https://www.w3schools.com/html/movie.mp4', username: '@coder_life', caption: 'Coding session. #react', likes: 850},
];

function AuthButton() {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (user) {
    return (
      <button onClick={handleSignOut} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50">
        <User size={24} />
      </button>
    );
  }

  return (
    <button onClick={handleSignIn} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50">
      <LogIn size={24} />
    </button>
  );
}

function VideoCard({video}: {video: typeof videos[0]}) {
  return (
    <div className="relative h-screen w-full snap-start flex items-center justify-center bg-black">
      <video
        src={video.url}
        className="h-full w-full object-cover"
        loop
        muted
        autoPlay
        playsInline
      />
      
      {/* Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent">
        <h3 className="text-white font-bold text-lg">{video.username}</h3>
        <p className="text-white text-sm">{video.caption}</p>
        <div className="flex items-center gap-2 text-white/80 mt-2 text-sm">
          <Music2 size={16} />
          <span>Original sound - {video.username}</span>
        </div>
      </div>

      <div className="absolute bottom-20 right-4 flex flex-col gap-6">
        <ActionButton icon={Heart} label={video.likes.toString()} />
        <ActionButton icon={MessageCircle} label="45" />
        <ActionButton icon={Share2} label="Share" />
      </div>
    </div>
  );
}

function ActionButton({icon: Icon, label}: {icon: any; label: string}) {
  return (
    <button className="flex flex-col items-center text-white">
      <Icon size={32} className="fill-white" />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <div className="h-screen w-full snap-y snap-mandatory overflow-y-scroll bg-black">
      <AuthButton />
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

