import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell, BellOff, Settings, Eraser, UserX, RefreshCcw
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInAnonymously,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
  query
} from 'firebase/firestore';

// Protección anti-pantalla blanca para la configuración
let firebaseConfig = {
  apiKey: "AIzaSyCCPXwU33jrYr5nRVyTnQGWeCY_6W-FmXc",
  authDomain: "ligarey.firebaseapp.com",
  projectId: "ligarey",
  storageBucket: "ligarey.firebasestorage.app",
  messagingSenderId: "625102595981",
  appId: "1:625102595981:web:baf09f9cda0d1b3b19ffc4"
};

try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
  }
} catch (e) {
  console.error("Usando configuración de respaldo");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ligarey-oficial-v2';

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
  const [user, setUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [myProfile, setMyProfile] = useState({ 
    name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true 
  });
  
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profiles, setProfiles] = useState([]);
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

  // Referencias blindadas para evitar errores de renderizado
  const sessionStart = useRef(new Date().toISOString());
  const notifiedIds = useRef(new Set());
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null); 

  // Rutas de Firestore exactas
  const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios');
  const matchesCol = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
  const chatsCol = collection(db, 'artifacts', appId, 'public', 'data', 'chats');

  // Auto-scroll en el chat
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, view]);

  // --- ARRANQUE Y AUTENTICACIÓN ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) {
        console.error("No se pudo iniciar sesión con token", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMyProfile(prev => ({ ...prev, ...data }));
            
            // Bloqueo: Si faltan datos clave, obliga a registrar
            if (!data.name || !data.photo || !data.phrase || !data.lookingFor || !data.interests?.length) {
              setView('register');
            } else if (view === 'welcome' || view === 'auth') {
              setView('discover');
            }
          } else {
            setView('register');
          }
        } catch (e) { setView('register'); }
      } else {
        setView('welcome');
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LISTENERS EN TIEMPO REAL ---
  useEffect(() => {
    if (!user) return;

    const unsubMatches = onSnapshot(matchesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === user.uid) {
            setNotifications(prev => (prev.find(n => n.id === change.doc.id) ? prev : [{ id: change.doc.id, ...data, isMessage: false }, ...prev]));
            if (data.timestamp > sessionStart.current && !notifiedIds.current.has(change.doc.id)) {
              notifiedIds.current.add(change.doc.id);
              if (view !== 'notifications') setHasUnreadNotifs(true);
              if (myProfile.notificationsEnabled) {
                setNewNotificationToast({ id: change.doc.id, ...data, isMessage: false });
                setTimeout(() => setNewNotificationToast(null), 5000);
              }
            }
          }
        }
      });
    });

    const unsubChats = onSnapshot(chatsCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === user.uid && data.timestamp > sessionStart.current && !notifiedIds.current.has(change.doc.id)) {
            notifiedIds.current.add(change.doc.id);
            if (!activeChatUser || activeChatUser.id !== data.from) {
              if (view !== 'messages' && view !== 'chat') setHasUnreadMessages(true);
              if (myProfile.notificationsEnabled) {
                setNewNotificationToast({ id: change.doc.id, ...data, isMessage: true });
                setTimeout(() => setNewNotificationToast(null), 5000);
              }
            }
          }
        }
      });
    });

    return () => { unsubMatches(); unsubChats(); };
  }, [user, activeChatUser, myProfile.notificationsEnabled, view]);

  // --- CARGAR PISTA (DISCOVER) Y CHATS ---
  const fetchData = async () => {
    if (!user) return;
    try {
      const matchesSnap = await getDocs(matchesCol);
      const chatIds = [];
      matchesSnap.forEach(d => {
        const data = d.data();
        if (data.from === user.uid) chatIds.push({ id: data.to, name: data.toName });
        if (data.to === user.uid) chatIds.push({ id: data.from, name: data.fromName });
      });
      
      const uniqueIds = Array.from(new Map(chatIds.map(item => [item.id, item])).values());
      const enriched = await Promise.all(uniqueIds.map(async (c) => {
        const uDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', c.id));
        return uDoc.exists() ? { ...c, ...uDoc.data() } : c;
      }));
      setActiveChats(enriched);

      if (view === 'discover') {
        const usersSnap = await getDocs(usersCol);
        const matchedSet = new Set(uniqueIds.map(c => c.id));
        const list = [];
        usersSnap.forEach(d => { 
          // Solo carga perfiles reales que tengan nombre y foto
          if (d.id !== user.uid && d.data().name && d.data().photo) {
            list.push({ id: d.id, ...d.data(), isAlreadyMatched: matchedSet.has(d.id) }); 
          }
        });
        setProfiles(list.length > 0 ? list : PERFILES_MOCK);
      }
    } catch (e) { console.error("Error cargando datos:", e); }
  };

  useEffect(() => {
    if (user && (view === 'discover' || view === 'messages')) {
      fetchData();
    }
  }, [user, view]);

  // --- CHAT ACTIVO ---
  useEffect(() => {
    if (!user || !activeChatUser) return;
    const unsubChat = onSnapshot(chatsCol, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if ((d.from === user.uid && d.to === activeChatUser.id) || (d.from === activeChatUser.id && d.to === user.uid)) {
          msgs.push({ id: doc.id, ...d });
        }
      });
      // Ordenar por tiempo en memoria
      msgs.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
      setChatMessages(msgs);
    });
    return () => unsubChat();
  }, [user, activeChatUser]);

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
          email: authForm.email, fechaRegistro: new Date().toISOString(), notificationsEnabled: true 
        });
        setView('register');
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') setAuthError('Este email ya está en uso.');
      else if (error.code === 'auth/weak-password') setAuthError('Contraseña mínima 6 caracteres.');
      else setAuthError('Error: Revisa tus datos.');
    } finally { setIsAuthLoading(false); }
  };

  const saveProfileData = async () => {
    if (!user) return false;
    
    // Validación estricta para no dejar pasar perfiles incompletos
    if (!myProfile.name?.trim()) { setPhotoError('El nombre es obligatorio.'); return false; }
    if (!myProfile.photo) { setPhotoError('Debes subir una foto de perfil.'); return false; }
    if (!myProfile.phrase?.trim()) { setPhotoError('Escribe tu frase favorita.'); return false; }
    if (!myProfile.lookingFor?.trim()) { setPhotoError('Dinos qué buscas en el festival.'); return false; }
    if (!myProfile.interests?.length) { setPhotoError('Elige al menos un interés.'); return false; }

    setIsSavingProfile(true);
    setPhotoError('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { ...myProfile }, { merge: true });
      setSaveMessage('¡Perfil guardado!');
      setTimeout(() => setSaveMessage(''), 2000);
      return true;
    } catch (e) { setPhotoError('Error al guardar. Prueba con una foto de menor tamaño.'); return false; }
    finally { setIsSavingProfile(false); }
  };

  const handleGoToPista = async () => {
    const ok = await saveProfileData();
    if (ok) setView('discover');
  };

  const deleteConversation = async (otherUserId) => {
    const snap = await getDocs(matchesCol);
    const delPromises = [];
    snap.forEach((document) => {
      const d = document.data();
      if ((d.from === user.uid && d.to === otherUserId) || (d.to === user.uid && d.from === otherUserId)) {
        delPromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'matches', document.id)));
      }
    });
    await Promise.all(delPromises);
    setActiveChatUser(null);
    setView('messages');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true });
    setView('welcome');
  };

  const handleMatchAction = async (type) => {
    if (showMatchAnimation) return;
    const target = profiles[currentIndex];
    if (!target) return;

    if (target.isAlreadyMatched && type !== 'dislike') {
        setActiveChatUser(target);
        setView('chat');
        return;
    }

    setShowMatchAnimation(type);
    if (type !== 'dislike' && user && !target.id.startsWith('m')) {
      await addDoc(matchesCol, { 
        from: user.uid, fromName: myProfile.name, to: target.id, toName: target.name, type: type, timestamp: new Date().toISOString() 
      });
    }
    setTimeout(() => { 
      setShowMatchAnimation(null); 
      setCurrentIndex(prev => (prev + 1) % (profiles.length || 1)); 
    }, type === 'dislike' ? 300 : 1500);
  };

  // PANTALLA DE CARGA INICIAL
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center gap-4">
        <Crown className="w-20 h-20 text-rose-500 animate-pulse" />
        <p className="text-stone-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Cargando LigaRey...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      
      {/* TOAST DE NOTIFICACIÓN FLOTANTE */}
      {newNotificationToast && (
        <div onClick={() => { setActiveChatUser({ id: newNotificationToast.from, name: newNotificationToast.fromName }); setView('chat'); setNewNotificationToast(null); }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-[340px] px-4 animate-in slide-in-from-top cursor-pointer">
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
              {newNotificationToast.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase text-rose-400">Aviso VIP</p>
              <p className="text-xs font-bold truncate"><b>{newNotificationToast.fromName}</b> {newNotificationToast.isMessage ? 'te escribió' : 'te saludó'}</p>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTOR VIP (Para ver perfiles desde el chat) */}
      {showInspector && (
        <div className="absolute inset-0 z-[500] bg-stone-900/95 backdrop-blur-xl animate-in slide-in-from-bottom flex flex-col p-6">
          <button onClick={() => setShowInspector(null)} className="self-end p-2 bg-white/10 rounded-full text-white mb-6"><X className="w-6 h-6" /></button>
          <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
            <img src={showInspector.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 p-8 text-white w-full">
              <h2 className="text-4xl font-black tracking-tighter mb-2 leading-none">{showInspector.name}</h2>
              <p className="text-rose-300 font-bold mb-2 italic">"{showInspector.phrase}"</p>
              <div className="bg-white/10 rounded-2xl p-4 mb-4"><p className="text-[10px] font-black uppercase mb-1 opacity-60">Estoy buscando:</p><p className="text-sm font-medium">{showInspector.lookingFor}</p></div>
              <div className="flex flex-wrap gap-2">{(showInspector.interests || []).map(i => <span key={i} className="px-3 py-1 bg-white/20 rounded-full text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
            </div>
          </div>
          <button onClick={() => setShowInspector(null)} className="w-full py-5 mt-6 rounded-full bg-rose-500 text-white font-black uppercase tracking-widest active:scale-95 transition-all">Cerrar Ficha</button>
        </div>
      )}

      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* CABECERA */}
        {view !== 'welcome' && view !== 'auth' && view !== 'chat' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500 tracking-tighter uppercase leading-none">LigaRey</h1></div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-2 text-stone-400 hover:text-rose-500 transition-colors active:rotate-180"><RefreshCcw className="w-4 h-4" /></button>
              <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> DESCUENTO REY</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          
          {/* WELCOME */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50 animate-in fade-in">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter leading-none">LigaRey</h1>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crear cuenta</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold uppercase tracking-widest text-xs active:scale-95 transition-all">Ya tengo cuenta</button>
              </div>
            </div>
          )}

          {/* AUTH */}
          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50 animate-in slide-in-from-right">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6 active:scale-90 transition-transform"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 tracking-tighter uppercase">{authMode === 'login' ? 'Bienvenido' : 'Nuevo VIP'}</h2>
              {authError && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {authError}</p>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors shadow-sm" />
                <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors shadow-sm" />
                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg active:scale-95 flex items-center justify-center transition-all">
                   {isAuthLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'ENTRAR' : 'REGISTRARSE')}
                </button>
              </form>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-stone-500 text-xs font-bold uppercase tracking-widest leading-none">{authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}</button>
            </div>
          )}

          {/* PERFIL */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <h2 className="text-2xl font-black text-center mb-2 uppercase tracking-tighter">Mi Perfil VIP</h2>
              <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 shadow-inner">
                <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`}>DATOS</button>
                <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`}>PREVIA</button>
              </div>
              
              {profileMode === 'edit' ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-stone-800 shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-rose-400 transition-colors">
                      {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                      const reader = new FileReader();
                      reader.onloadend = () => setMyProfile({...myProfile, photo: reader.result});
                      if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
                    }} className="hidden" />
                    {photoError && <p className="text-red-500 text-[10px] font-bold mt-2 text-center bg-red-50 p-2 rounded-lg border border-red-100">{photoError}</p>}
                  </div>
                  <input type="text" placeholder="Tu nombre (Obligatorio)" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm" />
                  <input type="text" placeholder="Frase favorita (Obligatorio)" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm italic" />
                  <textarea placeholder="ESTOY BUSCANDO: (Obligatorio)" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none h-20 focus:border-rose-400 shadow-sm" />
                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 10).map(int => (
                      <button key={int} onClick={() => {
                        const list = (myProfile.interests || []).includes(int) ? myProfile.interests.filter(i => i !== int) : [...(myProfile.interests || []), int].slice(0, 5);
                        setMyProfile({...myProfile, interests: list});
                      }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>
                  <div className="pt-6 space-y-3">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs">{saveMessage}</p>}
                    <button onClick={saveProfileData} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Guardar Cambios</button>
                    <button onClick={handleLogout} className="w-full text-stone-400 font-black text-[10px] uppercase py-2 active:opacity-50">Cerrar Sesión</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200 animate-in fade-in">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full"><h2 className="text-3xl font-black mb-1 leading-none">{myProfile.name || 'Sin nombre'}</h2><p className="text-rose-300 font-bold mb-1 italic leading-tight">"{myProfile.phrase}"</p><p className="text-white/60 text-[10px] uppercase font-black tracking-widest mb-3 leading-none">Busco: {myProfile.lookingFor}</p><div className="flex flex-wrap gap-2">{(myProfile.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[9px] uppercase font-bold">{i}</span>)}</div></div>
                </div>
              )}
              <button onClick={handleGoToPista} disabled={isSavingProfile} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl uppercase h-16 active:scale-95 transition-all">¡A LA PISTA!</button>
            </div>
          )}

          {/* DISCOVER */}
          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative animate-in fade-in">
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md">
                  <div className="text-center animate-in zoom-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4 border-4 border-stone-50">{showMatchAnimation === 'beer' && <Beer className="text-amber-500 fill-current w-12 h-12" />}{showMatchAnimation === 'hand' && <Hand className="text-green-500 fill-current w-12 h-12" />}{showMatchAnimation === 'dislike' && <X className="text-red-500 w-12 h-12" />}</div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{showMatchAnimation === 'dislike' ? 'PASADO' : 'ENVIADO'}</h2>
                  </div>
                </div>
              )}
              <div className={`flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border-4 transition-all duration-500 ${profiles[currentIndex]?.isAlreadyMatched ? 'border-emerald-500 shadow-emerald-500/20' : 'border-stone-200'}`}>
                {profiles[currentIndex] ? (
                  <>
                    <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                    {profiles[currentIndex]?.isAlreadyMatched && <div className="absolute top-6 right-6 z-10 bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase shadow-xl flex items-center gap-2"><Check className="w-3 h-3" /> YA EN CHAT</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 p-8 text-white w-full">
                      <div className="flex items-center gap-2 mb-1"><h2 className="text-4xl font-black tracking-tighter leading-none">{profiles[currentIndex]?.name}</h2>{profiles[currentIndex]?.isAlreadyMatched && <MessageCircle className="w-5 h-5 text-emerald-400" />}</div>
                      <p className="text-rose-300 font-bold mb-1 italic leading-tight">"{profiles[currentIndex]?.phrase}"</p>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-4 leading-none">Busco: {profiles[currentIndex]?.lookingFor}</p>
                      <div className="flex flex-wrap gap-2">{(profiles[currentIndex]?.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-stone-400 p-8 text-center gap-4 opacity-40">
                    <Sparkles className="w-12 h-12" />
                    <p className="font-bold italic">Buscando gente nueva...</p>
                    <button onClick={fetchData} className="text-rose-500 uppercase font-black text-xs border-b-2 border-rose-500 pb-1">Refrescar radar</button>
                  </div>
                )}
              </div>
              <div className="flex justify-center items-center gap-4 py-6">
                <button onClick={() => handleMatchAction('beer')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-amber-400'} text-white`}>{profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-8 h-8" /> : <Beer className="w-8 h-8 fill-current" />}</button>
                <button onClick={() => handleMatchAction('dislike')} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90 shadow-red-500/10"><X className="w-7 h-7" /></button>
                <button onClick={() => handleMatchAction('hand')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-green-500'} text-white`}>{profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-8 h-8" /> : <Hand className="w-8 h-8 fill-current" />}</button>
              </div>
            </div>
          )}

          {/* MENSAJES */}
          {view === 'messages' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter">Mis Chats</h2>
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setActiveChatUser(chat); setView('chat'); }} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <img src={chat.photo || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 shadow-sm" />
                    <div className="flex-1"><p className="text-lg font-bold text-stone-800 tracking-tight leading-none mb-1">{chat.name}</p><p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">Chat abierto</p></div>
                  </div>
                ))}
                {activeChats.length === 0 && <div className="mt-20 text-center opacity-30 px-8"><MessageCircle className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Aún no tienes chats</p></div>}
              </div>
            </div>
          )}

          {/* CHAT ACTIVO */}
          {view === 'chat' && activeChatUser && (
            <div className="h-full flex flex-col bg-stone-50 animate-in slide-in-from-right duration-300">
              <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('messages')} className="p-1 active:scale-90 transition-transform"><ChevronLeft className="w-7 h-7 text-stone-400" /></button>
                  <div onClick={() => setShowInspector(activeChatUser)} className="flex items-center gap-3 cursor-pointer active:opacity-60 transition-opacity">
                    <img src={activeChatUser.photo || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm border border-rose-100" />
                    <div><h3 className="font-black text-stone-800 uppercase leading-none">{activeChatUser.name}</h3><p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mt-1 leading-none">Ver ficha VIP</p></div>
                  </div>
                </div>
                <button onClick={() => deleteConversation(activeChatUser.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/50">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-3xl max-w-[80%] text-sm font-medium shadow-sm ${m.from === user.uid ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-stone-700 rounded-tl-none border border-stone-100'}`}>{m.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={(e) => {
                e.preventDefault(); if (!newMessageText.trim()) return;
                addDoc(chatsCol, { from: user.uid, fromName: myProfile.name, to: activeChatUser.id, text: newMessageText, timestamp: new Date().toISOString() });
                setNewMessageText('');
              }} className="p-4 bg-white border-t flex gap-2">
                <input value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Mensaje..." className="flex-1 bg-stone-100 rounded-full px-6 py-3 outline-none focus:bg-white border-transparent focus:border-rose-100 transition-all shadow-inner" />
                <button type="submit" className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"><Send className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {/* NOTIFICACIONES */}
          {view === 'notifications' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6"><h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Actividad</h2><button onClick={() => { setNotifications([]); setHasUnreadNotifs(false); }} className="p-2 text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-1"><Eraser className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Limpiar</span></button></div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} onClick={() => { setActiveChatUser({ id: notif.from, name: notif.fromName }); setView('chat'); }} className="bg-stone-900 text-white p-4 rounded-3xl shadow-lg flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>{notif.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}</div>
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
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><MessageCircle className="w-7 h-7" />{hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}</button>
            <button onClick={() => { setView('notifications'); setHasUnreadNotifs(false); }} className={`p-2 relative transition-all ${view === 'notifications' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Bell className="w-7 h-7" />{hasUnreadNotifs && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}</button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODAL ELIMINACIÓN */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8" /></div>
              <h3 className="text-2xl font-black text-stone-800 mb-2 uppercase leading-none">¿Eliminar cuenta?</h3>
              <p className="text-stone-500 mb-8 text-sm italic">Tu cuenta desaparecerá para siempre.</p>
              <div className="space-y-3"><button onClick={() => { deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid)); deleteUser(user); handleLogout(); }} className="w-full py-4 rounded-full bg-red-500 text-white font-bold text-lg active:scale-95 transition-all">SÍ, ELIMINAR</button><button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 rounded-full bg-stone-100 text-stone-800 font-bold text-lg active:scale-95 transition-all">CANCELAR</button></div>
            </div>
          </div>
        )}

        {/* MODAL QR */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800 transition-colors"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase font-black leading-none">Descuento Rey</h3>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${user?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply mx-auto mb-4" />
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest opacity-60 leading-none">Muestra en barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}