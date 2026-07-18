/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Heart, MessageCircle, Share2, Music2, LogIn, User, Camera, Trash2, X, Send, Search} from 'lucide-react';
import {useState, useEffect, useCallback, useRef} from 'react';
import {auth, db} from './firebase';
import {signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged} from 'firebase/auth';
import type {User as FirebaseUser} from 'firebase/auth';
import {collection, query, orderBy, limit, startAfter, getDocs, addDoc, doc, runTransaction, getDoc, deleteDoc, DocumentData, QueryDocumentSnapshot} from 'firebase/firestore';

type Video = {
  id: string;
  url: string;
  username: string;
  caption: string;
  likes: number;
  ownerId: string;
};

type Comment = {
    id: string;
    userId: string;
    username: string;
    text: string;
    createdAt: string;
};

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

function VideoCard({video, user, onCommentClick}: {video: Video; user: FirebaseUser | null; onCommentClick: (video: Video) => void}) {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkLiked = async () => {
      const likeDoc = await getDoc(doc(db, 'videos', video.id, 'likes', user.uid));
      setLiked(likeDoc.exists());
    };
    checkLiked();
  }, [video.id, user]);

  const handleLike = async () => {
    if (!user) return;
    const videoRef = doc(db, 'videos', video.id);
    const likeRef = doc(db, 'videos', video.id, 'likes', user.uid);
    
    try {
      await runTransaction(db, async (transaction) => {
        if (liked) {
          transaction.update(videoRef, {likes: increment(-1)});
          transaction.delete(likeRef);
        } else {
          transaction.update(videoRef, {likes: increment(1)});
          transaction.set(likeRef, {videoId: video.id, userId: user.uid});
        }
      });
      setLiked(!liked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

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
        <button onClick={handleLike} className="flex flex-col items-center text-white">
            <Heart size={32} className={liked ? "fill-red-500 text-red-500" : "fill-white"} />
            <span className="text-xs mt-1">{video.likes}</span>
        </button>
        <button onClick={() => onCommentClick(video)} className="flex flex-col items-center text-white">
            <MessageCircle size={32} />
        </button>
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

function CommentsModal({video, onClose, user}: {video: Video; onClose: () => void; user: FirebaseUser | null}) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'videos', video.id, 'comments'), orderBy('createdAt', 'desc'));
        // Using getDocs for simplicity, could be onSnapshot for real-time
        const fetchComments = async () => {
            const snapshot = await getDocs(q);
            setComments(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Comment[]);
        };
        fetchComments();
    }, [video.id]);

    const addComment = async () => {
        if (!user || !text) return;
        await addDoc(collection(db, 'videos', video.id, 'comments'), {
            videoId: video.id,
            userId: user.uid,
            username: user.displayName || 'Anonymous',
            text,
            createdAt: new Date().toISOString()
        });
        setText('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
            <div className="bg-white w-full max-w-md h-[70vh] rounded-t-2xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold">Comments</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {comments.map(c => (
                        <div key={c.id} className="mb-2">
                            <span className="font-bold text-sm">{c.username}: </span>
                            <span className="text-sm">{c.text}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-4">
                    <input className="flex-1 p-2 border rounded" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." />
                    <button onClick={addComment} className="p-2 bg-black text-white rounded"><Send /></button>
                </div>
            </div>
        </div>
    );
}

function ProfileDrawer({videos, onClose, user}: {videos: Video[]; onClose: () => void; user: FirebaseUser}) {
    const userVideos = videos.filter(v => v.ownerId === user.uid);
    
    const deleteVideo = async (videoId: string) => {
        await deleteDoc(doc(db, 'videos', videoId));
    };

    return (
        <div className="fixed inset-y-0 right-0 w-64 bg-black z-50 p-4 overflow-y-auto text-white">
            <button onClick={onClose} className="mb-4"><X /></button>
            <h2 className="font-bold mb-4">My Videos</h2>
            {userVideos.map(v => (
                <div key={v.id} className="flex justify-between items-center mb-2">
                    <span className="truncate">{v.caption}</span>
                    <button onClick={() => deleteVideo(v.id)} className="text-red-500"><Trash2 size={16} /></button>
                </div>
            ))}
        </div>
    );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchVideos = useCallback(async (isInitial = false) => {
    let q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(5));
    if (!isInitial && lastVisible) {
      q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(5));
    }
    const snapshot = await getDocs(q);
    const newVideos = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Video[];
    
    setVideos(prev => isInitial ? newVideos : [...prev, ...newVideos]);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
  }, [lastVisible]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchVideos(true);
  }, []);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop + scrollRef.current.clientHeight >= scrollRef.current.scrollHeight - 100) {
        if (lastVisible) fetchVideos();
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Simulate upload - in a real app, upload to storage and get URL
    const videoUrl = URL.createObjectURL(file); 
    
    await addDoc(collection(db, 'videos'), {
      url: videoUrl,
      username: user.displayName || 'Anonymous',
      caption: 'New video!',
      likes: 0,
      createdAt: new Date().toISOString(),
      ownerId: user.uid
    });
  };

  const filteredVideos = videos.filter(v => 
    v.caption.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="h-screen w-full snap-y snap-mandatory overflow-y-scroll bg-black pt-16">
      <div className="fixed top-0 left-0 w-full p-2 bg-black/80 z-30 flex items-center">
        <Search className="text-white ml-2" />
        <input 
            className="flex-1 bg-transparent text-white p-2 ml-2 outline-none" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <AuthButton />
      {user && (
        <>
            <label className="absolute top-4 left-4 text-white p-2 rounded-full bg-black/50 z-20 cursor-pointer">
                <Camera size={24} />
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleCapture} />
            </label>
            <button onClick={() => setIsDrawerOpen(true)} className="absolute top-16 left-4 text-white p-2 rounded-full bg-black/50 z-20">
                <User size={24} />
            </button>
            {isDrawerOpen && <ProfileDrawer videos={videos} onClose={() => setIsDrawerOpen(false)} user={user} />}
        </>
      )}
      {filteredVideos.map((video) => (
        <VideoCard key={video.id} video={video} user={user} onCommentClick={setCurrentVideo} />
      ))}
      {currentVideo && <CommentsModal video={currentVideo} onClose={() => setCurrentVideo(null)} user={user} />}
    </div>
  );
}

