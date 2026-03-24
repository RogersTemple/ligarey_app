import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell, BellOff, Settings, Eraser, UserX
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  deleteUser,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ligarey-prod';

// --- CONSTANTES ---
const INTERESES_COMUNES = [
  "Rock", "Pop", "Indie", "Reggaetón", "Electrónica", "Trap", "Metal",
  "Cerveza fría", "Cócteles", "Vino", "Bailar", "Pogo", "Primera fila",
  "VIP", "Acampada", "Post-concierto", "Hacer fotos", "Charlas profundas",
  "Conocer gente", "Viajar", "Festivales", "Tatuajes", "Moda", "Deporte"
];

const PERFILES_MOCK = [
  { id: 'm1', name: 'Lucía (Ejemplo)', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', phrase: 'Viviendo el momento ✨', lookingFor: 'Gente para el escenario principal', interests: ['Rock', 'Cerveza fría'] },
  { id: 'm2', name: 'Carlos (Ejemplo)', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop', phrase: 'Rock & Roll en vena 🤘', lookingFor: 'Compañero de pogos', interests: ['Metal', 'Pogo'] }
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?w=400&h=400&fit=crop";

export default function App() {
  const [view, setView] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Estado del perfil
  const [myProfile, setMyProfile] = useState({ 
    name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true 
  });
  
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profiles, setProfiles] = useState(PERFILES_MOCK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchAnimation, setShowMatchAnimation] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [profileMode, setProfileMode] = useState('edit');

  const [notifications, setNotifications] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [newNotificationToast, setNewNotificationToast] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [showInspector, setShowInspector] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const sessionStart = useRef(new Date().toISOString());
  const notifiedIds = useRef(new Set());
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Colecciones según Regla 1
  const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios');
  const matchesCol = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
  const chatsCol = collection(db, 'artifacts', appId, 'public', 'data', 'chats');

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, view]);

  // --- INICIO Y AUTH ---
  useEffect(() => {
    const initAuth = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          try {
            const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setMyProfile(prev => ({ ...prev, ...data }));
              if (!data.name || !data.photo || !data.phrase || !data.lookingFor) {
                setView('register');
              } else if (view === 'welcome' || view === 'auth') {
                setView('discover');
              }
            } else {
              setView('register');
            }
          } catch (e) { setView('register'); }
        } else {
          setCurrentUser(null);
          setView('welcome');
        }
        setIsInitializing(false);
      });
    };
    initAuth();
  }, []);

  // --- ESCUCHADORES (Realtime) ---
  useEffect(() => {
    if (!currentUser) return;

    const unsubMatches = onSnapshot(matchesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const id = change.doc.id;
          if (data.to === currentUser.uid) {
            setNotifications(prev => {
              if (prev.find(n => n.id === id)) return prev;
              return [{ id, ...data, isMessage: false }, ...prev];
            });
            if (data.timestamp > sessionStart.current && !notifiedIds.current.has(id)) {
              notifiedIds.current.add(id);
              if (view !== 'notifications') setHasUnreadNotifs(true);
              if (myProfile.notificationsEnabled) {
                setNewNotificationToast({ id, ...data, isMessage: false });
                setTimeout(() => setNewNotificationToast(null), 5000);
              }
            }
          }
        }
      });
    }, (err) => console.error("Error matches:", err));

    const unsubChats = onSnapshot(chatsCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const id = change.doc.id;
          if (data.to === currentUser.uid && data.timestamp > sessionStart.current && !notifiedIds.current.has(id)) {
            notifiedIds.current.add(id);
            if (!activeChatUser || activeChatUser.id !== data.from) {
              if (view !== 'messages' && view !== 'chat') setHasUnreadMessages(true);
              if (myProfile.notificationsEnabled) {
                setNewNotificationToast({ id, ...data, isMessage: true });
                setTimeout(() => setNewNotificationToast(null), 5000);
              }
            }
          }
        }
      });
    }, (err) => console.error("Error chats:", err));

    return () => { unsubMatches(); unsubChats(); };
  }, [currentUser, activeChatUser, myProfile.notificationsEnabled, view]);

  // --- CARGAR CHATS Y PISTA ---
  useEffect(() => {
    if (!currentUser || (view !== 'discover' && view !== 'messages')) return;

    const fetchData = async () => {
      try {
        const matchesSnap = await getDocs(matchesCol);
        const chatIds = [];
        matchesSnap.forEach(d => {
          const data = d.data();
          if (data.from === currentUser.uid) chatIds.push({ id: data.to, name: data.toName });
          if (data.to === currentUser.uid) chatIds.push({ id: data.from, name: data.fromName });
        });
        
        const uniqueIds = Array.from(new Map(chatIds.map(item => [item.id, item])).values());
        const enrichedChats = await Promise.all(uniqueIds.map(async (c) => {
          const uDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', c.id));
          return uDoc.exists() ? { ...c, ...uDoc.data() } : c;
        }));
        setActiveChats(enrichedChats);

        if (view === 'discover') {
          const usersSnap = await getDocs(usersCol);
          const matchedSet = new Set(uniqueIds.map(c => c.id));
          const list = [];
          usersSnap.forEach(d => { 
            if (d.id !== currentUser.uid && d.data().name) {
              list.push({ id: d.id, ...d.data(), isAlreadyMatched: matchedSet.has(d.id) }); 
            }
          });
          setProfiles(list.length > 0 ? list : PERFILES_MOCK);
        }
      } catch (e) { console.error("Error fetching data:", e); }
    };
    fetchData();
  }, [currentUser, view, notifications]);

  // --- CHAT ACTIVO ---
  useEffect(() => {
    if (!currentUser || !activeChatUser) return;
    const unsubChat = onSnapshot(query(chatsCol, orderBy('timestamp', 'asc')), (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if ((d.from === currentUser.uid && d.to === activeChatUser.id) || (d.from === activeChatUser.id && d.to === currentUser.uid)) {
          msgs.push({ id: doc.id, ...d });
        }
      });
      setChatMessages(msgs);
    });
    return () => unsubChat();
  }, [currentUser, activeChatUser]);

  // --- FUNCIONES ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', res.user.uid), { 
          email: authForm.email, 
          fechaRegistro: new Date().toISOString(), 
          notificationsEnabled: true 
        });
        setView('register');
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') setAuthError('Este email ya está en uso.');
      else if (error.code === 'auth/weak-password') setAuthError('Contraseña demasiado corta (mín. 6).');
      else setAuthError('Error: Revisa tus datos.');
    } finally { setIsAuthLoading(false); }
  };

  const saveProfileData = async () => {
    if (!currentUser) return false;
    if (!myProfile.name.trim() || !myProfile.photo || !myProfile.phrase.trim() || !myProfile.lookingFor.trim() || myProfile.interests.length === 0) {
      setPhotoError('¡Nombre, Foto, Frase, Busco e Intereses son obligatorios!');
      return false;
    }
    setIsSavingProfile(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid), { ...myProfile }, { merge: true });
      setSaveMessage('¡Perfil guardado!');
      setTimeout(() => setSaveMessage(''), 2000);
      setPhotoError('');
      return true;
    } catch (e) { setPhotoError('Error al guardar. La foto es muy grande.'); return false; }
    finally { setIsSavingProfile(false); }
  };

  const handleGoToPista = async () => {
    const success = await saveProfileData();
    if (success) setView('discover');
  };

  const handleMatchAction = async (type) => {
    if (showMatchAnimation) return;
    const target = profiles[currentIndex];
    if (target.isAlreadyMatched && type !== 'dislike') {
        setActiveChatUser(target);
        setView('chat');
        return;
    }
    setShowMatchAnimation(type);
    if (type !== 'dislike' && currentUser && target && !target.id.startsWith('m')) {
      await addDoc(matchesCol, { 
        from: currentUser.uid, fromName: myProfile.name, to: target.id, toName: target.name, type: type, timestamp: new Date().toISOString() 
      });
    }
    setTimeout(() => { 
      setShowMatchAnimation(null); 
      setCurrentIndex(prev => (prev + 1) % (profiles.length || 1)); 
    }, type === 'dislike' ? 300 : 1500);
  };

  if (isInitializing) return <div className="min-h-screen bg-stone-900 flex items-center justify-center"><Crown className="w-16 h-16 text-rose-500 animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      
      {/* NOTIFICACIÓN TOAST */}
      {newNotificationToast && (
        <div 
          onClick={() => { setActiveChatUser({ id: newNotificationToast.from, name: newNotificationToast.fromName }); setView('chat'); setNewNotificationToast(null); }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-[340px] px-4 animate-in slide-in-from-top cursor-pointer active:scale-95"
        >
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
              {newNotificationToast.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase text-rose-400">Notificación VIP</p>
              <p className="text-xs font-bold truncate"><b>{newNotificationToast.fromName}</b> {newNotificationToast.isMessage ? 'te escribió' : 'te saludó'}</p>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTOR VIP */}
      {showInspector && (
        <div className="absolute inset-0 z-[500] bg-stone-900/95 backdrop-blur-xl animate-in slide-in-from-bottom flex flex-col p-6">
          <button onClick={() => setShowInspector(null)} className="self-end p-2 bg-white/10 rounded-full text-white mb-6"><X className="w-6 h-6" /></button>
          <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200">
            <img src={showInspector.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 p-8 text-white w-full">
              <h2 className="text-4xl font-black tracking-tighter mb-2">{showInspector.name}</h2>
              <p className="text-rose-300 font-bold mb-2 italic">"{showInspector.phrase || '¡Hola!'}"</p>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Estoy buscando:</p>
                <p className="text-sm font-medium leading-relaxed">{showInspector.lookingFor || 'Pasarlo bien'}</p>
              </div>
              <div className="flex flex-wrap gap-2">{(showInspector.interests || []).map(i => <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
            </div>
          </div>
          <button onClick={() => setShowInspector(null)} className="w-full py-5 mt-6 rounded-full bg-rose-500 text-white font-black uppercase tracking-widest active:scale-95 transition-all">Cerrar Ficha</button>
        </div>
      )}

      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* CABECERA */}
        {view !== 'welcome' && view !== 'auth' && view !== 'chat' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500 tracking-tighter uppercase">LigaRey</h1></div>
            <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> DESCUENTO REY</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50 animate-in fade-in duration-500">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter uppercase leading-none">LigaRey</h1>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crear cuenta</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold uppercase tracking-widest text-xs">Entrar</button>
              </div>
            </div>
          )}

          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50 animate-in slide-in-from-right">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 tracking-tighter uppercase">{authMode === 'login' ? 'Hola!' : 'Registro'}</h2>
              {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {authError}</div>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
                <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg active:scale-95 flex items-center justify-center">
                   {isAuthLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'ENTRAR' : 'REGISTRARSE')}
                </button>
              </form>
            </div>
          )}

          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <h2 className="text-2xl font-black text-center mb-6 uppercase tracking-tighter">Mi Cuenta</h2>
              <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 shadow-inner">
                <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-50'}`}>DATOS</button>
                <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>PREVIA</button>
              </div>
              
              {profileMode === 'edit' ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-stone-800 shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer">
                      {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                      const reader = new FileReader();
                      reader.onloadend = () => setMyProfile({...myProfile, photo: reader.result});
                      if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
                    }} className="hidden" />
                    {photoError && <p className="text-red-500 text-[10px] font-bold mt-2 text-center bg-red-50 p-2 rounded-lg">{photoError}</p>}
                  </div>
                  <input type="text" placeholder="Nombre (Obligatorio)" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400" />
                  <input type="text" placeholder="Frase favorita (Obligatorio)" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none italic" />
                  <textarea placeholder="ESTOY BUSCANDO: (Obligatorio)" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none h-20" />
                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 10).map(int => (
                      <button key={int} onClick={() => {
                        const list = myProfile.interests.includes(int) ? myProfile.interests.filter(i => i !== int) : [...myProfile.interests, int].slice(0, 5);
                        setMyProfile({...myProfile, interests: list});
                      }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>
                  <div className="pt-6 space-y-3">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs">{saveMessage}</p>}
                    <button onClick={saveProfileData} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95">Guardar Cambios</button>
                    <button onClick={() => signOut(auth).then(() => setView('welcome'))} className="w-full text-stone-400 font-black text-[10px] uppercase py-2">Cerrar Sesión</button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-red-500 font-black text-[10px] uppercase py-2">Eliminar Cuenta</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                    <h2 className="text-3xl font-black tracking-tighter mb-1">{myProfile.name || 'Sin nombre'}</h2>
                    <p className="text-rose-300 font-bold mb-1 italic">"{myProfile.phrase || 'Tu frase'}"</p>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-3">Busco: {myProfile.lookingFor || '...'}</p>
                    <div className="flex flex-wrap gap-2">{(myProfile.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={handleGoToPista} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl h-16 active:scale-95">¡A LA PISTA!</button>
            </div>
          )}

          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative animate-in fade-in">
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md">
                  <div className="text-center animate-in zoom-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4 border-4 border-stone-50">
                      {showMatchAnimation === 'beer' && <Beer className="text-amber-500 fill-current w-12 h-12" />}
                      {showMatchAnimation === 'hand' && <Hand className="text-green-500 fill-current w-12 h-12" />}
                      {showMatchAnimation === 'dislike' && <X className="text-red-500 w-12 h-12" />}
                    </div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{showMatchAnimation === 'dislike' ? 'PASADO' : 'ENVIADO'}</h2>
                  </div>
                </div>
              )}
              <div className={`flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border-4 ${profiles[currentIndex]?.isAlreadyMatched ? 'border-emerald-500 shadow-emerald-500/20' : 'border-stone-200'}`}>
                {profiles[currentIndex] ? (
                  <>
                    <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                    {profiles[currentIndex]?.isAlreadyMatched && (
                      <div className="absolute top-6 right-6 z-10 bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
                        <Check className="w-3 h-3" /> YA EN CHAT
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 p-8 text-white w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-4xl font-black tracking-tighter leading-none">{profiles[currentIndex]?.name}</h2>
                        {profiles[currentIndex]?.isAlreadyMatched && <MessageCircle className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <p className="text-rose-300 font-bold mb-1 italic">"{profiles[currentIndex]?.phrase || 'Hola!'}"</p>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-4">Busco: {profiles[currentIndex]?.lookingFor || 'Pasarlo bien'}</p>
                      <div className="flex flex-wrap gap-2">{(profiles[currentIndex]?.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 p-8 text-center font-bold italic">No hay más gente nueva por ahora.</div>
                )}
              </div>
              <div className="flex justify-center items-center gap-4 py-6">
                <button onClick={() => handleMatchAction('beer')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-amber-400'} text-white`}>
                  {profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-8 h-8" /> : <Beer className="w-8 h-8 fill-current" />}
                </button>
                <button onClick={() => handleMatchAction('dislike')} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90"><X className="w-7 h-7" /></button>
                <button onClick={() => handleMatchAction('hand')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-green-500'} text-white`}>
                  {profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-8 h-8" /> : <Hand className="w-8 h-8 fill-current" />}
                </button>
              </div>
            </div>
          )}

          {view === 'messages' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter">Mis Chats</h2>
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setActiveChatUser(chat); setView('chat'); }} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer active:scale-95">
                    <img src={chat.photo || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100" />
                    <div className="flex-1"><p className="text-lg font-bold text-stone-800 tracking-tight">{chat.name}</p><p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Chat abierto</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'chat' && activeChatUser && (
            <div className="h-full flex flex-col bg-stone-50 animate-in slide-in-from-right">
              <div className="p-4 bg-white border-b flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('messages')} className="p-1"><ChevronLeft className="w-7 h-7 text-stone-400" /></button>
                  <div onClick={() => setShowInspector(activeChatUser)} className="flex items-center gap-3 cursor-pointer">
                    <img src={activeChatUser.photo || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover" />
                    <div><h3 className="font-black text-stone-800 uppercase leading-none">{activeChatUser.name}</h3><p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mt-1">Ver ficha VIP</p></div>
                  </div>
                </div>
                <button onClick={() => deleteConversation(activeChatUser.id)} className="p-2 text-stone-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-3xl max-w-[80%] text-sm font-medium shadow-sm ${m.from === currentUser.uid ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-stone-700 rounded-tl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={(e) => {
                e.preventDefault(); if (!newMessageText.trim()) return;
                addDoc(chatsCol, { from: currentUser.uid, fromName: myProfile.name, to: activeChatUser.id, text: newMessageText, timestamp: new Date().toISOString() });
                setNewMessageText('');
              }} className="p-4 bg-white border-t flex gap-2">
                <input value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Mensaje..." className="flex-1 bg-stone-100 rounded-full px-6 py-3 outline-none" />
                <button type="submit" className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white active:scale-90"><Send className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {view === 'notifications' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Actividad</h2>
                <button onClick={() => { setNotifications([]); setHasUnreadNotifs(false); }} className="p-2 text-stone-400 hover:text-rose-500 flex items-center gap-1">
                  <Eraser className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Limpiar</span>
                </button>
              </div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} onClick={() => { setActiveChatUser({ id: notif.from, name: notif.fromName }); setView('chat'); }} className="bg-stone-900 text-white p-4 rounded-3xl shadow-lg flex items-center gap-4 cursor-pointer active:scale-95">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
                      {notif.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
                    </div>
                    <div className="flex-1"><p className="text-xs font-bold leading-tight"><b>{notif.fromName}</b> {notif.isMessage ? 'te escribió...' : `te mandó un ${notif.type}`}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        {['discover', 'register', 'messages', 'notifications'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}>
              <MessageCircle className="w-7 h-7" />
              {hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
            </button>
            <button onClick={() => { setView('notifications'); setHasUnreadNotifs(false); }} className={`p-2 relative transition-all ${view === 'notifications' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}>
              <Bell className="w-7 h-7" />
              {hasUnreadNotifs && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}
            </button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODALES */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8" /></div>
              <h3 className="text-2xl font-black text-stone-800 mb-2 uppercase">¿Eliminar cuenta?</h3>
              <p className="text-stone-500 mb-8 text-sm italic">Esta acción es permanente e irreversible.</p>
              <div className="space-y-3">
                <button onClick={handleDeleteAccount} className="w-full py-4 rounded-full bg-red-500 text-white font-bold text-lg active:scale-95 transition-all">SÍ, BORRAR TODO</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 rounded-full bg-stone-100 text-stone-800 font-bold text-lg active:scale-95 transition-all">CANCELAR</button>
              </div>
            </div>
          </div>
        )}

        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase">Descuento Rey</h3>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${currentUser?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply mx-auto mb-4" />
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest opacity-60">Barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}