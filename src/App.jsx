import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell, BellOff, Settings, Eraser
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
  browserLocalPersistence 
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
  { id: 'm1', name: 'Lucía (Ejemplo)', age: 24, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', phrase: 'Viviendo el momento, un concierto a la vez. ✨', interests: ['Rock', 'Cerveza fría'] }
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

  const [myProfile, setMyProfile] = useState({ 
    name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true 
  });
  
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 

  const [profiles, setProfiles] = useState(PERFILES_MOCK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchAnimation, setShowMatchAnimation] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [profileMode, setProfileMode] = useState('edit');

  // --- ESTADOS DE MENSAJERÍA Y NOTIFICACIONES ---
  const [notifications, setNotifications] = useState([]);
  const [activeChats, setActiveChats] = useState([]); // Lista de personas con las que tengo chat
  const [newNotificationToast, setNewNotificationToast] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, view]);

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
            if (data.name && (view === 'welcome' || view === 'auth')) setView('discover');
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

    // 1. Escuchar Matches (Propuestas)
    const qMatches = query(collection(db, 'matches'));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === currentUser.uid) {
            const notif = { id: change.doc.id, ...data, isMessage: false };
            setNotifications(prev => [notif, ...prev]);
            if (view !== 'notifications') setHasUnreadNotifs(true);

            if (myProfile.notificationsEnabled) {
              setNewNotificationToast(notif);
              setTimeout(() => setNewNotificationToast(null), 6000);
            }
          }
        }
      });
    });

    // 2. Escuchar Mensajes
    const qChats = query(collection(db, 'chats'));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === currentUser.uid) {
            if (!activeChatUser || activeChatUser.id !== data.from) {
              if (view !== 'messages' && view !== 'chat') setHasUnreadMessages(true);
              
              if (myProfile.notificationsEnabled) {
                const notif = { id: change.doc.id, ...data, isMessage: true };
                setNewNotificationToast(notif);
                setTimeout(() => setNewNotificationToast(null), 6000);
              }
            }
          }
        }
      });
    });

    return () => { unsubMatches(); unsubChats(); };
  }, [currentUser, activeChatUser, myProfile.notificationsEnabled, view]);

  // --- CARGAR LISTA DE CHATS ACTIVOS ---
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
        // Eliminar duplicados
        const uniqueChats = Array.from(new Map(chatList.map(item => [item.id, item])).values());
        setActiveChats(uniqueChats);
      };
      fetchChats();
    }
  }, [view, currentUser, notifications]);

  // --- CHAT ACTIVO ---
  useEffect(() => {
    if (!currentUser || !activeChatUser) return;
    const q = query(collection(db, 'chats'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if ((d.from === currentUser.uid && d.to === activeChatUser.id) || 
            (d.from === activeChatUser.id && d.to === currentUser.uid)) {
          msgs.push({ id: doc.id, ...d });
        }
      });
      setChatMessages(msgs);
    });
    return () => unsubscribe();
  }, [currentUser, activeChatUser]);

  // --- CARGAR PISTA (DISCOVER) ---
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

  // --- FUNCIONES ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      else {
        const res = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'usuarios', res.user.uid), { email: authForm.email, fechaRegistro: new Date().toISOString(), notificationsEnabled: true });
        setView('register');
      }
    } catch (error) { setAuthError('Error de acceso.'); }
    finally { setIsAuthLoading(false); }
  };

  const toggleInterestLocal = (int) => {
    setMyProfile(prev => {
      const current = prev.interests || [];
      const newList = current.includes(int) ? current.filter(i => i !== int) : [...current, int].slice(0, 5);
      return { ...prev, interests: newList };
    });
  };

  const saveProfileData = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    try {
      await setDoc(doc(db, 'usuarios', currentUser.uid), { ...myProfile }, { merge: true });
      setSaveMessage('¡Datos actualizados!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (e) { setPhotoError('Error al guardar.'); }
    finally { setIsSavingProfile(false); }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setHasUnreadNotifs(false);
  };

  const deleteConversation = async (otherUserId) => {
    const q = query(collection(db, 'matches'));
    const snap = await getDocs(q);
    const deletePromises = [];
    snap.forEach((document) => {
      const d = document.data();
      if ((d.from === currentUser.uid && d.to === otherUserId) || (d.to === currentUser.uid && d.from === otherUserId)) {
        deletePromises.push(deleteDoc(doc(db, 'matches', document.id)));
      }
    });
    await Promise.all(deletePromises);
    setActiveChatUser(null);
    setView('messages');
  };

  const handleMatchAction = async (type) => {
    if (showMatchAnimation) return;
    const target = profiles[currentIndex];
    setShowMatchAnimation(type);
    if (currentUser && target && !target.id.startsWith('m')) {
      await addDoc(collection(db, 'matches'), { from: currentUser.uid, fromName: myProfile.name, to: target.id, toName: target.name, type: type, timestamp: new Date().toISOString() });
    }
    setTimeout(() => { setShowMatchAnimation(null); setCurrentIndex(prev => (prev + 1) % (profiles.length || 1)); }, 1500);
  };

  if (isInitializing) return <div className="min-h-screen bg-stone-900 flex items-center justify-center"><Crown className="w-16 h-16 text-rose-500 animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      
      {/* TOAST FLOTANTE */}
      {newNotificationToast && (
        <div 
          onClick={() => {
            setActiveChatUser({ id: newNotificationToast.from, name: newNotificationToast.fromName });
            setView('chat');
            setNewNotificationToast(null);
          }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-[340px] px-4 animate-in slide-in-from-top cursor-pointer active:scale-95 transition-transform"
        >
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.isMessage ? 'bg-rose-500' : (newNotificationToast.type === 'beer' ? 'bg-amber-500' : 'bg-green-500')}`}>
              {newNotificationToast.isMessage ? <MessageCircle className="w-5 h-5" /> : (newNotificationToast.type === 'beer' ? <Beer className="w-5 h-5" /> : <Hand className="w-5 h-5" />)}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">{newNotificationToast.isMessage ? 'Nuevo Mensaje' : 'Propuesta'}</p>
              <p className="text-xs font-bold leading-tight truncate"><b>{newNotificationToast.fromName}</b>: {newNotificationToast.isMessage ? newNotificationToast.text : `¡Te ha saludado!`}</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* CABECERA (Se oculta en el chat para ganar espacio) */}
        {view !== 'welcome' && view !== 'auth' && view !== 'chat' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500 tracking-tighter uppercase">LigaRey</h1></div>
            <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> DESCUENTO REY</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          
          {/* VISTAS DE ENTRADA */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50 animate-in fade-in duration-500">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter leading-none">LigaRey</h1>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Empezar ahora</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold active:scale-95 transition-all">Entrar</button>
              </div>
            </div>
          )}

          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50 animate-in slide-in-from-right">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 tracking-tighter uppercase">{authMode === 'login' ? 'Hola!' : 'VIP'}</h2>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors" />
                <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors" />
                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg active:scale-95 transition-all">{isAuthLoading ? '...' : (authMode === 'login' ? 'ENTRAR' : 'REGISTRARSE')}</button>
              </form>
            </div>
          )}

          {/* LA PISTA (DISCOVER) */}
          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative animate-in fade-in duration-500">
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="text-center animate-in zoom-in">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4 border-4 border-stone-50">{showMatchAnimation === 'beer' ? <Beer className="text-amber-500 fill-current w-10 h-10" /> : <Hand className="text-green-500 fill-current w-10 h-10" />}</div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">¡Propuesta enviada!</h2>
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
                      <p className="text-rose-300 font-bold mb-4 italic leading-tight">"{profiles[currentIndex]?.phrase || '¡Vente conmigo!'}"</p>
                      <div className="flex flex-wrap gap-2">{(profiles[currentIndex]?.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 p-8 text-center font-bold italic">Ya conoces a todos por aquí. ¡Vuelve luego!</div>
                )}
              </div>
              <div className="flex justify-center items-center gap-4 py-6">
                <button onClick={() => handleMatchAction('beer')} className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg active:scale-90 hover:bg-amber-500 transition-all"><Beer className="w-8 h-8 fill-current" /></button>
                <button onClick={() => setCurrentIndex(prev => (prev + 1) % (profiles.length || 1))} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90 hover:bg-red-50 transition-all"><X className="w-7 h-7" /></button>
                <button onClick={() => handleMatchAction('hand')} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-90 hover:bg-green-600 transition-all"><Hand className="w-8 h-8 fill-current" /></button>
              </div>
            </div>
          )}

          {/* LISTA DE CHATS */}
          {view === 'messages' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter leading-none">Tus Chats</h2>
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <div 
                    key={chat.id} 
                    onClick={() => { setActiveChatUser(chat); setView('chat'); }}
                    className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-black text-xl border-2 border-white shadow-sm">{chat.name[0]}</div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-stone-800 tracking-tight">{chat.name}</p>
                      <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Toca para hablar</p>
                    </div>
                  </div>
                ))}
                {activeChats.length === 0 && (
                  <div className="mt-20 text-center opacity-30 px-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Ve a la pista para empezar a hablar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICACIONES (SECCIÓN NUEVA E INDEPENDIENTE) */}
          {view === 'notifications' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Actividad</h2>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="p-2 text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-1">
                    <Eraser className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Limpiar</span>
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => { setActiveChatUser({ id: notif.from, name: notif.fromName }); setView('chat'); }}
                    className="bg-stone-900 text-white p-4 rounded-3xl shadow-lg flex items-center gap-4 cursor-pointer active:scale-95 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isMessage ? 'bg-rose-500' : (notif.type === 'beer' ? 'bg-amber-500' : 'bg-green-500')}`}>
                      {notif.isMessage ? <MessageCircle className="w-5 h-5" /> : (notif.type === 'beer' ? <Beer className="w-5 h-5" /> : <Hand className="w-5 h-5" />)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold leading-tight"><b>{notif.fromName}</b> {notif.isMessage ? 'escribió...' : `te mandó un ${notif.type === 'beer' ? 'brindis' : 'saludo'}`}</p>
                      <p className="text-[8px] text-white/40 font-black uppercase tracking-widest mt-1">Hacer clic para ver</p>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="mt-20 text-center opacity-30">
                    <Bell className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nada nuevo por ahora</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA DE CHAT */}
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
                <input value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 bg-stone-100 rounded-full px-6 py-3 outline-none" />
                <button type="submit" className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"><Send className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {/* PERFIL / CONFIGURACIÓN */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50 animate-in fade-in">
              <h2 className="text-2xl font-black text-center mb-6 uppercase tracking-tighter">Mi Cuenta</h2>
              
              <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 shadow-inner">
                <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>DATOS</button>
                <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>PREVIA</button>
              </div>

              {profileMode === 'edit' ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-rose-400 transition-all">
                      {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                      const reader = new FileReader();
                      reader.onloadend = () => setMyProfile({...myProfile, photo: reader.result});
                      reader.readAsDataURL(e.target.files[0]);
                    }} className="hidden" />
                  </div>
                  
                  <input type="text" placeholder="Nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none shadow-sm" />
                  
                  <div className="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${myProfile.notificationsEnabled ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                          {myProfile.notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                        </div>
                        <p className="text-xs font-black uppercase text-stone-800">Avisos VIP</p>
                      </div>
                      <button onClick={() => setMyProfile({...myProfile, notificationsEnabled: !myProfile.notificationsEnabled})} className={`w-10 h-5 rounded-full relative transition-colors ${myProfile.notificationsEnabled ? 'bg-rose-500' : 'bg-stone-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${myProfile.notificationsEnabled ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 10).map(int => (
                      <button key={int} onClick={() => toggleInterestLocal(int)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>

                  <div className="pt-6 space-y-4">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs">{saveMessage}</p>}
                    <button onClick={saveProfileData} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-lg">Guardar Cambios</button>
                    <button onClick={() => signOut(auth).then(() => setView('welcome'))} className="w-full text-red-500 font-black text-[10px] uppercase tracking-[0.2em] py-2">Cerrar Sesión</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200 animate-in fade-in">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                    <h2 className="text-3xl font-black tracking-tighter">{myProfile.name || 'Sin nombre'}</h2>
                    <p className="text-rose-300 font-bold mb-3 italic">"{myProfile.phrase || '¡Hola!'}"</p>
                    <div className="flex flex-wrap gap-2">{(myProfile.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={() => setView('discover')} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl uppercase tracking-widest h-16 active:scale-95 transition-all">¡A LA PISTA!</button>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR REESTRUCTURADA */}
        {['discover', 'register', 'messages', 'notifications'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            {/* Llama - Discover */}
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            
            {/* Chat - Mensajes */}
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}>
              <MessageCircle className="w-7 h-7" />
              {hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
            </button>

            {/* Campana - Notificaciones de Actividad */}
            <button 
              onClick={() => { setView('notifications'); setHasUnreadNotifs(false); }} 
              className={`p-2 relative transition-all ${view === 'notifications' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}
            >
              <Bell className="w-7 h-7" />
              {hasUnreadNotifs && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            
            {/* Usuario - Ajustes/Perfil */}
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODAL QR */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center relative shadow-2xl">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase">Descuento Rey</h3>
              <div className="bg-stone-100 p-4 rounded-3xl inline-block mb-4 shadow-inner">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${currentUser?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply" />
              </div>
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest opacity-60">Muestra en barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}