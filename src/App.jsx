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
  deleteUser
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

const firebaseConfig = {
  apiKey: "AIzaSyCCPXwU33jrYr5nRVyTnQGWeCY_6W-FmXc",
  authDomain: "ligarey.firebaseapp.com",
  projectId: "ligarey",
  storageBucket: "ligarey.firebasestorage.app",
  messagingSenderId: "625102595981",
  appId: "1:625102595981:web:baf09f9cda0d1b3b19ffc4",
  measurementId: "G-ZYLWEZX85C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(console.error);

const INTERESES_COMUNES = [
  "Rock", "Pop", "Indie", "Reggaetón", "Electrónica", "Trap", "Metal",
  "Cerveza fría", "Cócteles", "Vino", "Bailar", "Pogo", "Primera fila",
  "VIP", "Acampada", "Post-concierto", "Hacer fotos", "Charlas profundas",
  "Conocer gente", "Viajar", "Festivales", "Tatuajes", "Moda", "Deporte"
];

const PERFILES_MOCK = [
  { id: 'm1', name: 'Lucía (Ejemplo)', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', phrase: 'Viviendo el momento ✨', lookingFor: 'Gente para el escenario principal', interests: ['Rock', 'Cerveza fría'] }
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

  // Perfil con todos los campos solicitados
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
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const sessionStart = useRef(new Date().toISOString());
  const notifiedIds = useRef(new Set());
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, view]);

  useEffect(() => {
    if (view === 'notifications') setHasUnreadNotifs(false);
    if (view === 'messages') setHasUnreadMessages(false);
  }, [view]);

  // --- LÓGICA DE INICIO ---
  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 6000);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMyProfile({ 
              name: data.name || '', 
              photo: data.photo || null, 
              phrase: data.phrase || '', 
              lookingFor: data.lookingFor || '', 
              interests: data.interests || [],
              notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : true
            });
            // Si faltan datos obligatorios, forzar registro
            if (!data.name || !data.photo || !data.phrase || !data.lookingFor) {
              setView('register');
            } else if (view === 'welcome' || view === 'auth') {
              setView('discover');
            }
          } else {
            setView('register');
          }
        } catch (e) { setView('register'); }
      } else { setCurrentUser(null); setView('welcome'); }
      clearTimeout(timer);
      setIsInitializing(false);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  // --- ESCUCHADORES EN TIEMPO REAL ---
  useEffect(() => {
    if (!currentUser) return;

    const qMatches = query(collection(db, 'matches'));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === currentUser.uid && data.timestamp > sessionStart.current && !notifiedIds.current.has(change.doc.id)) {
            notifiedIds.current.add(change.doc.id);
            setNotifications(prev => [{ id: change.doc.id, ...data, isMessage: false }, ...prev]);
            if (view !== 'notifications') setHasUnreadNotifs(true);
            if (myProfile.notificationsEnabled) {
               setNewNotificationToast({ id: change.doc.id, ...data, isMessage: false });
               setTimeout(() => setNewNotificationToast(null), 6000);
            }
          }
        }
      });
    });

    const qChats = query(collection(db, 'chats'));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === currentUser.uid && data.timestamp > sessionStart.current && !notifiedIds.current.has(change.doc.id)) {
            notifiedIds.current.add(change.doc.id);
            if (!activeChatUser || activeChatUser.id !== data.from) {
               if (view !== 'messages' && view !== 'chat') setHasUnreadMessages(true);
               if (myProfile.notificationsEnabled) {
                 setNewNotificationToast({ id: change.doc.id, ...data, isMessage: true });
                 setTimeout(() => setNewNotificationToast(null), 6000);
               }
            }
          }
        }
      });
    });

    return () => { unsubMatches(); unsubChats(); };
  }, [currentUser, activeChatUser, myProfile.notificationsEnabled, view]);

  // --- CARGAR LISTA DE CHATS ---
  useEffect(() => {
    if ((view === 'messages' || view === 'discover') && currentUser) {
      const fetchChats = async () => {
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const chatList = [];
        matchesSnap.forEach(d => {
          const data = d.data();
          if (data.from === currentUser.uid) chatList.push({ id: data.to, name: data.toName });
          if (data.to === currentUser.uid) chatList.push({ id: data.from, name: data.fromName });
        });
        const uniqueChats = Array.from(new Map(chatList.map(item => [item.id, item])).values());
        setActiveChats(uniqueChats);
      };
      fetchChats();
    }
  }, [view, currentUser, notifications]);

  // --- CARGAR PISTA (FILTRANDO CHATS ACTIVOS) ---
  useEffect(() => {
    if (view === 'discover' && currentUser) {
      const fetchDiscover = async () => {
        try {
          const matchedIds = new Set(activeChats.map(c => c.id));
          const usersSnap = await getDocs(collection(db, 'usuarios'));
          const list = [];
          usersSnap.forEach(d => { 
            if (d.id !== currentUser.uid && d.data().name && !matchedIds.has(d.id)) {
              list.push({ id: d.id, ...d.data() }); 
            }
          });
          setProfiles(list.length > 0 ? list : PERFILES_MOCK);
        } catch (e) { console.error(e); }
      };
      fetchDiscover();
    }
  }, [view, currentUser, activeChats]);

  // --- CHAT ACTIVO ---
  useEffect(() => {
    if (!currentUser || !activeChatUser) return;
    const q = query(collection(db, 'chats'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if ((d.from === currentUser.uid && d.to === activeChatUser.id) || (d.from === activeChatUser.id && d.to === currentUser.uid)) {
          msgs.push({ id: doc.id, ...d });
        }
      });
      setChatMessages(msgs);
    });
    return () => unsubscribe();
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
        await setDoc(doc(db, 'usuarios', res.user.uid), { 
          email: authForm.email, 
          fechaRegistro: new Date().toISOString(), 
          notificationsEnabled: true 
        });
        setView('register');
      }
    } catch (error) {
      setAuthError('Error: Revisa tus datos.');
    } finally { setIsAuthLoading(false); }
  };

  const saveProfileData = async () => {
    if (!currentUser) return false;
    
    // VALIDACIÓN CAMPOS OBLIGATORIOS
    if (!myProfile.name || !myProfile.photo || !myProfile.phrase || !myProfile.lookingFor || myProfile.interests.length === 0) {
      setPhotoError('Nombre, Foto, Frase, Busco e Intereses son OBLIGATORIOS.');
      return false;
    }

    setIsSavingProfile(true);
    setPhotoError('');
    try {
      await setDoc(doc(db, 'usuarios', currentUser.uid), { ...myProfile }, { merge: true });
      setSaveMessage('¡Guardado!');
      setTimeout(() => setSaveMessage(''), 2000);
      return true;
    } catch (e) { setPhotoError('Error al guardar.'); return false; }
    finally { setIsSavingProfile(false); }
  };

  const handleGoToPista = async () => {
    const success = await saveProfileData();
    if (success) setView('discover');
  };

  const deleteConversation = async (otherUserId) => {
    const q = query(collection(db, 'matches'));
    const snap = await getDocs(q);
    snap.forEach(async (document) => {
      const d = document.data();
      if ((d.from === currentUser.uid && d.to === otherUserId) || (d.to === currentUser.uid && d.from === otherUserId)) {
        await deleteDoc(doc(db, 'matches', document.id));
      }
    });
    setActiveChatUser(null);
    setView('messages');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true });
    setView('welcome');
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'usuarios', currentUser.uid));
      await deleteUser(auth.currentUser);
      handleLogout();
    } catch (e) { setAuthError('Cierre sesión y vuelva a entrar para borrar su cuenta.'); }
  };

  const handleMatchAction = async (type) => {
    if (showMatchAnimation) return;
    const target = profiles[currentIndex];
    setShowMatchAnimation(type);
    if (currentUser && target && !target.id.startsWith('m')) {
      await addDoc(collection(db, 'matches'), { 
        from: currentUser.uid, 
        fromName: myProfile.name, 
        to: target.id, 
        toName: target.name, 
        type: type, 
        timestamp: new Date().toISOString() 
      });
    }
    setTimeout(() => { setShowMatchAnimation(null); setCurrentIndex(prev => (prev + 1) % (profiles.length || 1)); }, 1500);
  };

  if (isInitializing) return <div className="min-h-screen bg-stone-900 flex items-center justify-center"><Crown className="w-16 h-16 text-rose-500 animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden selection:bg-rose-500/20">
      
      {/* TOAST DE NOTIFICACIÓN */}
      {newNotificationToast && (
        <div 
          onClick={() => {
            setActiveChatUser({ id: newNotificationToast.from, name: newNotificationToast.fromName });
            setView('chat');
            setNewNotificationToast(null);
          }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-[340px] px-4 animate-in slide-in-from-top cursor-pointer active:scale-95"
        >
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
              {newNotificationToast.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Aviso VIP</p>
              <p className="text-xs font-bold leading-tight"><b>{newNotificationToast.fromName}</b> {newNotificationToast.isMessage ? 'te escribió' : 'te saludó'}</p>
            </div>
          </div>
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
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter uppercase">LigaRey</h1>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl">Crear cuenta</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold uppercase tracking-widest text-xs">Entrar</button>
              </div>
            </div>
          )}

          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50 animate-in slide-in-from-right">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 uppercase tracking-tighter">{authMode === 'login' ? 'Hola!' : 'Registro'}</h2>
              {authError && <p className="text-red-500 text-xs font-bold mb-4">{authError}</p>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
                <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg">{isAuthLoading ? '...' : (authMode === 'login' ? 'ENTRAR' : 'REGISTRARSE')}</button>
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
                    {photoError && <p className="text-red-500 text-[10px] font-bold mt-2 text-center">{photoError}</p>}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-400 ml-2 mb-1">Nombre</p>
                      <input type="text" placeholder="Tu nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none shadow-sm" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-400 ml-2 mb-1">Frase favorita</p>
                      <input type="text" placeholder="Ej: Viviendo a tope!" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none shadow-sm italic" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-400 ml-2 mb-1">Estoy buscando:</p>
                      <textarea placeholder="Ej: Alguien para ver a..." value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none h-20 shadow-sm" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-stone-400" /><p className="text-xs font-black uppercase text-stone-800">Notificaciones</p></div>
                    <button onClick={() => setMyProfile({...myProfile, notificationsEnabled: !myProfile.notificationsEnabled})} className={`w-10 h-5 rounded-full relative transition-colors ${myProfile.notificationsEnabled ? 'bg-rose-500' : 'bg-stone-300'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${myProfile.notificationsEnabled ? 'left-5.5' : 'left-0.5'}`} /></button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 10).map(int => (
                      <button key={int} onClick={() => {
                        const list = myProfile.interests.includes(int) ? myProfile.interests.filter(i => i !== int) : [...myProfile.interests, int].slice(0, 5);
                        setMyProfile({...myProfile, interests: list});
                      }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>

                  <div className="pt-6 space-y-3">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs">{saveMessage}</p>}
                    <button onClick={saveProfileData} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Guardar Cambios</button>
                    <button onClick={handleLogout} className="w-full text-stone-400 font-black text-[10px] uppercase py-2">Cerrar Sesión</button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-red-500 font-black text-[10px] uppercase py-2">Eliminar Cuenta</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200 animate-in fade-in">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                    <h2 className="text-3xl font-black tracking-tighter leading-none mb-1">{myProfile.name || 'Sin nombre'}</h2>
                    <p className="text-rose-300 font-bold mb-1 italic">"{myProfile.phrase || 'Tu frase favorita'}"</p>
                    <p className="text-stone-300 text-[10px] font-bold mb-3 uppercase tracking-widest">Busco: {myProfile.lookingFor || '...'}</p>
                    <div className="flex flex-wrap gap-2">{(myProfile.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={handleGoToPista} disabled={isSavingProfile} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl uppercase h-16 active:scale-95 transition-all">¡A LA PISTA!</button>
            </div>
          )}

          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative animate-in fade-in">
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md">
                  <div className="text-center animate-in zoom-in">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4 border-4 border-stone-50">{showMatchAnimation === 'beer' ? <Beer className="text-amber-500 fill-current w-10 h-10" /> : <Hand className="text-green-500 fill-current w-10 h-10" />}</div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">¡Enviado!</h2>
                  </div>
                </div>
              )}
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200">
                {profiles[currentIndex] ? (
                  <>
                    <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 p-6 text-white w-full">
                      <h2 className="text-4xl font-black tracking-tighter leading-none mb-1">{profiles[currentIndex]?.name}</h2>
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
                <button onClick={() => handleMatchAction('beer')} className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-amber-500"><Beer className="w-8 h-8 fill-current" /></button>
                <button onClick={() => setCurrentIndex(prev => (prev + 1) % (profiles.length || 1))} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90 hover:bg-red-50 transition-all"><X className="w-7 h-7" /></button>
                <button onClick={() => handleMatchAction('hand')} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-green-600"><Hand className="w-8 h-8 fill-current" /></button>
              </div>
            </div>
          )}

          {/* CHATS LIST VIEW */}
          {view === 'messages' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter">Tus Chats</h2>
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setActiveChatUser(chat); setView('chat'); }} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-black text-xl border-2 border-white shadow-sm">{chat.name[0]}</div>
                    <div className="flex-1"><p className="text-lg font-bold text-stone-800 tracking-tight">{chat.name}</p><p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Toca para hablar</p></div>
                  </div>
                ))}
                {activeChats.length === 0 && <div className="mt-20 text-center opacity-30"><MessageCircle className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Sin chats activos</p></div>}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS VIEW */}
          {view === 'notifications' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Actividad</h2>
                <button onClick={() => { setNotifications([]); setHasUnreadNotifs(false); }} className="p-2 text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-1">
                  <Eraser className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Limpiar</span>
                </button>
              </div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} onClick={() => { setActiveChatUser({ id: notif.from, name: notif.fromName }); setView('chat'); }} className="bg-stone-900 text-white p-4 rounded-3xl shadow-lg flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
                      {notif.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
                    </div>
                    <div className="flex-1"><p className="text-xs font-bold leading-tight"><b>{notif.fromName}</b> {notif.isMessage ? 'escribió...' : `te mandó un ${notif.type}`}</p></div>
                  </div>
                ))}
                {notifications.length === 0 && <div className="mt-20 text-center opacity-30"><Bell className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Historial vacío</p></div>}
              </div>
            </div>
          )}

          {/* CHAT VIEW */}
          {view === 'chat' && activeChatUser && (
            <div className="h-full flex flex-col bg-stone-50 animate-in slide-in-from-right duration-300">
              <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('messages')} className="active:scale-90"><ChevronLeft className="w-8 h-8 text-stone-400" /></button>
                  <h3 className="font-black text-stone-800 uppercase tracking-tighter">{activeChatUser.name}</h3>
                </div>
                <button onClick={() => deleteConversation(activeChatUser.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/50">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-3xl max-w-[80%] text-sm font-medium shadow-sm ${m.from === currentUser.uid ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-stone-700 rounded-tl-none border border-stone-100'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newMessageText.trim()) return;
                addDoc(collection(db, 'chats'), { from: currentUser.uid, fromName: myProfile.name, to: activeChatUser.id, text: newMessageText, timestamp: new Date().toISOString() });
                setNewMessageText('');
              }} className="p-4 bg-white border-t flex gap-2">
                <input value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Mensaje..." className="flex-1 bg-stone-100 rounded-full px-6 py-3 outline-none" />
                <button type="submit" className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"><Send className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR REESTRUCTURADA */}
        {['discover', 'register', 'messages', 'notifications'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}>
              <MessageCircle className="w-7 h-7" />
              {hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
            </button>
            <button onClick={() => setView('notifications')} className={`p-2 relative transition-all ${view === 'notifications' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}>
              <Bell className="w-7 h-7" />
              {hasUnreadNotifs && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}
            </button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODALES QR Y ELIMINACIÓN */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8" /></div>
              <h3 className="text-2xl font-black text-stone-800 mb-2 uppercase">¿Seguro?</h3>
              <p className="text-stone-500 mb-8 text-sm italic">Tus datos se borrarán para siempre.</p>
              <div className="space-y-3">
                <button onClick={handleDeleteAccount} className="w-full py-4 rounded-full bg-red-500 text-white font-bold text-lg shadow-xl active:scale-95 transition-all">SÍ, BORRAR TODO</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 rounded-full bg-stone-100 text-stone-800 font-bold text-lg active:scale-95 transition-all">ANNULLA</button>
              </div>
            </div>
          </div>
        )}

        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase font-black">Descuento Rey</h3>
              <div className="bg-stone-100 p-4 rounded-3xl inline-block mb-4 shadow-inner border border-stone-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${currentUser?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply" />
              </div>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest opacity-60">Barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}