/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Heart, MessageCircle, Share2, Music2, LogIn, User, Camera, Trash2, X, Send, Search, Home, Compass, Users, Video, Mail, Bell, MoreHorizontal, Bookmark, Plus} from 'lucide-react';
import {useState, useEffect, useCallback, useRef} from 'react';
import {auth, db} from './firebase';
import {signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged} from 'firebase/auth';
import type {User as FirebaseUser} from 'firebase/auth';
import {collection, query, orderBy, limit, startAfter, getDocs, addDoc, doc, runTransaction, getDoc, deleteDoc, DocumentData, QueryDocumentSnapshot, increment, updateDoc, setDoc} from 'firebase/firestore';

type Video = {
  id: string;
  url: string;
  username: string;
  caption: string;
  likes: number;
  viewCount: number;
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
  const [isFollowing, setIsFollowing] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateDoc(doc(db, 'videos', video.id), {viewCount: increment(1)});
            }
        });
    }, {threshold: 1.0});

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [video.id]);

  useEffect(() => {
    if (!user) return;
    const checkLiked = async () => {
      const likeDoc = await getDoc(doc(db, 'videos', video.id, 'likes', user.uid));
      setLiked(likeDoc.exists());
    };
    const checkFollowing = async () => {
        const followDoc = await getDoc(doc(db, 'users', user.uid, 'following', video.ownerId));
        setIsFollowing(followDoc.exists());
    };
    checkLiked();
    checkFollowing();
  }, [video.id, video.ownerId, user]);

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

  const handleFollow = async () => {
      if (!user) return;
      const followRef = doc(db, 'users', user.uid, 'following', video.ownerId);
      if (isFollowing) {
          await deleteDoc(followRef);
      } else {
          await setDoc(followRef, {userId: user.uid, creatorId: video.ownerId});
      }
      setIsFollowing(!isFollowing);
  };

  return (
    <div ref={videoRef} className="relative h-[80vh] w-full snap-start flex gap-4">
      <video
        src={video.url}
        className="h-full w-full object-cover rounded-lg bg-black"
        loop
        muted
        autoPlay
        playsInline
      />
      
      {/* Interaction Column */}
      <div className="flex flex-col gap-4 justify-end pb-10">
        <button onClick={handleLike} className="flex flex-col items-center">
            <Heart size={32} className={liked ? "fill-zip-red text-zip-red" : ""} />
            <span className="text-xs">{video.likes}</span>
        </button>
        <button onClick={() => onCommentClick(video)} className="flex flex-col items-center">
            <MessageCircle size={32} />
        </button>
        <button className="flex flex-col items-center">
            <Bookmark size={32} />
        </button>
        <button className="flex flex-col items-center">
            <Share2 size={32} />
        </button>
      </div>

      {/* Overlay Caption */}
      <div className="absolute bottom-10 left-4">
        <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-lg">{video.username}</h3>
            {user && user.uid !== video.ownerId && (
                <button onClick={handleFollow} className="text-xs bg-zip-red text-white px-2 py-1 rounded">
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            )}
        </div>
        <p className="text-white text-sm">{video.caption}</p>
        <div className="flex items-center gap-2 text-white/80 mt-2 text-sm">
          <Music2 size={16} />
          <span>Original sound - {video.username}</span>
          <span className="ml-auto">{video.viewCount} views</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
    const items = [
        {icon: Home, label: 'For You'},
        {icon: Compass, label: 'Explore'},
        {icon: Users, label: 'Following'},
        {icon: Users, label: 'Friends'},
        {icon: Video, label: 'LIVE'},
        {icon: Mail, label: 'Messages'},
        {icon: Bell, label: 'Activity'},
        {icon: Plus, label: 'Upload'},
        {icon: User, label: 'Profile'},
        {icon: MoreHorizontal, label: 'More'},
    ];
    return (
        <aside className="w-60 h-screen fixed left-0 top-16 p-4 border-r border-gray-800 overflow-y-auto bg-black z-20">
            {items.map(item => (
                <div key={item.label} className="flex items-center gap-4 p-3 hover:bg-gray-900 rounded-lg cursor-pointer">
                    <item.icon size={24} />
                    <span className="font-semibold text-lg">{item.label}</span>
                </div>
            ))}
        </aside>
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
      viewCount: 0,
      createdAt: new Date().toISOString(),
      ownerId: user.uid
    });
  };

  const filteredVideos = videos.filter(v => 
    v.caption.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-black p-4 border-b border-gray-800 flex justify-between items-center z-40">
        <h1 className="text-2xl font-bold text-zip-blue">ZIP ZAP</h1>
        <div className="relative w-96">
            <Search className="absolute left-2 top-2.5 text-gray-400" />
            <input 
                className="w-full bg-gray-900 p-2 pl-10 rounded-full" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-4">
            {user && (
                <label className="cursor-pointer text-zip-red">
                    <Plus size={24} />
                    <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleCapture} />
                </label>
            )}
            <AuthButton />
        </div>
      </nav>

      {/* Main Layout */}
      <div className="pt-20 flex px-4">
        <Sidebar />
        <main ref={scrollRef} onScroll={handleScroll} className="flex-1 ml-60 h-[calc(100vh-80px)] overflow-y-scroll snap-y snap-mandatory px-20">
            {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} user={user} onCommentClick={setCurrentVideo} />
            ))}
        </main>
      </div>
      
      {isDrawerOpen && user && <ProfileDrawer videos={videos} onClose={() => setIsDrawerOpen(false)} user={user} />}
      {currentVideo && <CommentsModal video={currentVideo} onClose={() => setCurrentVideo(null)} user={user} />}
    </div>
  );
}

