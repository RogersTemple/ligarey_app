import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell, BellOff, Settings, Eraser, UserX, RefreshCcw, Eye, EyeOff
} from 'lucide-react';

// --- CONFIGURAZIONE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
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

// Inizializzazione sicura con variabili d'ambiente
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyCCPXwU33jrYr5nRVyTnQGWeCY_6W-FmXc",
  authDomain: "ligarey.firebaseapp.com",
  projectId: "ligarey",
  storageBucket: "ligarey.firebasestorage.app",
  messagingSenderId: "625102595981",
  appId: "1:625102595981:web:baf09f9cda0d1b3b19ffc4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ligarey-v4';

// --- COSTANTI ---
const INTERESES_COMUNES = [
  "Rock", "Pop", "Indie", "Reggaetón", "Elettronica", "Trap", "Metal",
  "Birra ghiacciata", "Cocktail", "Vino", "Ballare", "Pogo", "Prima fila",
  "VIP", "Campeggio", "Post-concerto", "Fare foto", "Chiacchiere",
  "Conoscere gente", "Viaggiare", "Festival", "Tatuaggi", "Moda", "Sport"
];

const PERFILES_MOCK = [
  { id: 'm1', name: 'Lucia (Esempio)', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', phrase: 'Vivendo il momento ✨', lookingFor: 'Gente per il palco principale', interests: ['Rock', 'Birra ghiacciata'] },
  { id: 'm2', name: 'Carlo (Esempio)', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop', phrase: 'Rock & Roll nelle vene 🤘', lookingFor: 'Compagno di pogo', interests: ['Metal', 'Pogo'] }
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?w=400&h=400&fit=crop";

export default function App() {
  // Stati dell'App
  const [view, setView] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  
  // Stato per le caselle di controllo legali (Solo registrazione)
  const [registerTerms, setRegisterTerms] = useState({
    privacy: false,
    conduct: false,
    newsletter: false
  });

  const [user, setUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Profilo e Impostazioni
  const [myProfile, setMyProfile] = useState({ 
    name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true 
  });
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 
  const [showSettings, setShowSettings] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Stati di Discover e Messaggistica
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

  // Refs per controllo
  const sessionStart = useRef(new Date().toISOString());
  const notifiedIds = useRef(new Set());
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null); 

  // Percorsi di Firestore
  const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios');
  const matchesCol = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
  const chatsCol = collection(db, 'artifacts', appId, 'public', 'data', 'chats');

  // Auto-scroll nella chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, view]);

  // --- AVVIO E AUTENTICAZIONE ---
  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) { 
        console.error("Auth error silent fail"); 
      }
    };

    initApp();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMyProfile(prev => ({ ...prev, ...data }));
            
            // Blocco se il profilo è nuovo o incompleto
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
        setView('welcome');
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // --- LISTENER IN TEMPO REALE ---
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
    }, (err) => console.error("Snapshot error avoided"));

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
    }, (err) => console.error("Snapshot error avoided"));

    return () => { unsubMatches(); unsubChats(); };
  }, [user, activeChatUser, myProfile.notificationsEnabled, view]);

  // --- CARICAMENTO DATI (Discover e Chat) ---
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
          if (d.id !== user.uid && d.data().name) {
            list.push({ id: d.id, ...d.data(), isAlreadyMatched: matchedSet.has(d.id) }); 
          }
        });
        
        setProfiles(list.length > 0 ? list : PERFILES_MOCK);
      }
    } catch (e) { console.error("Fetch error avoided"); }
  };

  useEffect(() => {
    if (user && (view === 'discover' || view === 'messages')) {
      fetchData();
    }
  }, [user, view]);

  // --- CHAT ATTIVA ---
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
      msgs.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
      setChatMessages(msgs);
    });
    return () => unsubChat();
  }, [user, activeChatUser]);

  // --- FUNZIONI DI AUTH E PROFILO ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    // Validazione checkbox se è registrazione
    if (authMode === 'register') {
      if (!registerTerms.privacy || !registerTerms.conduct) {
        setAuthError('Devi accettare l\'informativa sulla privacy e le regole di condotta per registrarti.');
        return;
      }
    }

    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        // Salviamo anche le preferenze di registrazione
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', res.user.uid), { 
          email: authForm.email, 
          fechaRegistro: new Date().toISOString(), 
          notificationsEnabled: true,
          newsletterAccepted: registerTerms.newsletter
        });
        setView('register');
      }
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') setAuthError('Questa email è già in uso.');
      else if (error?.code === 'auth/weak-password') setAuthError('La password deve avere almeno 6 caratteri.');
      else setAuthError('Errore: Controlla i tuoi dati o se l\'email esiste.');
    } finally { setIsAuthLoading(false); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.85;
        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        while (compressedBase64.length > 800000 && quality > 0.3) {
          quality -= 0.1;
          compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        }

        setMyProfile({...myProfile, photo: compressedBase64});
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfileData = async () => {
    if (!user) return false;
    if (!myProfile.name?.trim()) { setPhotoError('Il nome è obbligatorio.'); return false; }
    if (!myProfile.photo) { setPhotoError('Devi caricare una foto del profilo.'); return false; }
    if (!myProfile.phrase?.trim()) { setPhotoError('Scrivi la tua frase preferita.'); return false; }
    if (!myProfile.lookingFor?.trim()) { setPhotoError('Dicci cosa cerchi nel festival.'); return false; }

    setIsSavingProfile(true);
    setPhotoError('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { ...myProfile }, { merge: true });
      setSaveMessage('Profilo salvato!');
      setTimeout(() => setSaveMessage(''), 2000);
      return true;
    } catch (e) { setPhotoError('Errore durante il salvataggio. Assicurati che la foto non sia gigante.'); return false; }
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
    fetchData();
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true });
    setShowSettings(false);
    setView('welcome');
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid));
      await deleteUser(auth.currentUser);
      handleLogout();
    } catch (e) { 
      setShowDeleteConfirm(false);
      setShowSettings(false);
      setPhotoError('Per sicurezza, esci e rientra per poter eliminare il tuo account.'); 
    }
  };

  const toggleNotifications = async () => {
    const newVal = !myProfile.notificationsEnabled;
    setMyProfile({...myProfile, notificationsEnabled: newVal});
    if (user) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { notificationsEnabled: newVal }, { merge: true });
    }
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

  // --- CARICAMENTO ---
  // Aggiornato con h-[100dvh] per adattarsi allo schermo del telefono
  if (isInitializing) return <div className="min-h-[100dvh] bg-stone-900 flex flex-col items-center justify-center gap-4"><Crown className="w-16 h-16 text-rose-500 animate-pulse" /><p className="text-stone-400 font-black text-[10px] tracking-[0.2em] animate-pulse">CARICAMENTO...</p></div>;

  return (
    <div className="min-h-[100dvh] bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      
      {/* TOAST FLUTTUANTE */}
      {newNotificationToast && (
        <div onClick={() => { setActiveChatUser({ id: newNotificationToast.from, name: newNotificationToast.fromName }); setView('chat'); setNewNotificationToast(null); }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-[340px] px-4 animate-in slide-in-from-top cursor-pointer">
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
              {newNotificationToast.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
            </div>
            <div className="flex-1"><p className="text-[9px] font-black uppercase text-rose-400">Avviso VIP</p><p className="text-xs font-bold truncate"><b>{newNotificationToast.fromName}</b> {newNotificationToast.isMessage ? 'ti ha scritto' : 'ti ha salutato'}</p></div>
          </div>
        </div>
      )}

      {/* ISPETTORE VIP */}
      {showInspector && (
        <div className="absolute inset-0 z-[500] bg-stone-900/95 backdrop-blur-xl animate-in slide-in-from-bottom flex flex-col p-6">
          <button onClick={() => setShowInspector(null)} className="self-end p-2 bg-white/10 rounded-full text-white mb-6"><X className="w-6 h-6" /></button>
          <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
            <img src={showInspector.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 p-8 text-white w-full">
              <h2 className="text-4xl font-black tracking-tighter mb-2 leading-none">{showInspector.name}</h2>
              <p className="text-rose-300 font-bold mb-2 italic">"{showInspector.phrase || 'Ciao!'}"</p>
              <div className="bg-white/10 rounded-2xl p-4 mb-4"><p className="text-[10px] font-black uppercase mb-1 opacity-60">Cerco:</p><p className="text-sm font-medium">{showInspector.lookingFor}</p></div>
              <div className="flex flex-wrap gap-2">{(showInspector.interests || []).map((i, idx) => <span key={idx} className="px-3 py-1 bg-white/20 rounded-full text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
            </div>
          </div>
          <button onClick={() => setShowInspector(null)} className="w-full py-5 mt-6 rounded-full bg-rose-500 text-white font-black uppercase tracking-widest">Chiudi Scheda</button>
        </div>
      )}

      {/* MODALE IMPOSTAZIONI E SICUREZZA */}
      {showSettings && (
        <div className="absolute inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full relative shadow-2xl animate-in zoom-in">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors"><X className="w-6 h-6" /></button>
            <h3 className="text-2xl font-black text-stone-800 mb-6 tracking-tighter uppercase font-black">Impostazioni VIP</h3>
            
            <div className="space-y-6">
              {/* Notifiche */}
              <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div>
                  <p className="font-bold text-stone-800 leading-none mb-1">Notifiche</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest">Avvisi e messaggi</p>
                </div>
                <button onClick={toggleNotifications} className={`w-12 h-6 rounded-full transition-colors relative ${myProfile.notificationsEnabled ? 'bg-rose-500' : 'bg-stone-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${myProfile.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>

              {/* Pulsanti di azione */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <button onClick={handleLogout} className="w-full py-3 rounded-full bg-stone-100 text-stone-800 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <LogOut className="w-4 h-4" /> Esci
                </button>
                <button onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }} className="w-full py-3 rounded-full bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-100">
                  <Trash2 className="w-4 h-4" /> Elimina il mio Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODIFICATO: h-[100dvh] per adattarsi alle barre del browser */}
      <div className="w-full max-w-md bg-white h-[100dvh] sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* INTESTAZIONE GENERALE */}
        {view !== 'welcome' && view !== 'auth' && view !== 'chat' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500 tracking-tighter uppercase leading-none">LigaRey</h1></div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-2 text-stone-400 hover:text-rose-500 transition-colors active:rotate-180"><RefreshCcw className="w-4 h-4" /></button>
              <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> SCONTO REY</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* BENVENUTO */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50 animate-in fade-in">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter leading-none">LigaRey</h1>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">L'app ufficiale del festival</p>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crea un account gratis</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold uppercase tracking-widest text-xs active:scale-95 transition-all">Ho già un account</button>
              </div>
            </div>
          )}

          {/* AUTENTICAZIONE */}
          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50 animate-in slide-in-from-right overflow-y-auto">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6 active:scale-90 transition-transform"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 tracking-tighter uppercase">{authMode === 'login' ? 'Ciao' : 'Registrati'}</h2>
              {authError && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {authError}</p>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors shadow-sm" />
                
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 pr-16 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors shadow-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 font-bold text-[10px] uppercase tracking-widest p-2">
                    {showPassword ? 'Nascondi' : 'Vedi'}
                  </button>
                </div>

                {/* CASELLE DI REGISTRAZIONE OBBLIGATORIE E OPZIONALI */}
                {authMode === 'register' && (
                  <div className="space-y-3 pt-2 pb-4 text-left">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={registerTerms.privacy} onChange={e => setRegisterTerms({...registerTerms, privacy: e.target.checked})} className="mt-1 w-4 h-4 accent-rose-500 shrink-0" />
                      <span className="text-[10px] text-stone-500 leading-tight">Ho letto e accetto l'Informativa sulla Privacy e il trattamento dei miei dati personali. <span className="text-rose-500 font-bold">*</span></span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={registerTerms.conduct} onChange={e => setRegisterTerms({...registerTerms, conduct: e.target.checked})} className="mt-1 w-4 h-4 accent-rose-500 shrink-0" />
                      <span className="text-[10px] text-stone-500 leading-tight">Mi impegno a conoscere persone con rispetto, educazione e buone vibrazioni. <span className="text-rose-500 font-bold">*</span></span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={registerTerms.newsletter} onChange={e => setRegisterTerms({...registerTerms, newsletter: e.target.checked})} className="mt-1 w-4 h-4 accent-rose-500 shrink-0" />
                      <span className="text-[10px] text-stone-500 leading-tight">Accetto di ricevere email informative su novità ed eventi futuri esclusivi.</span>
                    </label>
                  </div>
                )}

                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg active:scale-95 flex items-center justify-center transition-all mt-2">
                   {isAuthLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'ENTRA' : 'CREA ACCOUNT VIP')}
                </button>
              </form>
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="w-full mt-6 text-stone-500 text-xs font-bold uppercase tracking-widest leading-none">
                {authMode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Entra'}
              </button>
            </div>
          )}

          {/* PROFILO */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Il mio Profilo VIP</h2>
                <button onClick={() => setShowSettings(true)} className="p-2 bg-stone-200 rounded-full text-stone-600 hover:bg-stone-300 transition-colors active:scale-95 shadow-inner">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 shadow-inner shrink-0">
                <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`}>DATI</button>
                <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`}>ANTEPRIMA</button>
              </div>
              
              {profileMode === 'edit' ? (
                <div className="space-y-6">
                  {photoError && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{photoError}</p>}
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-stone-800 shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-rose-400 transition-colors">
                      {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  </div>
                  <input type="text" placeholder="Il tuo nome (Obbligatorio)" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm" />
                  <input type="text" placeholder="Frase preferita (Obbligatorio)" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm italic" />
                  <textarea placeholder="STO CERCANDO: (Obbligatorio)" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none h-20 focus:border-rose-400 shadow-sm" />
                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 10).map((int, idx) => (
                      <button key={idx} onClick={() => {
                        const list = (myProfile.interests || []).includes(int) ? myProfile.interests.filter(i => i !== int) : [...(myProfile.interests || []), int].slice(0, 5);
                        setMyProfile({...myProfile, interests: list});
                      }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>
                  <div className="pt-6">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs mb-3">{saveMessage}</p>}
                    <button onClick={saveProfileData} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Salva Modifiche</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200 animate-in fade-in">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full"><h2 className="text-3xl font-black mb-1 leading-none">{myProfile.name || 'Senza nome'}</h2><p className="text-rose-300 font-bold mb-1 italic leading-tight">"{myProfile.phrase}"</p><p className="text-white/60 text-[10px] uppercase font-black tracking-widest mb-3 leading-none">Cerco: {myProfile.lookingFor}</p><div className="flex flex-wrap gap-2">{(myProfile.interests || []).map((i, idx) => <span key={idx} className="px-2 py-1 bg-white/20 rounded text-[9px] uppercase font-bold tracking-widest">{i}</span>)}</div></div>
                </div>
              )}
              <button onClick={handleGoToPista} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl uppercase h-16 active:scale-95 transition-all shrink-0">ALLA PISTA!</button>
            </div>
          )}

          {/* DISCOVER (LA PISTA) - Ottimizzato con min-h-0 per evitare scroll */}
          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative animate-in fade-in">
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md">
                  <div className="text-center animate-in zoom-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4 border-4 border-stone-50">{showMatchAnimation === 'beer' && <Beer className="text-amber-500 fill-current w-12 h-12" />}{showMatchAnimation === 'hand' && <Hand className="text-green-500 fill-current w-12 h-12" />}{showMatchAnimation === 'dislike' && <X className="text-red-500 w-12 h-12" />}</div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{showMatchAnimation === 'dislike' ? 'SCARTATO' : 'INVIATO'}</h2>
                  </div>
                </div>
              )}
              
              {/* MODIFICATO: aggiunto min-h-0 per consentire a flex-1 di stringersi correttamente senza sforare il viewport */}
              <div className={`flex-1 min-h-0 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border-4 transition-all duration-500 ${profiles[currentIndex]?.isAlreadyMatched ? 'border-emerald-500 shadow-emerald-500/20' : 'border-stone-200'}`}>
                {profiles[currentIndex] ? (
                  <>
                    <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                    {profiles[currentIndex]?.isAlreadyMatched && (
                      <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white px-3 py-1.5 rounded-full font-black text-[10px] uppercase shadow-xl flex items-center gap-2">
                        <Check className="w-3 h-3" /> IN CHAT
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 p-6 text-white w-full">
                      <div className="flex items-center gap-2 mb-1"><h2 className="text-4xl font-black tracking-tighter leading-none">{profiles[currentIndex]?.name}</h2>{profiles[currentIndex]?.isAlreadyMatched && <MessageCircle className="w-5 h-5 text-emerald-400" />}</div>
                      <p className="text-rose-300 font-bold mb-1 italic leading-tight">"{profiles[currentIndex]?.phrase}"</p>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2 leading-none">Cerco: {profiles[currentIndex]?.lookingFor}</p>
                      <div className="flex flex-wrap gap-2">{(profiles[currentIndex]?.interests || []).map((i, idx) => <span key={idx} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-stone-400 p-8 text-center gap-4 opacity-40">
                    <Sparkles className="w-12 h-12" />
                    <p className="font-bold italic">Nessuno di nuovo in pista...</p>
                    <button onClick={fetchData} className="text-rose-500 uppercase font-black text-xs border-b-2 border-rose-500 pb-1">Aggiorna radar</button>
                  </div>
                )}
              </div>
              
              {/* MODIFICATO: padding ridotto per schermi piccoli e shrink-0 */}
              <div className="flex justify-center items-center gap-4 py-4 shrink-0">
                <button onClick={() => handleMatchAction('beer')} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-amber-400'} text-white`}>{profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" /> : <Beer className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />}</button>
                <button onClick={() => handleMatchAction('dislike')} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90 shadow-red-500/10"><X className="w-6 h-6 sm:w-7 sm:h-7" /></button>
                <button onClick={() => handleMatchAction('hand')} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-green-500'} text-white`}>{profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" /> : <Hand className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />}</button>
              </div>
            </div>
          )}

          {/* MESSAGGI */}
          {view === 'messages' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter">Le mie Chat</h2>
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setActiveChatUser(chat); setView('chat'); }} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <img src={chat.photo || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 shadow-sm" />
                    <div className="flex-1"><p className="text-lg font-bold text-stone-800 tracking-tight leading-none mb-1">{chat.name}</p><p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">Chat aperta</p></div>
                  </div>
                ))}
                {activeChats.length === 0 && <div className="mt-20 text-center opacity-30 px-8"><MessageCircle className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Non hai ancora chat</p></div>}
              </div>
            </div>
          )}

          {/* CHAT ATTIVA */}
          {view === 'chat' && activeChatUser && (
            <div className="h-full flex flex-col bg-stone-50 animate-in slide-in-from-right duration-300">
              <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('messages')} className="p-1 active:scale-90 transition-transform"><ChevronLeft className="w-7 h-7 text-stone-400" /></button>
                  <div onClick={() => setShowInspector(activeChatUser)} className="flex items-center gap-3 cursor-pointer active:opacity-60 transition-opacity">
                    <img src={activeChatUser.photo || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm border border-rose-100" />
                    <div><h3 className="font-black text-stone-800 uppercase leading-none">{activeChatUser.name}</h3><p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mt-1 leading-none">Vedi scheda VIP</p></div>
                  </div>
                </div>
                <button onClick={() => deleteConversation(activeChatUser.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/50 min-h-0">
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
              }} className="p-4 bg-white border-t flex gap-2 shrink-0">
                <input value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Scrivi..." className="flex-1 bg-stone-100 rounded-full px-6 py-3 outline-none focus:bg-white border-transparent focus:border-rose-100 transition-all shadow-inner" />
                <button type="submit" className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"><Send className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {/* NOTIFICHE */}
          {view === 'notifications' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6"><h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Attività</h2><button onClick={() => { setNotifications([]); setHasUnreadNotifs(false); }} className="p-2 text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-1"><Eraser className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Pulisci</span></button></div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} onClick={() => { setActiveChatUser({ id: notif.from, name: notif.fromName }); setView('chat'); }} className="bg-stone-900 text-white p-4 rounded-3xl shadow-lg flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>{notif.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}</div>
                    <div className="flex-1"><p className="text-xs font-bold leading-tight"><b>{notif.fromName}</b> {notif.isMessage ? 'ti ha scritto...' : `ti ha mandato un ${notif.type}`}</p></div>
                  </div>
                ))}
                {notifications.length === 0 && <div className="mt-20 text-center opacity-30"><Bell className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Cronologia vuota</p></div>}
              </div>
            </div>
          )}
        </div>

        {/* NAVIGAZIONE INFERIORE */}
        {['discover', 'register', 'messages', 'notifications'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><MessageCircle className="w-7 h-7" />{hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}</button>
            <button onClick={() => { setView('notifications'); setHasUnreadNotifs(false); }} className={`p-2 relative transition-all ${view === 'notifications' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Bell className="w-7 h-7" />{hasUnreadNotifs && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}</button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODALE ELIMINAZIONE ACCOUNT */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8" /></div>
              <h3 className="text-2xl font-black text-stone-800 mb-2 uppercase leading-none">Eliminare account?</h3>
              <p className="text-stone-500 mb-8 text-sm italic">Il tuo account scomparirà per sempre.</p>
              <div className="space-y-3">
                <button onClick={handleDeleteAccount} className="w-full py-4 rounded-full bg-red-500 text-white font-bold text-lg active:scale-95 transition-all">SÌ, ELIMINA</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 rounded-full bg-stone-100 text-stone-800 font-bold text-lg active:scale-95 transition-all">ANNULLA</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE QR SCONTO */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800 transition-colors"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase font-black leading-none">Sconto Rey</h3>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${user?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply mx-auto mb-4" />
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest opacity-60 leading-none">Mostra al bar principale</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}